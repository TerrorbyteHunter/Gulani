const baseUrl = (process.env.CHAT_SMOKE_BASE_URL || "http://localhost:80/api").replace(/\/+$/, "");
const suffix = Date.now().toString(36);
const customer = { "x-gulani-user-id": `smoke-customer-${suffix}`, "x-gulani-user-role": "customer" };
const vendor = {
  "x-gulani-user-id": `smoke-vendor-${suffix}`,
  "x-gulani-user-role": "vendor",
  "x-gulani-vendor-id": `smoke-vendor-${suffix}`,
};
const support = { "x-gulani-user-id": `smoke-support-${suffix}`, "x-gulani-user-role": "support" };

async function request(path, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const unauthenticated = await request("/conversations");
  assert(unauthenticated.status === 401, "unauthenticated conversation access must return 401");

  const conversationResponse = await request("/conversations", {
    method: "POST",
    headers: customer,
    body: { type: "buyer_vendor", vendorId: vendor["x-gulani-vendor-id"], contextType: "product", contextId: `product-${suffix}` },
  });
  assert(conversationResponse.status === 201, "customer should create a buyer/vendor conversation");
  const conversationId = conversationResponse.data.id;

  const idor = await request(`/conversations/${conversationId}`, {
    headers: { "x-gulani-user-id": `other-${suffix}`, "x-gulani-user-role": "customer" },
  });
  assert(idor.status === 404, "unrelated customers must not read a conversation");

  const messageBody = { body: "Is this still available?", clientMessageId: `message-${suffix}` };
  const firstMessage = await request(`/conversations/${conversationId}/messages`, { method: "POST", headers: customer, body: messageBody });
  const duplicateMessage = await request(`/conversations/${conversationId}/messages`, { method: "POST", headers: customer, body: messageBody });
  assert(firstMessage.status === 201 && duplicateMessage.status === 201, "customer message sends should succeed");
  assert(firstMessage.data.id === duplicateMessage.data.id, "duplicate client message IDs must be idempotent");

  const vendorMessages = await request(`/conversations/${conversationId}/messages`, { headers: vendor });
  assert(vendorMessages.status === 200 && vendorMessages.data.items.some((item) => item.id === firstMessage.data.id), "vendor should see buyer messages");

  const ticketResponse = await request("/support/tickets", {
    method: "POST",
    headers: customer,
    body: {
      category: "order",
      subject: `Smoke ticket ${suffix}`,
      message: "Please help with this order.",
      clientMessageId: `ticket-${suffix}`,
    },
  });
  assert(ticketResponse.status === 201 && ticketResponse.data.ticketNumber, "customer should create a support ticket");
  const ticketId = ticketResponse.data.id;
  const ticketConversationId = ticketResponse.data.conversationId;

  const customerResolve = await request(`/support/tickets/${ticketId}`, {
    method: "PATCH",
    headers: customer,
    body: { status: "resolved", resolutionCode: "answered", resolutionNote: "Not allowed" },
  });
  assert(customerResolve.status === 403, "requesters must not resolve their own ticket");

  const supportResolveMissingFields = await request(`/support/tickets/${ticketId}`, {
    method: "PATCH",
    headers: support,
    body: { status: "resolved" },
  });
  assert(supportResolveMissingFields.status === 400, "resolving requires a code and note");

  const internalNote = await request(`/conversations/${ticketConversationId}/messages`, {
    method: "POST",
    headers: support,
    body: { type: "internal_note", body: "Internal smoke note", clientMessageId: `note-${suffix}` },
  });
  assert(internalNote.status === 201, "support should be able to add an internal note");

  const customerTicketMessages = await request(`/conversations/${ticketConversationId}/messages`, { headers: customer });
  const supportTicketMessages = await request(`/conversations/${ticketConversationId}/messages`, { headers: support });
  assert(
    customerTicketMessages.status === 200 &&
      !customerTicketMessages.data.items.some((item) => item.id === internalNote.data.id),
    "customers must not see internal notes",
  );
  assert(
    supportTicketMessages.status === 200 &&
      supportTicketMessages.data.items.some((item) => item.id === internalNote.data.id),
    "support should see internal notes",
  );

  const supportResolve = await request(`/support/tickets/${ticketId}`, {
    method: "PATCH",
    headers: support,
    body: { status: "resolved", resolutionCode: "answered", resolutionNote: "Handled in smoke test" },
  });
  assert(supportResolve.status === 200 && supportResolve.data.status === "resolved", "support should resolve a ticket");

  const requesterReopen = await request(`/support/tickets/${ticketId}`, {
    method: "PATCH",
    headers: customer,
    body: { status: "open" },
  });
  assert(requesterReopen.status === 200 && requesterReopen.data.status === "open", "requesters should reopen resolved tickets");

  console.log(`Chat smoke checks passed against ${baseUrl}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});