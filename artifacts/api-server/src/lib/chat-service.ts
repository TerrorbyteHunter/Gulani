import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import type {
  ChatConversation,
  ChatMessage,
  ChatTicket,
  CreateChatTicket,
  CreateConversation,
  SendChatMessage,
  UpdateChatTicket,
} from "@workspace/api-zod";
import {
  db,
  conversations as conversationsTable,
  conversationParticipants as participantsTable,
  messages as messagesTable,
  ticketEvents as ticketEventsTable,
  tickets as ticketsTable,
  type Conversation as DbConversation,
  type ConversationParticipant as DbParticipant,
  type Message as DbMessage,
  type Ticket as DbTicket,
  type TicketEvent as DbTicketEvent,
} from "@workspace/db";
import {
  hasChatPermission,
  isStaff,
  requesterTypeForActor,
  roleForChat,
  type ChatActor,
} from "./chat-access";

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

type ConversationSnapshot = {
  conversation: DbConversation;
  participants: DbParticipant[];
  messages: DbMessage[];
};

type TicketEventDraft = {
  eventType: DbTicketEvent["eventType"];
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  note?: string | null;
};

const now = () => new Date();
const toIso = (value: Date | null) => value?.toISOString() ?? null;
const nullable = (value?: string) => value ?? null;

function toChatMessage(message: DbMessage): ChatMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderRole: message.senderRole,
    type: message.type,
    body: message.body,
    metadata: message.metadata ?? null,
    replyToMessageId: message.replyToMessageId,
    clientMessageId: message.clientMessageId,
    deliveryStatus: message.deliveryStatus,
    createdAt: message.createdAt.toISOString(),
    editedAt: toIso(message.editedAt),
    deletedAt: toIso(message.deletedAt),
  };
}

function toChatTicket(ticket: DbTicket): ChatTicket {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    conversationId: ticket.conversationId,
    requesterId: ticket.requesterId,
    requesterType: ticket.requesterType,
    category: ticket.category,
    subject: ticket.subject,
    priority: ticket.priority,
    status: ticket.status,
    assignedAgentId: ticket.assignedAgentId,
    relatedOrderId: ticket.relatedOrderId,
    relatedProductId: ticket.relatedProductId,
    relatedVendorId: ticket.relatedVendorId,
    sourceConversationId: ticket.sourceConversationId,
    resolutionCode: ticket.resolutionCode,
    resolutionNote: ticket.resolutionNote,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

function participantIds(participants: DbParticipant[]): Set<string> {
  return new Set(participants.map((entry) => entry.userId));
}

function canAccessConversation(
  actor: ChatActor,
  conversation: DbConversation,
  members: ReadonlySet<string>,
): boolean {
  if (actor.role === "master_admin" || actor.role === "system_admin") return true;
  if (members.has(actor.id)) return true;
  if (isStaff(actor) && conversation.type !== "buyer_vendor") {
    return hasChatPermission(actor, "support.view_inbox");
  }
  return false;
}

function canAccessTicket(actor: ChatActor, ticket: DbTicket): boolean {
  if (actor.role === "master_admin" || actor.role === "system_admin") return true;
  if (isStaff(actor)) return hasChatPermission(actor, "support.view_inbox");
  return ticket.requesterId === actor.id;
}

function toChatConversation(
  actor: ChatActor,
  conversation: DbConversation,
  participants: DbParticipant[],
  messages: DbMessage[],
): ChatConversation {
  const ownParticipant = participants.find((entry) => entry.userId === actor.id);
  const lastReadIndex = ownParticipant?.lastReadMessageId
    ? messages.findIndex((message) => message.id === ownParticipant.lastReadMessageId)
    : -1;
  const unreadCount = messages.slice(lastReadIndex + 1).reduce((count, message) => {
    if (message.senderId === actor.id || message.type === "internal_note") return count;
    return count + 1;
  }, 0);
  const latestVisibleMessage = [...messages]
    .reverse()
    .find((message) => message.type !== "internal_note" || isStaff(actor));

  return {
    id: conversation.id,
    type: conversation.type,
    buyerId: conversation.buyerId,
    vendorId: conversation.vendorId,
    contextType: conversation.contextType,
    contextId: conversation.contextId,
    status: conversation.status,
    lastMessageAt: toIso(conversation.lastMessageAt),
    lastMessagePreview:
      !isStaff(actor) && latestVisibleMessage
        ? latestVisibleMessage.body
        : conversation.lastMessagePreview,
    unreadCount,
    participants: participants.map((entry) => ({
      userId: entry.userId,
      roleInChat: entry.roleInChat,
      lastReadMessageId: entry.lastReadMessageId,
      muted: entry.muted,
    })),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

async function loadConversation(conversationId: string): Promise<ConversationSnapshot | null> {
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);
  if (!conversation) return null;

  const [participants, messages] = await Promise.all([
    db
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.conversationId, conversationId)),
    db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.createdAt), asc(messagesTable.id)),
  ]);
  return { conversation, participants, messages };
}

