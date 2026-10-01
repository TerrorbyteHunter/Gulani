import { randomUUID } from "node:crypto";
import type {
  ChatConversation,
  ChatMessage,
  ChatTicket,
  CreateChatTicket,
  CreateConversation,
  SendChatMessage,
  UpdateChatTicket,
} from "@workspace/api-zod";
import { hasChatPermission, isStaff, requesterTypeForActor, roleForChat, type ChatActor } from "./chat-access";

type ConversationRecord = ChatConversation & {
  participantIds: Set<string>;
  messageIds: string[];
};

type TicketRecord = ChatTicket & {
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  csatRating: number | null;
  csatComment: string | null;
};

export type TicketEvent = {
  id: string;
  ticketId: string;
  eventType: string;
  actorId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  note: string | null;
  createdAt: string;
};

const conversations = new Map<string, ConversationRecord>();
const messages = new Map<string, ChatMessage>();
const tickets = new Map<string, TicketRecord>();
const ticketEvents = new Map<string, TicketEvent[]>();
const idempotentMessages = new Map<string, ChatMessage>();
let ticketSequence = 123;

const now = () => new Date().toISOString();
const nullable = (value?: string) => value ?? null;

function addTicketEvent(
  ticketId: string,
  eventType: string,
  actorId: string | null,
  oldValue: Record<string, unknown> | null = null,
  newValue: Record<string, unknown> | null = null,
  note: string | null = null,
) {
  const event: TicketEvent = {
    id: randomUUID(),
    ticketId,
    eventType,
    actorId,
    oldValue,
    newValue,
    note,
    createdAt: now(),
  };
  ticketEvents.set(ticketId, [...(ticketEvents.get(ticketId) ?? []), event]);
}

function participant(conversation: ConversationRecord, userId: string) {
  return conversation.participants.find((entry) => entry.userId === userId);
}

function canAccessConversation(actor: ChatActor, conversation: ConversationRecord): boolean {
  if (actor.role === "master_admin" || actor.role === "system_admin") return true;
  if (conversation.participantIds.has(actor.id)) return true;
  if (isStaff(actor) && conversation.type !== "buyer_vendor") {
    return hasChatPermission(actor, "support.view_inbox");
  }
  return false;
}

function canAccessTicket(actor: ChatActor, ticket: TicketRecord): boolean {
  if (actor.role === "master_admin" || actor.role === "system_admin") return true;
  if (isStaff(actor)) return hasChatPermission(actor, "support.view_inbox");
  return ticket.requesterId === actor.id;
}

function createConversationRecord(
  actor: ChatActor,
  input: CreateConversation,
  ticketId?: string,
): ConversationRecord {
  const timestamp = now();
  const id = randomUUID();
  const isBuyerVendor = input.type === "buyer_vendor";
  const participants = [
    {
      userId: actor.id,
      roleInChat: roleForChat(actor),
      lastReadMessageId: null,
      muted: false,
    },
  ] as ChatConversation["participants"];

  if ((isBuyerVendor || input.type === "vendor_support") && input.vendorId && input.vendorId !== actor.id) {
    participants.push({
      userId: input.vendorId,
      roleInChat: "vendor",
      lastReadMessageId: null,
      muted: false,
    });
  }
  if (input.type === "customer_support" && isStaff(actor) && input.recipientId && input.recipientId !== actor.id) {
    participants.push({
      userId: input.recipientId,
      roleInChat: "customer",
      lastReadMessageId: null,
      muted: false,
    });
  }

  const record: ConversationRecord = {
    id,
    type: input.type,
    buyerId: actor.role === "customer" ? actor.id : input.type === "customer_support" ? input.recipientId ?? null : null,
    vendorId: input.vendorId ?? (actor.role === "vendor" ? actor.vendorId ?? actor.id : null),
    contextType: input.contextType,
    contextId: nullable(input.contextId),
    status: "active",
    lastMessageAt: null,
    lastMessagePreview: ticketId ? `Support ticket ${ticketId}` : null,
    unreadCount: 0,
    participants,
    createdAt: timestamp,
    updatedAt: timestamp,
    participantIds: new Set(participants.map((entry) => entry.userId)),
    messageIds: [],
  };
  conversations.set(id, record);
  return record;
}

