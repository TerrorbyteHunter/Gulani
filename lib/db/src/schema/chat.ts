import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const conversationTypeEnum = pgEnum("conversation_type", [
  "buyer_vendor",
  "customer_support",
  "vendor_support",
]);
export const conversationContextTypeEnum = pgEnum("conversation_context_type", [
  "product",
  "order",
  "shop",
  "general",
]);
export const conversationStatusEnum = pgEnum("conversation_status", [
  "active",
  "archived",
  "closed",
]);
export const chatRoleEnum = pgEnum("chat_role", [
  "customer",
  "vendor",
  "support",
  "master_admin",
  "system_admin",
]);
export const messageSenderRoleEnum = pgEnum("message_sender_role", [
  "customer",
  "vendor",
  "support",
  "master_admin",
  "system_admin",
  "system",
]);
export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "image",
  "file",
  "product_card",
  "order_card",
  "system",
  "internal_note",
]);
export const messageDeliveryStatusEnum = pgEnum("message_delivery_status", [
  "sent",
  "delivered",
  "read",
]);
export const requesterTypeEnum = pgEnum("requester_type", ["customer", "vendor"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "new",
  "open",
  "pending",
  "on_hold",
  "resolved",
  "closed",
]);
export const ticketEventTypeEnum = pgEnum("ticket_event_type", [
  "created",
  "assigned",
  "status_changed",
  "priority_changed",
  "category_changed",
  "escalated",
  "note_added",
  "reopened",
  "resolved",
  "closed",
]);
export const ticketCategoryAudienceEnum = pgEnum("ticket_category_audience", [
  "customer",
  "vendor",
  "both",
]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: conversationTypeEnum("type").notNull(),
    buyerId: text("buyer_id"),
    vendorId: text("vendor_id"),
    contextType: conversationContextTypeEnum("context_type").notNull().default("general"),
    contextId: text("context_id"),
    status: conversationStatusEnum("status").notNull().default("active"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"),
    ...timestamps,
  },
  (table) => [
    index("conversations_buyer_id_idx").on(table.buyerId),
    index("conversations_vendor_id_idx").on(table.vendorId),
    index("conversations_status_last_message_idx").on(table.status, table.lastMessageAt),
  ],
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    roleInChat: chatRoleEnum("role_in_chat").notNull(),
    lastReadMessageId: uuid("last_read_message_id"),
    muted: boolean("muted").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("conversation_participants_user_id_idx").on(table.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id"),
    senderRole: messageSenderRoleEnum("sender_role").notNull(),
    type: messageTypeEnum("type").notNull().default("text"),
    body: text("body"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    replyToMessageId: uuid("reply_to_message_id"),
    clientMessageId: text("client_message_id"),
    deliveryStatus: messageDeliveryStatusEnum("delivery_status").notNull().default("sent"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("messages_sender_id_idx").on(table.senderId),
    uniqueIndex("messages_conversation_client_message_idx").on(
      table.conversationId,
      table.clientMessageId,
    ),
  ],
);

export const messageAttachments = pgTable(
  "message_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    type: text("type").notNull(),
    size: integer("size").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    ...timestamps,
  },
  (table) => [index("message_attachments_message_id_idx").on(table.messageId)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketNumber: text("ticket_number").notNull(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    requesterId: text("requester_id").notNull(),
    requesterType: requesterTypeEnum("requester_type").notNull(),
    category: text("category").notNull(),
    subject: text("subject").notNull(),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    status: ticketStatusEnum("status").notNull().default("new"),
    assignedAgentId: text("assigned_agent_id"),
    relatedOrderId: text("related_order_id"),
    relatedProductId: text("related_product_id"),
    relatedVendorId: text("related_vendor_id"),
    sourceConversationId: uuid("source_conversation_id"),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    resolutionCode: text("resolution_code"),
    resolutionNote: text("resolution_note"),
    csatRating: integer("csat_rating"),
    csatComment: text("csat_comment"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tickets_ticket_number_idx").on(table.ticketNumber),
    index("tickets_conversation_id_idx").on(table.conversationId),
    index("tickets_requester_status_idx").on(table.requesterId, table.status),
    index("tickets_assigned_agent_status_idx").on(table.assignedAgentId, table.status),
    index("tickets_priority_status_idx").on(table.priority, table.status),
  ],
);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    eventType: ticketEventTypeEnum("event_type").notNull(),
    actorId: text("actor_id"),
    oldValue: jsonb("old_value").$type<Record<string, unknown> | null>(),
    newValue: jsonb("new_value").$type<Record<string, unknown> | null>(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [index("ticket_events_ticket_created_idx").on(table.ticketId, table.createdAt)],
);

export const ticketCategories = pgTable(
  "ticket_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    audience: ticketCategoryAudienceEnum("audience").notNull().default("both"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("ticket_categories_slug_idx").on(table.slug),
    index("ticket_categories_audience_active_idx").on(table.audience, table.active),
  ],
);

export const cannedReplies = pgTable(
  "canned_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    category: text("category"),
    createdById: text("created_by_id").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("canned_replies_category_active_idx").on(table.category, table.active)],
);

export const chatReports = pgTable(
  "chat_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id").notNull(),
    reportedUserId: text("reported_user_id"),
    messageId: uuid("message_id"),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    ...timestamps,
  },
  (table) => [
    index("chat_reports_conversation_id_idx").on(table.conversationId),
    index("chat_reports_reporter_id_idx").on(table.reporterId),
  ],
);

export const blockedUsers = pgTable(
  "blocked_users",
  {
    blockerId: text("blocker_id").notNull(),
    blockedId: text("blocked_id").notNull(),
    reason: text("reason"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index("blocked_users_blocked_id_idx").on(table.blockedId),
  ],
);

export const chatSettings = pgTable("chat_settings", {
  id: text("id").primaryKey().default("default"),
  supportHours: jsonb("support_hours").$type<Record<string, unknown>>().notNull().default({}),
  autoReplyText: text("auto_reply_text"),
  slaTargets: jsonb("sla_targets").$type<Record<string, unknown>>().notNull().default({}),
  autoCloseDays: integer("auto_close_days").notNull().default(7),
  maxFileSize: integer("max_file_size").notNull().default(10_485_760),
  allowedFileTypes: text("allowed_file_types").array().notNull().default([]),
  bannedWords: text("banned_words").array().notNull().default([]),
  contactMaskingEnabled: boolean("contact_masking_enabled").notNull().default(true),
  ...timestamps,
});

export const insertConversationSchema = createInsertSchema(conversations);
export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants);
export const insertMessageSchema = createInsertSchema(messages);
export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments);
export const insertTicketSchema = createInsertSchema(tickets);
export const insertTicketEventSchema = createInsertSchema(ticketEvents);
export const insertTicketCategorySchema = createInsertSchema(ticketCategories);
export const insertCannedReplySchema = createInsertSchema(cannedReplies);
export const insertChatReportSchema = createInsertSchema(chatReports);
export const insertBlockedUserSchema = createInsertSchema(blockedUsers);
export const insertChatSettingsSchema = createInsertSchema(chatSettings);

export type Conversation = typeof conversations.$inferSelect;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketEvent = typeof ticketEvents.$inferSelect;
export type TicketCategory = typeof ticketCategories.$inferSelect;
export type CannedReply = typeof cannedReplies.$inferSelect;
export type ChatReport = typeof chatReports.$inferSelect;
export type BlockedUser = typeof blockedUsers.$inferSelect;
export type ChatSettings = typeof chatSettings.$inferSelect;