function conversationParticipants(
  actor: ChatActor,
  input: CreateConversation,
  conversationId: string,
): Array<typeof participantsTable.$inferInsert> {
  const participants: Array<typeof participantsTable.$inferInsert> = [
    {
      conversationId,
      userId: actor.id,
      roleInChat: roleForChat(actor),
      lastReadMessageId: null,
      muted: false,
    },
  ];

  if (
    (input.type === "buyer_vendor" || input.type === "vendor_support") &&
    input.vendorId &&
    input.vendorId !== actor.id
  ) {
    participants.push({
      conversationId,
      userId: input.vendorId,
      roleInChat: "vendor",
      lastReadMessageId: null,
      muted: false,
    });
  }
  if (
    input.type === "customer_support" &&
    isStaff(actor) &&
    input.recipientId &&
    input.recipientId !== actor.id
  ) {
    participants.push({
      conversationId,
      userId: input.recipientId,
      roleInChat: "customer",
      lastReadMessageId: null,
      muted: false,
    });
  }
  return participants;
}

function validateConversationRequest(actor: ChatActor, input: CreateConversation) {
  if (input.type === "buyer_vendor") {
    if (actor.role !== "customer") {
      throw new ChatServiceError(403, "Only customers can start buyer/vendor chats");
    }
    if (!input.vendorId) {
      throw new ChatServiceError(400, "vendorId is required for buyer/vendor chats");
    }
  } else if (input.type === "customer_support") {
    if (actor.role === "customer") {
      if (input.recipientId) {
        throw new ChatServiceError(403, "Customers cannot choose a support recipient");
      }
    } else if (!isStaff(actor) || !hasChatPermission(actor, "support.view_inbox")) {
      throw new ChatServiceError(
        403,
        "Only customers or support staff can start customer support conversations",
      );
    } else if (!input.recipientId) {
      throw new ChatServiceError(
        400,
        "recipientId is required when staff starts a customer conversation",
      );
    }
  } else if (input.type === "vendor_support") {
    if (actor.role === "vendor") {
      if (input.vendorId && input.vendorId !== actor.vendorId && input.vendorId !== actor.id) {
        throw new ChatServiceError(403, "Vendors cannot choose another vendor for support");
      }
    } else if (!isStaff(actor) || !hasChatPermission(actor, "support.view_inbox")) {
      throw new ChatServiceError(
        403,
        "Only vendors or support staff can start vendor support conversations",
      );
    } else if (!input.vendorId) {
      throw new ChatServiceError(
        400,
        "vendorId is required when staff starts a vendor conversation",
      );
    }
  }
}

