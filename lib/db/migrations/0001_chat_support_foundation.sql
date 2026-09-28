CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "conversation_type" AS ENUM ('buyer_vendor', 'customer_support', 'vendor_support');
CREATE TYPE "conversation_context_type" AS ENUM ('product', 'order', 'shop', 'general');
CREATE TYPE "conversation_status" AS ENUM ('active', 'archived', 'closed');
CREATE TYPE "chat_role" AS ENUM ('customer', 'vendor', 'support', 'master_admin', 'system_admin');
CREATE TYPE "message_sender_role" AS ENUM ('customer', 'vendor', 'support', 'master_admin', 'system_admin', 'system');
CREATE TYPE "message_type" AS ENUM ('text', 'image', 'file', 'product_card', 'order_card', 'system', 'internal_note');
CREATE TYPE "message_delivery_status" AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE "requester_type" AS ENUM ('customer', 'vendor');
CREATE TYPE "ticket_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "ticket_status" AS ENUM ('new', 'open', 'pending', 'on_hold', 'resolved', 'closed');
CREATE TYPE "ticket_event_type" AS ENUM ('created', 'assigned', 'status_changed', 'priority_changed', 'category_changed', 'escalated', 'note_added', 'reopened', 'resolved', 'closed');
CREATE TYPE "ticket_category_audience" AS ENUM ('customer', 'vendor', 'both');

CREATE TABLE "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "conversation_type" NOT NULL,
  "buyer_id" text,
  "vendor_id" text,
  "context_type" "conversation_context_type" DEFAULT 'general' NOT NULL,
  "context_id" text,
  "status" "conversation_status" DEFAULT 'active' NOT NULL,
  "last_message_at" timestamptz,
  "last_message_preview" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "conversations_buyer_id_idx" ON "conversations" ("buyer_id");
CREATE INDEX "conversations_vendor_id_idx" ON "conversations" ("vendor_id");
CREATE INDEX "conversations_status_last_message_idx" ON "conversations" ("status", "last_message_at");

CREATE TABLE "conversation_participants" (
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "role_in_chat" "chat_role" NOT NULL,
  "last_read_message_id" uuid,
  "muted" boolean DEFAULT false NOT NULL,
  "joined_at" timestamptz DEFAULT now() NOT NULL,
  "left_at" timestamptz,
  PRIMARY KEY ("conversation_id", "user_id")
);
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants" ("user_id");

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id" text,
  "sender_role" "message_sender_role" NOT NULL,
  "type" "message_type" DEFAULT 'text' NOT NULL,
  "body" text,
  "metadata" jsonb,
  "reply_to_message_id" uuid,
  "client_message_id" text,
  "delivery_status" "message_delivery_status" DEFAULT 'sent' NOT NULL,
  "edited_at" timestamptz,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "messages_conversation_created_idx" ON "messages" ("conversation_id", "created_at");
CREATE INDEX "messages_sender_id_idx" ON "messages" ("sender_id");
CREATE UNIQUE INDEX "messages_conversation_client_message_idx" ON "messages" ("conversation_id", "client_message_id");

CREATE TABLE "message_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "file_url" text NOT NULL,
  "type" text NOT NULL,
  "size" integer NOT NULL,
  "thumbnail_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments" ("message_id");

CREATE TABLE "tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_number" text NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "requester_id" text NOT NULL,
  "requester_type" "requester_type" NOT NULL,
  "category" text NOT NULL,
  "subject" text NOT NULL,
  "priority" "ticket_priority" DEFAULT 'normal' NOT NULL,
  "status" "ticket_status" DEFAULT 'new' NOT NULL,
  "assigned_agent_id" text,
  "related_order_id" text,
  "related_product_id" text,
  "related_vendor_id" text,
  "source_conversation_id" uuid,
  "first_response_at" timestamptz,
  "resolved_at" timestamptz,
  "closed_at" timestamptz,
  "resolution_code" text,
  "resolution_note" text,
  "csat_rating" integer,
  "csat_comment" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "tickets_ticket_number_idx" ON "tickets" ("ticket_number");
CREATE INDEX "tickets_conversation_id_idx" ON "tickets" ("conversation_id");
CREATE INDEX "tickets_requester_status_idx" ON "tickets" ("requester_id", "status");
CREATE INDEX "tickets_assigned_agent_status_idx" ON "tickets" ("assigned_agent_id", "status");
CREATE INDEX "tickets_priority_status_idx" ON "tickets" ("priority", "status");

CREATE TABLE "ticket_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "event_type" "ticket_event_type" NOT NULL,
  "actor_id" text,
  "old_value" jsonb,
  "new_value" jsonb,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "ticket_events_ticket_created_idx" ON "ticket_events" ("ticket_id", "created_at");

CREATE TABLE "ticket_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "label" text NOT NULL,
  "audience" "ticket_category_audience" DEFAULT 'both' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "ticket_categories_slug_idx" ON "ticket_categories" ("slug");
CREATE INDEX "ticket_categories_audience_active_idx" ON "ticket_categories" ("audience", "active");

CREATE TABLE "canned_replies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "category" text,
  "created_by_id" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "canned_replies_category_active_idx" ON "canned_replies" ("category", "active");

CREATE TABLE "chat_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "reporter_id" text NOT NULL,
  "reported_user_id" text,
  "message_id" uuid,
  "reason" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "chat_reports_conversation_id_idx" ON "chat_reports" ("conversation_id");
CREATE INDEX "chat_reports_reporter_id_idx" ON "chat_reports" ("reporter_id");

CREATE TABLE "blocked_users" (
  "blocker_id" text NOT NULL,
  "blocked_id" text NOT NULL,
  "reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("blocker_id", "blocked_id")
);
CREATE INDEX "blocked_users_blocked_id_idx" ON "blocked_users" ("blocked_id");

CREATE TABLE "chat_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "support_hours" jsonb DEFAULT '{}' NOT NULL,
  "auto_reply_text" text,
  "sla_targets" jsonb DEFAULT '{}' NOT NULL,
  "auto_close_days" integer DEFAULT 7 NOT NULL,
  "max_file_size" integer DEFAULT 10485760 NOT NULL,
  "allowed_file_types" text[] DEFAULT '{}' NOT NULL,
  "banned_words" text[] DEFAULT '{}' NOT NULL,
  "contact_masking_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);