function addMessage(
  actor: ChatActor | null,
  conversation: ConversationRecord,
  input: SendChatMessage,
  forced?: Partial<ChatMessage>,
): ChatMessage {
  const timestamp = now();
  const message: ChatMessage = {
    id: randomUUID(),
    conversationId: conversation.id,
    senderId: actor?.id ?? null,
    senderRole: forced?.senderRole ?? (actor ? roleForChat(actor) : "system"),
    type: input.type ?? "text",
    body: input.body,
    metadata: input.metadata ?? null,
    replyToMessageId: input.replyToMessageId ?? null,
    clientMessageId: input.clientMessageId ?? null,
    deliveryStatus: "sent",
    createdAt: timestamp,
    editedAt: null,
    deletedAt: null,
    ...forced,
  };
  messages.set(message.id, message);
  conversation.messageIds.push(message.id);
  conversation.lastMessageAt = timestamp;
  conversation.lastMessagePreview = message.body;
  conversation.updatedAt = timestamp;
  return message;
}

function publicConversation(actor: ChatActor, conversation: ConversationRecord): ChatConversation {
  const ownParticipant = participant(conversation, actor.id);
  const lastReadIndex = ownParticipant?.lastReadMessageId
    ? conversation.messageIds.indexOf(ownParticipant.lastReadMessageId)
    : -1;
  const unreadCount = conversation.messageIds.slice(lastReadIndex + 1).reduce((count, messageId) => {
    const message = messages.get(messageId);
    if (!message || message.senderId === actor.id || message.type === "internal_note") return count;
    return count + 1;
  }, 0);

  return {
    id: conversation.id,
    type: conversation.type,
    buyerId: conversation.buyerId,
    vendorId: conversation.vendorId,
    contextType: conversation.contextType,
    contextId: conversation.contextId,
    status: conversation.status,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    unreadCount,
    participants: conversation.participants,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function ticketConversation(ticket: TicketRecord): ConversationRecord | undefined {
  return conversations.get(ticket.conversationId);
}

export function listConversations(
  actor: ChatActor,
  filters: { type?: string; status?: string; limit?: number },
): ChatConversation[] {
  return [...conversations.values()]
    .filter((conversation) => canAccessConversation(actor, conversation))
    .filter((conversation) => !filters.type || conversation.type === filters.type)
    .filter((conversation) => !filters.status || conversation.status === filters.status)
    .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt))
    .slice(0, filters.limit ?? 50)
    .map((conversation) => publicConversation(actor, conversation));
}

export function getConversation(actor: ChatActor, conversationId: string): ChatConversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation || !canAccessConversation(actor, conversation)) return null;
  return publicConversation(actor, conversation);
}

export function createConversation(actor: ChatActor, input: CreateConversation): ChatConversation {
  if (input.type === "buyer_vendor") {
    if (actor.role !== "customer") throw new ChatServiceError(403, "Only customers can start buyer/vendor chats");
    if (!input.vendorId) throw new ChatServiceError(400, "vendorId is required for buyer/vendor chats");
  } else if (input.type === "customer_support") {
    if (actor.role === "customer") {
      if (input.recipientId) throw new ChatServiceError(403, "Customers cannot choose a support recipient");
    } else if (!isStaff(actor) || !hasChatPermission(actor, "support.view_inbox")) {
      throw new ChatServiceError(403, "Only customers or support staff can start customer support conversations");
    } else if (!input.recipientId) {
      throw new ChatServiceError(400, "recipientId is required when staff starts a customer conversation");
    }
  } else if (input.type === "vendor_support") {
    if (actor.role === "vendor") {
      if (input.vendorId && input.vendorId !== actor.vendorId && input.vendorId !== actor.id) {
        throw new ChatServiceError(403, "Vendors cannot choose another vendor for support");
      }
    } else if (!isStaff(actor) || !hasChatPermission(actor, "support.view_inbox")) {
      throw new ChatServiceError(403, "Only vendors or support staff can start vendor support conversations");
    } else if (!input.vendorId) {
      throw new ChatServiceError(400, "vendorId is required when staff starts a vendor conversation");
    }
  }

  const conversation = createConversationRecord(actor, input);
  if (input.initialMessage) {
    addMessage(actor, conversation, {
      body: input.initialMessage,
      clientMessageId: `thread-start-${conversation.id}`,
    });
  }
  return publicConversation(actor, conversation);
}