export async function listConversations(
  actor: ChatActor,
  filters: { type?: string; status?: string; limit?: number },
): Promise<ChatConversation[]> {
  const [allConversations, allParticipants] = await Promise.all([
    db
      .select()
      .from(conversationsTable)
      .orderBy(desc(conversationsTable.lastMessageAt), desc(conversationsTable.createdAt)),
    db.select().from(participantsTable),
  ]);
  const participantsByConversation = new Map<string, DbParticipant[]>();
  for (const participant of allParticipants) {
    const group = participantsByConversation.get(participant.conversationId) ?? [];
    group.push(participant);
    participantsByConversation.set(participant.conversationId, group);
  }

  const selected = allConversations
    .filter((conversation) =>
      canAccessConversation(
        actor,
        conversation,
        participantIds(participantsByConversation.get(conversation.id) ?? []),
      ),
    )
    .filter((conversation) => !filters.type || conversation.type === filters.type)
    .filter((conversation) => !filters.status || conversation.status === filters.status)
    .sort((a, b) => {
      const timeA = a.lastMessageAt ?? a.createdAt;
      const timeB = b.lastMessageAt ?? b.createdAt;
      return timeB.getTime() - timeA.getTime();
    })
    .slice(0, filters.limit ?? 50);

  if (selected.length === 0) return [];
  const ids = selected.map((conversation) => conversation.id);
  const [selectedMessages] = await Promise.all([
    db
      .select()
      .from(messagesTable)
      .where(inArray(messagesTable.conversationId, ids))
      .orderBy(asc(messagesTable.createdAt), asc(messagesTable.id)),
  ]);
  const messagesByConversation = new Map<string, DbMessage[]>();
  for (const message of selectedMessages) {
    const group = messagesByConversation.get(message.conversationId) ?? [];
    group.push(message);
    messagesByConversation.set(message.conversationId, group);
  }

  return selected.map((conversation) =>
    toChatConversation(
      actor,
      conversation,
      participantsByConversation.get(conversation.id) ?? [],
      messagesByConversation.get(conversation.id) ?? [],
    ),
  );
}

export async function getConversation(
  actor: ChatActor,
  conversationId: string,
): Promise<ChatConversation | null> {
  const snapshot = await loadConversation(conversationId);
  if (
    !snapshot ||
    !canAccessConversation(actor, snapshot.conversation, participantIds(snapshot.participants))
  ) {
    return null;
  }
  return toChatConversation(
    actor,
    snapshot.conversation,
    snapshot.participants,
    snapshot.messages,
  );
}

