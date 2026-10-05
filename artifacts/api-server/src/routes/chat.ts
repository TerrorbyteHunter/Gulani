import { Router, type IRouter } from "express";
import {
  CreateChatTicketBody,
  CreateChatTicketResponse,
  CreateConversationBody,
  CreateConversationResponse,
  GetChatTicketParams,
  GetChatTicketResponse,
  GetConversationParams,
  GetConversationResponse,
  ListChatTicketsQueryParams,
  ListChatTicketsResponse,
  ListConversationMessagesParams,
  ListConversationMessagesResponse,
  ListConversationsQueryParams,
  ListConversationsResponse,
  MarkConversationReadBody,
  MarkConversationReadParams,
  SendChatTicketMessageBody,
  SendChatTicketMessageParams,
  SendChatTicketMessageResponse,
  SendConversationMessageBody,
  SendConversationMessageParams,
  SendConversationMessageResponse,
  UpdateChatTicketBody,
  UpdateChatTicketParams,
  UpdateChatTicketResponse,
} from "@workspace/api-zod";
import { getChatActor, hasChatPermission, type ChatActor } from "../lib/chat-access";
import {
  ChatServiceError,
  createConversation,
  createTicket,
  getConversation,
  getTicket,
  listConversations,
  listMessages,
  listTickets,
  markRead,
  sendMessage,
  sendTicketMessage,
  updateTicket,
} from "../lib/chat-service";

const router: IRouter = Router();

function requireActor(req: Parameters<typeof getChatActor>[0], res: any): ChatActor | null {
  const actor = getChatActor(req);
  if (!actor) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return actor;
}

function respondError(res: any, error: unknown) {
  if (error instanceof ChatServiceError) return res.status(error.statusCode).json({ error: error.message });
  return res.status(500).json({ error: "Internal server error" });
}

function parseOrRespond<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, value: unknown, res: any): T | null {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return null;
  }
  return parsed.data;
}

function requirePermission(actor: ChatActor, permission: Parameters<typeof hasChatPermission>[1], res: any): boolean {
  if (!hasChatPermission(actor, permission)) {
    res.status(403).json({ error: `Missing permission: ${permission}` });
    return false;
  }
  return true;
}

router.get("/conversations", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor) return;
  const filters = parseOrRespond(ListConversationsQueryParams, req.query, res);
  if (!filters) return;
  try {
    return res.json(ListConversationsResponse.parse(await listConversations(actor, filters)));
  } catch (error) {
    return respondError(res, error);
  }
});

router.post("/conversations", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor || !requirePermission(actor, "chat.use", res)) return;
  const body = parseOrRespond(CreateConversationBody, req.body, res);
  if (!body) return;
  try {
    return res.status(201).json(CreateConversationResponse.parse(await createConversation(actor, body)));
  } catch (error) {
    return respondError(res, error);
  }
});

router.get("/conversations/:conversationId", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor) return;
  const params = parseOrRespond(GetConversationParams, req.params, res);
  if (!params) return;
  try {
    const conversation = await getConversation(actor, params.conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    return res.json(GetConversationResponse.parse(conversation));
  } catch (error) {
    return respondError(res, error);
  }
});

router.get("/conversations/:conversationId/messages", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor) return;
  const params = parseOrRespond(ListConversationMessagesParams, req.params, res);
  if (!params) return;
  try {
    return res.json(ListConversationMessagesResponse.parse(await listMessages(actor, params.conversationId)));
  } catch (error) {
    return respondError(res, error);
  }
});

router.post("/conversations/:conversationId/messages", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor || !requirePermission(actor, "chat.use", res)) return;
  const params = parseOrRespond(SendConversationMessageParams, req.params, res);
  const body = parseOrRespond(SendConversationMessageBody, req.body, res);
  if (!params || !body) return;
  try {
    return res.status(201).json(SendConversationMessageResponse.parse(await sendMessage(actor, params.conversationId, body)));
  } catch (error) {
    return respondError(res, error);
  }
});

router.post("/conversations/:conversationId/read", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor) return;
  const params = parseOrRespond(MarkConversationReadParams, req.params, res);
  const body = parseOrRespond(MarkConversationReadBody, req.body, res);
  if (!params || !body) return;
  try {
    await markRead(actor, params.conversationId, body.messageId);
    return res.status(204).send();
  } catch (error) {
    return respondError(res, error);
  }
});

router.get("/support/tickets", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor) return;
  if (["customer", "vendor"].includes(actor.role) && !hasChatPermission(actor, "chat.use")) {
    return res.status(403).json({ error: "Missing permission: chat.use" });
  }
  const filters = parseOrRespond(ListChatTicketsQueryParams, req.query, res);
  if (!filters) return;
  try {
    return res.json(ListChatTicketsResponse.parse(await listTickets(actor, filters)));
  } catch (error) {
    return respondError(res, error);
  }
});

router.post("/support/tickets", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor || !requirePermission(actor, "chat.use", res)) return;
  const body = parseOrRespond(CreateChatTicketBody, req.body, res);
  if (!body) return;
  try {
    return res.status(201).json(CreateChatTicketResponse.parse(await createTicket(actor, body)));
  } catch (error) {
    return respondError(res, error);
  }
});

router.get("/support/tickets/:ticketId", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor) return;
  const params = parseOrRespond(GetChatTicketParams, req.params, res);
  if (!params) return;
  try {
    const ticket = await getTicket(actor, params.ticketId);
    if (!ticket) return res.status(404).json({ error: "Support ticket not found" });
    return res.json(GetChatTicketResponse.parse(ticket));
  } catch (error) {
    return respondError(res, error);
  }
});

router.patch("/support/tickets/:ticketId", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor) return;
  const params = parseOrRespond(UpdateChatTicketParams, req.params, res);
  const body = parseOrRespond(UpdateChatTicketBody, req.body, res);
  if (!params || !body) return;
  try {
    return res.json(UpdateChatTicketResponse.parse(await updateTicket(actor, params.ticketId, body)));
  } catch (error) {
    return respondError(res, error);
  }
});

router.post("/support/tickets/:ticketId/messages", async (req, res) => {
  const actor = requireActor(req, res);
  if (!actor) return;
  const params = parseOrRespond(SendChatTicketMessageParams, req.params, res);
  const body = parseOrRespond(SendChatTicketMessageBody, req.body, res);
  if (!params || !body) return;
  try {
    return res.status(201).json(SendChatTicketMessageResponse.parse(await sendTicketMessage(actor, params.ticketId, body)));
  } catch (error) {
    return respondError(res, error);
  }
});

export default router;