export function listMessages(actor: ChatActor, conversationId: string): { items: ChatMessage[]; nextCursor: string | null; hasMore: boolean } {
  const conversation = conversations.get(conversationId);
  if (!conversation || !canAccessConversation(actor, conversation)) throw new ChatServiceError(404, "Conversation not found");

  const visible = conversation.messageIds
    .map((messageId) => messages.get(messageId))
    .filter((message): message is ChatMessage => Boolean(message))
    .filter((message) => message.type !== "internal_note" || isStaff(actor));
  const items = visible.slice(-30);
  return { items, nextCursor: visible.length > items.length ? items[0]?.id ?? null : null, hasMore: visible.length > items.length };
}

export function markRead(actor: ChatActor, conversationId: string, messageId: string): void {
  const conversation = conversations.get(conversationId);
  if (!conversation || !canAccessConversation(actor, conversation)) throw new ChatServiceError(404, "Conversation not found");
  if (!conversation.messageIds.includes(messageId)) throw new ChatServiceError(400, "Message does not belong to this conversation");
  const ownParticipant = participant(conversation, actor.id);
  if (ownParticipant) ownParticipant.lastReadMessageId = messageId;
}

export function sendMessage(actor: ChatActor, conversationId: string, input: SendChatMessage): ChatMessage {
  const conversation = conversations.get(conversationId);
  if (!conversation || !canAccessConversation(actor, conversation)) throw new ChatServiceError(404, "Conversation not found");
  if (conversation.status === "closed") throw new ChatServiceError(409, "Closed conversations are read-only");
  if (input.type === "internal_note" && !isStaff(actor)) throw new ChatServiceError(403, "Only staff can add internal notes");

  const idempotencyKey = `${conversationId}:${actor.id}:${input.clientMessageId}`;
  const existing = idempotentMessages.get(idempotencyKey);
  if (existing) return existing;

  const message = addMessage(actor, conversation, input);
  idempotentMessages.set(idempotencyKey, message);

  const ticket = [...tickets.values()].find((entry) => entry.conversationId === conversationId);
  if (ticket && input.type !== "internal_note") {
    const previousStatus = ticket.status;
    ticket.status = isStaff(actor) ? "pending" : "open";
    if (isStaff(actor) && !ticket.firstResponseAt) ticket.firstResponseAt = message.createdAt;
    ticket.updatedAt = message.createdAt;
    if (previousStatus !== ticket.status) {
      addTicketEvent(ticket.id, "status_changed", actor.id, { status: previousStatus }, { status: ticket.status });
    }
  }
  return message;
}

export function listTickets(
  actor: ChatActor,
  filters: { status?: string; priority?: string; requesterType?: string; limit?: number },
): ChatTicket[] {
  if (!isStaff(actor) && actor.role !== "customer" && actor.role !== "vendor") {
    throw new ChatServiceError(403, "Support ticket access denied");
  }
  return [...tickets.values()]
    .filter((ticket) => canAccessTicket(actor, ticket))
    .filter((ticket) => !filters.status || ticket.status === filters.status)
    .filter((ticket) => !filters.priority || ticket.priority === filters.priority)
    .filter((ticket) => !filters.requesterType || ticket.requesterType === filters.requesterType)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, filters.limit ?? 50);
}