export async function createConversation(
  actor: ChatActor,
  input: CreateConversation,
): Promise<ChatConversation> {
  validateConversationRequest(actor, input);

  const conversationId = randomUUID();
  const timestamp = now();
  const vendorId = input.vendorId ?? (actor.role === "vendor" ? actor.vendorId ?? actor.id : null);
  const buyerId =
    actor.role === "customer"
      ? actor.id
      : input.type === "customer_support"
        ? input.recipientId ?? null
        : null;

  await db.transaction(async (tx) => {
    await tx.insert(conversationsTable).values({
      id: conversationId,
      type: input.type,
      buyerId,
      vendorId,
      contextType: input.contextType,
      contextId: nullable(input.contextId),
      status: "active",
      lastMessagePreview: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await tx
      .insert(participantsTable)
      .values(conversationParticipants(actor, input, conversationId));

    if (input.initialMessage) {
      const messageTime = now();
      await tx.insert(messagesTable).values({
        id: randomUUID(),
        conversationId,
        senderId: actor.id,
        senderRole: roleForChat(actor),
        type: "text",
        body: input.initialMessage,
        metadata: null,
        replyToMessageId: null,
        clientMessageId: `thread-start-${conversationId}`,
        deliveryStatus: "sent",
        createdAt: messageTime,
        updatedAt: messageTime,
      });
      await tx
        .update(conversationsTable)
        .set({
          lastMessageAt: messageTime,
          lastMessagePreview: input.initialMessage,
          updatedAt: messageTime,
        })
        .where(eq(conversationsTable.id, conversationId));
    }
  });

  const conversation = await getConversation(actor, conversationId);
  if (!conversation) throw new ChatServiceError(500, "Could not load the created conversation");
  return conversation;
}

export async function listMessages(
  actor: ChatActor,
  conversationId: string,
): Promise<{ items: ChatMessage[]; nextCursor: string | null; hasMore: boolean }> {
  const snapshot = await loadConversation(conversationId);
  if (
    !snapshot ||
    !canAccessConversation(actor, snapshot.conversation, participantIds(snapshot.participants))
  ) {
    throw new ChatServiceError(404, "Conversation not found");
  }

  const visible = snapshot.messages.filter(
    (message) => message.type !== "internal_note" || isStaff(actor),
  );
  const rows = visible.slice(-30);
  const items = rows.map(toChatMessage);
  return {
    items,
    nextCursor: visible.length > items.length ? items[0]?.id ?? null : null,
    hasMore: visible.length > items.length,
  };
}

export async function markRead(
  actor: ChatActor,
  conversationId: string,
  messageId: string,
): Promise<void> {
  const snapshot = await loadConversation(conversationId);
  if (
    !snapshot ||
    !canAccessConversation(actor, snapshot.conversation, participantIds(snapshot.participants))
  ) {
    throw new ChatServiceError(404, "Conversation not found");
  }
  if (!snapshot.messages.some((message) => message.id === messageId)) {
    throw new ChatServiceError(400, "Message does not belong to this conversation");
  }
  await db
    .update(participantsTable)
    .set({ lastReadMessageId: messageId })
    .where(
      and(
        eq(participantsTable.conversationId, conversationId),
        eq(participantsTable.userId, actor.id),
      ),
    );
}

export async function sendMessage(
  actor: ChatActor,
  conversationId: string,
  input: SendChatMessage,
): Promise<ChatMessage> {
  return db.transaction(async (tx) => {
    const [conversation] = await tx
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId))
      .limit(1);
    if (!conversation) throw new ChatServiceError(404, "Conversation not found");

    const participants = await tx
      .select()
      .from(participantsTable)
      .where(eq(participantsTable.conversationId, conversationId));
    if (!canAccessConversation(actor, conversation, participantIds(participants))) {
      throw new ChatServiceError(404, "Conversation not found");
    }
    if (conversation.status === "closed") {
      throw new ChatServiceError(409, "Closed conversations are read-only");
    }
    if (input.type === "internal_note" && !isStaff(actor)) {
      throw new ChatServiceError(403, "Only staff can add internal notes");
    }

    if (input.clientMessageId) {
      const [existing] = await tx
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, conversationId),
            eq(messagesTable.senderId, actor.id),
            eq(messagesTable.clientMessageId, input.clientMessageId),
          ),
        )
        .limit(1);
      if (existing) return toChatMessage(existing);
    }

    const messageTime = now();
    const [inserted] = await tx
      .insert(messagesTable)
      .values({
        id: randomUUID(),
        conversationId,
        senderId: actor.id,
        senderRole: roleForChat(actor),
        type: input.type ?? "text",
        body: input.body,
        metadata: input.metadata ?? null,
        replyToMessageId: input.replyToMessageId ?? null,
        clientMessageId: input.clientMessageId ?? null,
        deliveryStatus: "sent",
        createdAt: messageTime,
        updatedAt: messageTime,
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted && input.clientMessageId) {
      const [existing] = await tx
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, conversationId),
            eq(messagesTable.senderId, actor.id),
            eq(messagesTable.clientMessageId, input.clientMessageId),
          ),
        )
        .limit(1);
      if (existing) return toChatMessage(existing);
    }
    if (!inserted) throw new ChatServiceError(409, "Message could not be saved");

    await tx
      .update(conversationsTable)
      .set({
        lastMessageAt: messageTime,
        lastMessagePreview: input.body,
        updatedAt: messageTime,
      })
      .where(eq(conversationsTable.id, conversationId));

    const [ticket] = await tx
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.conversationId, conversationId))
      .limit(1);
    if (ticket && input.type !== "internal_note") {
      const status = isStaff(actor) ? "pending" : "open";
      const updates: Partial<typeof ticketsTable.$inferInsert> = {
        status,
        updatedAt: messageTime,
      };
      if (isStaff(actor) && !ticket.firstResponseAt) updates.firstResponseAt = messageTime;
      await tx.update(ticketsTable).set(updates).where(eq(ticketsTable.id, ticket.id));
      if (ticket.status !== status) {
        await tx.insert(ticketEventsTable).values({
          id: randomUUID(),
          ticketId: ticket.id,
          eventType: "status_changed",
          actorId: actor.id,
          oldValue: { status: ticket.status },
          newValue: { status },
          note: null,
          createdAt: messageTime,
          updatedAt: messageTime,
        });
      }
    }
    return toChatMessage(inserted);
  });
}