export function getTicket(actor: ChatActor, ticketId: string): ChatTicket | null {
  const ticket = tickets.get(ticketId);
  if (!ticket || !canAccessTicket(actor, ticket)) return null;
  return ticket;
}

export function listTicketEvents(actor: ChatActor, ticketId: string): TicketEvent[] {
  const ticket = tickets.get(ticketId);
  if (!ticket || !canAccessTicket(actor, ticket)) throw new ChatServiceError(404, "Support ticket not found");
  return ticketEvents.get(ticketId) ?? [];
}

export function createTicket(actor: ChatActor, input: CreateChatTicket): ChatTicket {
  if (actor.role !== "customer" && actor.role !== "vendor") {
    throw new ChatServiceError(403, "Only customers and vendors can create support tickets");
  }
  const requesterType = requesterTypeForActor(actor);
  const type = requesterType === "customer" ? "customer_support" : "vendor_support";
  const ticketNumber = `GUL-${String(ticketSequence++).padStart(6, "0")}`;
  const conversation = createConversationRecord(
    actor,
    {
      type,
      contextType: input.relatedOrderId ? "order" : input.relatedProductId ? "product" : "general",
      contextId: input.relatedOrderId ?? input.relatedProductId,
    },
    ticketNumber,
  );
  const timestamp = now();
  const ticket: TicketRecord = {
    id: randomUUID(),
    ticketNumber,
    conversationId: conversation.id,
    requesterId: actor.id,
    requesterType,
    category: input.category,
    subject: input.subject,
    priority: input.priority ?? "normal",
    status: "new",
    assignedAgentId: null,
    relatedOrderId: nullable(input.relatedOrderId),
    relatedProductId: nullable(input.relatedProductId),
    relatedVendorId: nullable(input.relatedVendorId),
    sourceConversationId: null,
    resolutionCode: null,
    resolutionNote: null,
    firstResponseAt: null,
    resolvedAt: null,
    closedAt: null,
    csatRating: null,
    csatComment: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  tickets.set(ticket.id, ticket);
  addTicketEvent(ticket.id, "created", actor.id, null, { status: ticket.status, priority: ticket.priority });
  addMessage(null, conversation, {
    body: `Thanks for contacting Gulani Support. Your ticket number is ${ticketNumber}. A support agent will review it shortly.`,
    clientMessageId: `system:${ticketNumber}`,
  }, { senderRole: "system" });
  addMessage(actor, conversation, {
    body: input.message,
    clientMessageId: input.clientMessageId,
  });
  return ticket;
}

export function updateTicket(actor: ChatActor, ticketId: string, input: UpdateChatTicket): ChatTicket {
  const ticket = tickets.get(ticketId);
  if (!ticket || !canAccessTicket(actor, ticket)) throw new ChatServiceError(404, "Support ticket not found");

  const isRequester = ticket.requesterId === actor.id;
  if (!isRequester && !isStaff(actor)) throw new ChatServiceError(403, "Support ticket access denied");
  if (
    input.assignedAgentId !== undefined ||
    input.priority !== undefined ||
    input.category !== undefined ||
    input.resolutionCode !== undefined ||
    input.resolutionNote !== undefined
  ) {
    if (!hasChatPermission(actor, "support.assign")) throw new ChatServiceError(403, "Ticket management permission required");
  }
  if (input.status !== undefined) {
    const allowedTransitions: Record<string, string[]> = {
      new: ["open", "resolved", "closed"],
      open: ["pending", "on_hold", "resolved", "closed"],
      pending: ["open", "on_hold", "resolved", "closed"],
      on_hold: ["open", "pending", "resolved", "closed"],
      resolved: ["open", "closed"],
      closed: ["open"],
    };
    if (input.status !== ticket.status && !allowedTransitions[ticket.status]?.includes(input.status)) {
      throw new ChatServiceError(409, `Cannot move a ${ticket.status} ticket to ${input.status}`);
    }
    const isReopen = ["resolved", "closed"].includes(ticket.status) && input.status === "open";
    if (isRequester && !isReopen) {
      throw new ChatServiceError(403, "Only support agents can change this ticket status");
    }
    if (!isRequester && !hasChatPermission(actor, isReopen ? "support.reopen" : "support.resolve")) {
      throw new ChatServiceError(403, "Ticket status permission required");
    }
    if (input.status === "resolved" && (!input.resolutionCode || !input.resolutionNote) && (!ticket.resolutionCode || !ticket.resolutionNote)) {
      throw new ChatServiceError(400, "resolutionCode and resolutionNote are required to resolve a ticket");
    }
    const previousStatus = ticket.status;
    if (input.status === "resolved") ticket.resolvedAt = now();
    if (input.status === "closed") ticket.closedAt = now();
    if (isReopen) {
      ticket.resolvedAt = null;
      ticket.closedAt = null;
    }
    ticket.status = input.status;
    addTicketEvent(
      ticket.id,
      input.status === "resolved" ? "resolved" : input.status === "closed" ? "closed" : isReopen ? "reopened" : "status_changed",
      actor.id,
      { status: previousStatus },
      { status: input.status },
    );
  }
  if (input.priority !== undefined && input.priority !== ticket.priority) {
    const previousPriority = ticket.priority;
    ticket.priority = input.priority;
    addTicketEvent(ticket.id, "priority_changed", actor.id, { priority: previousPriority }, { priority: input.priority });
  }
  if (input.assignedAgentId !== undefined && input.assignedAgentId !== ticket.assignedAgentId) {
    const previousAgent = ticket.assignedAgentId;
    ticket.assignedAgentId = input.assignedAgentId;
    addTicketEvent(ticket.id, "assigned", actor.id, { assignedAgentId: previousAgent }, { assignedAgentId: input.assignedAgentId });
  }
  if (input.category !== undefined && input.category !== ticket.category) {
    const previousCategory = ticket.category;
    ticket.category = input.category;
    addTicketEvent(ticket.id, "category_changed", actor.id, { category: previousCategory }, { category: input.category });
  }
  if (input.resolutionCode !== undefined) ticket.resolutionCode = input.resolutionCode;
  if (input.resolutionNote !== undefined) ticket.resolutionNote = input.resolutionNote;
  ticket.updatedAt = now();
  return ticket;
}

export function rateTicket(actor: ChatActor, ticketId: string, rating: number, comment?: string): ChatTicket {
  const ticket = tickets.get(ticketId);
  if (!ticket || !canAccessTicket(actor, ticket)) throw new ChatServiceError(404, "Support ticket not found");
  if (ticket.requesterId !== actor.id) throw new ChatServiceError(403, "Only the requester can rate a ticket");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ChatServiceError(400, "Rating must be between 1 and 5");
  if (!["resolved", "closed"].includes(ticket.status)) throw new ChatServiceError(409, "Only resolved tickets can be rated");
  ticket.csatRating = rating;
  ticket.csatComment = comment?.trim() || null;
  ticket.updatedAt = now();
  addTicketEvent(ticket.id, "note_added", actor.id, null, { csatRating: rating }, comment?.trim() || null);
  return ticket;
}

export function sendTicketMessage(actor: ChatActor, ticketId: string, input: SendChatMessage): ChatMessage {
  const ticket = tickets.get(ticketId);
  if (!ticket || !canAccessTicket(actor, ticket)) throw new ChatServiceError(404, "Support ticket not found");
  if (isStaff(actor) && !hasChatPermission(actor, "support.reply")) {
    throw new ChatServiceError(403, "Support reply permission required");
  }
  return sendMessage(actor, ticket.conversationId, input);
}

export class ChatServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}