export async function listTickets(
  actor: ChatActor,
  filters: { status?: string; priority?: string; requesterType?: string; limit?: number },
): Promise<ChatTicket[]> {
  if (!isStaff(actor) && actor.role !== "customer" && actor.role !== "vendor") {
    throw new ChatServiceError(403, "Support ticket access denied");
  }
  const rows = await db
    .select()
    .from(ticketsTable)
    .orderBy(desc(ticketsTable.updatedAt));
  return rows
    .filter((ticket) => canAccessTicket(actor, ticket))
    .filter((ticket) => !filters.status || ticket.status === filters.status)
    .filter((ticket) => !filters.priority || ticket.priority === filters.priority)
    .filter((ticket) => !filters.requesterType || ticket.requesterType === filters.requesterType)
    .slice(0, filters.limit ?? 50)
    .map(toChatTicket);
}

export async function getTicket(actor: ChatActor, ticketId: string): Promise<ChatTicket | null> {
  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId))
    .limit(1);
  if (!ticket || !canAccessTicket(actor, ticket)) return null;
  return toChatTicket(ticket);
}

export async function listTicketEvents(actor: ChatActor, ticketId: string): Promise<TicketEvent[]> {
  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId))
    .limit(1);
  if (!ticket || !canAccessTicket(actor, ticket)) {
    throw new ChatServiceError(404, "Support ticket not found");
  }
  const events = await db
    .select()
    .from(ticketEventsTable)
    .where(eq(ticketEventsTable.ticketId, ticketId))
    .orderBy(asc(ticketEventsTable.createdAt), asc(ticketEventsTable.id));
  return events.map((event) => ({
    id: event.id,
    ticketId: event.ticketId,
    eventType: event.eventType,
    actorId: event.actorId,
    oldValue: event.oldValue,
    newValue: event.newValue,
    note: event.note,
    createdAt: event.createdAt.toISOString(),
  }));
}

export async function createTicket(
  actor: ChatActor,
  input: CreateChatTicket,
): Promise<ChatTicket> {
  if (actor.role !== "customer" && actor.role !== "vendor") {
    throw new ChatServiceError(403, "Only customers and vendors can create support tickets");
  }
  const requesterType = requesterTypeForActor(actor);
  const conversationType = requesterType === "customer" ? "customer_support" : "vendor_support";
  const conversationId = randomUUID();
  const ticketId = randomUUID();
  const ticketNumber = `GUL-${randomUUID().slice(0, 8).toUpperCase()}`;
  const timestamp = now();
  const contextType = input.relatedOrderId
    ? "order"
    : input.relatedProductId
      ? "product"
      : "general";
  const vendorId =
    requesterType === "vendor" ? actor.vendorId ?? actor.id : input.relatedVendorId ?? null;
  const participants = conversationParticipants(
    actor,
    {
      type: conversationType,
      contextType,
      contextId: input.relatedOrderId ?? input.relatedProductId,
      vendorId: vendorId ?? undefined,
    },
    conversationId,
  );

  const ticket = await db.transaction(async (tx) => {
    await tx.insert(conversationsTable).values({
      id: conversationId,
      type: conversationType,
      buyerId: requesterType === "customer" ? actor.id : null,
      vendorId,
      contextType,
      contextId: input.relatedOrderId ?? input.relatedProductId ?? null,
      status: "active",
      lastMessagePreview: input.message,
      lastMessageAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await tx.insert(participantsTable).values(participants);

    const [createdTicket] = await tx
      .insert(ticketsTable)
      .values({
        id: ticketId,
        ticketNumber,
        conversationId,
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
      })
      .returning();

    await tx.insert(ticketEventsTable).values({
      id: randomUUID(),
      ticketId,
      eventType: "created",
      actorId: actor.id,
      oldValue: null,
      newValue: { status: "new", priority: createdTicket.priority },
      note: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await tx.insert(messagesTable).values([
      {
        id: randomUUID(),
        conversationId,
        senderId: null,
        senderRole: "system",
        type: "system",
        body: `Thanks for contacting Gulani Support. Your ticket number is ${ticketNumber}. A support agent will review it shortly.`,
        metadata: null,
        replyToMessageId: null,
        clientMessageId: `system:${ticketNumber}`,
        deliveryStatus: "sent",
        createdAt: new Date(timestamp.getTime() - 1),
        updatedAt: new Date(timestamp.getTime() - 1),
      },
      {
        id: randomUUID(),
        conversationId,
        senderId: actor.id,
        senderRole: roleForChat(actor),
        type: "text",
        body: input.message,
        metadata: null,
        replyToMessageId: null,
        clientMessageId: input.clientMessageId,
        deliveryStatus: "sent",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    return createdTicket;
  });
  return toChatTicket(ticket);
}

export async function updateTicket(
  actor: ChatActor,
  ticketId: string,
  input: UpdateChatTicket,
): Promise<ChatTicket> {
  return db.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.id, ticketId))
      .limit(1);
    if (!ticket || !canAccessTicket(actor, ticket)) {
      throw new ChatServiceError(404, "Support ticket not found");
    }

    const isRequester = ticket.requesterId === actor.id;
    if (!isRequester && !isStaff(actor)) {
      throw new ChatServiceError(403, "Support ticket access denied");
    }
    if (
      input.assignedAgentId !== undefined ||
      input.priority !== undefined ||
      input.category !== undefined ||
      input.resolutionCode !== undefined ||
      input.resolutionNote !== undefined
    ) {
      if (!hasChatPermission(actor, "support.assign")) {
        throw new ChatServiceError(403, "Ticket management permission required");
      }
    }

    const updates: Partial<typeof ticketsTable.$inferInsert> = { updatedAt: now() };
    const events: TicketEventDraft[] = [];
    if (input.status !== undefined) {
      const allowedTransitions: Record<string, string[]> = {
        new: ["open", "resolved", "closed"],
        open: ["pending", "on_hold", "resolved", "closed"],
        pending: ["open", "on_hold", "resolved", "closed"],
        on_hold: ["open", "pending", "resolved", "closed"],
        resolved: ["open", "closed"],
        closed: ["open"],
      };
      if (
        input.status !== ticket.status &&
        !allowedTransitions[ticket.status]?.includes(input.status)
      ) {
        throw new ChatServiceError(409, `Cannot move a ${ticket.status} ticket to ${input.status}`);
      }
      const isReopen = ["resolved", "closed"].includes(ticket.status) && input.status === "open";
      if (isRequester && !isReopen) {
        throw new ChatServiceError(403, "Only support agents can change this ticket status");
      }
      if (
        !isRequester &&
        !hasChatPermission(actor, isReopen ? "support.reopen" : "support.resolve")
      ) {
        throw new ChatServiceError(403, "Ticket status permission required");
      }
      if (
        input.status === "resolved" &&
        (!input.resolutionCode || !input.resolutionNote) &&
        (!ticket.resolutionCode || !ticket.resolutionNote)
      ) {
        throw new ChatServiceError(
          400,
          "resolutionCode and resolutionNote are required to resolve a ticket",
        );
      }

      updates.status = input.status;
      if (input.status === "resolved") updates.resolvedAt = now();
      if (input.status === "closed") updates.closedAt = now();
      if (isReopen) {
        updates.resolvedAt = null;
        updates.closedAt = null;
      }
      if (input.status !== ticket.status) {
        events.push({
          eventType:
            input.status === "resolved"
              ? "resolved"
              : input.status === "closed"
                ? "closed"
                : isReopen
                  ? "reopened"
                  : "status_changed",
          oldValue: { status: ticket.status },
          newValue: { status: input.status },
        });
      }
    }
    if (input.priority !== undefined && input.priority !== ticket.priority) {
      updates.priority = input.priority;
      events.push({
        eventType: "priority_changed",
        oldValue: { priority: ticket.priority },
        newValue: { priority: input.priority },
      });
    }
    if (input.assignedAgentId !== undefined && input.assignedAgentId !== ticket.assignedAgentId) {
      updates.assignedAgentId = input.assignedAgentId;
      events.push({
        eventType: "assigned",
        oldValue: { assignedAgentId: ticket.assignedAgentId },
        newValue: { assignedAgentId: input.assignedAgentId },
      });
    }
    if (input.category !== undefined && input.category !== ticket.category) {
      updates.category = input.category;
      events.push({
        eventType: "category_changed",
        oldValue: { category: ticket.category },
        newValue: { category: input.category },
      });
    }
    if (input.resolutionCode !== undefined) updates.resolutionCode = input.resolutionCode;
    if (input.resolutionNote !== undefined) updates.resolutionNote = input.resolutionNote;

    const [updated] = await tx
      .update(ticketsTable)
      .set(updates)
      .where(eq(ticketsTable.id, ticketId))
      .returning();
    if (events.length > 0) {
      await tx.insert(ticketEventsTable).values(
        events.map((event) => ({
          id: randomUUID(),
          ticketId,
          eventType: event.eventType,
          actorId: actor.id,
          oldValue: event.oldValue ?? null,
          newValue: event.newValue ?? null,
          note: event.note ?? null,
        })),
      );
    }
    return toChatTicket(updated);
  });
}

export async function rateTicket(
  actor: ChatActor,
  ticketId: string,
  rating: number,
  comment?: string,
): Promise<ChatTicket> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ChatServiceError(400, "Rating must be between 1 and 5");
  }
  return db.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.id, ticketId))
      .limit(1);
    if (!ticket || !canAccessTicket(actor, ticket)) {
      throw new ChatServiceError(404, "Support ticket not found");
    }
    if (ticket.requesterId !== actor.id) {
      throw new ChatServiceError(403, "Only the requester can rate a ticket");
    }
    if (!["resolved", "closed"].includes(ticket.status)) {
      throw new ChatServiceError(409, "Only resolved tickets can be rated");
    }
    const cleanComment = comment?.trim() || null;
    const [updated] = await tx
      .update(ticketsTable)
      .set({ csatRating: rating, csatComment: cleanComment, updatedAt: now() })
      .where(eq(ticketsTable.id, ticketId))
      .returning();
    await tx.insert(ticketEventsTable).values({
      id: randomUUID(),
      ticketId,
      eventType: "note_added",
      actorId: actor.id,
      oldValue: null,
      newValue: { csatRating: rating },
      note: cleanComment,
    });
    return toChatTicket(updated);
  });
}

export async function sendTicketMessage(
  actor: ChatActor,
  ticketId: string,
  input: SendChatMessage,
): Promise<ChatMessage> {
  const ticket = await getTicket(actor, ticketId);
  if (!ticket) throw new ChatServiceError(404, "Support ticket not found");
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
