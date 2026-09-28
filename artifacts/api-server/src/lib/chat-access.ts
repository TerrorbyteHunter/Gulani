import type { Request } from "express";

export type ChatUserRole =
  | "customer"
  | "vendor"
  | "support"
  | "master_admin"
  | "system_admin"
  | "operations"
  | "finance";

export type ChatPermission =
  | "chat.use"
  | "support.view_inbox"
  | "support.reply"
  | "support.assign"
  | "support.resolve"
  | "support.reopen"
  | "support.view_all_conversations"
  | "support.manage_settings"
  | "support.view_reports"
  | "support.manage_canned_replies";

export interface ChatActor {
  id: string;
  role: ChatUserRole;
  vendorId?: string;
}

const permissions: Record<ChatUserRole, ChatPermission[]> = {
  customer: ["chat.use"],
  vendor: ["chat.use"],
  support: [
    "chat.use",
    "support.view_inbox",
    "support.reply",
    "support.assign",
    "support.resolve",
    "support.reopen",
  ],
  master_admin: [
    "chat.use",
    "support.view_inbox",
    "support.reply",
    "support.assign",
    "support.resolve",
    "support.reopen",
    "support.view_all_conversations",
    "support.manage_settings",
    "support.view_reports",
    "support.manage_canned_replies",
  ],
  system_admin: [
    "chat.use",
    "support.view_inbox",
    "support.reply",
    "support.assign",
    "support.resolve",
    "support.reopen",
    "support.view_all_conversations",
    "support.manage_settings",
    "support.view_reports",
    "support.manage_canned_replies",
  ],
  operations: ["chat.use", "support.view_inbox", "support.reply"],
  finance: ["chat.use", "support.view_inbox"],
};

const roles = new Set<ChatUserRole>([
  "customer",
  "vendor",
  "support",
  "master_admin",
  "system_admin",
  "operations",
  "finance",
]);

/**
 * Temporary adapter for the current pre-auth application.
 *
 * The production session middleware should call the same permission functions
 * with its authenticated principal. Until that exists, new chat routes require
 * these demo headers and never infer an identity from the request body.
 */
export function getChatActor(req: Request): ChatActor | null {
  const id = req.header("x-gulani-user-id")?.trim();
  const role = req.header("x-gulani-user-role")?.trim() as ChatUserRole | undefined;
  if (!id || !role || !roles.has(role)) return null;

  const vendorHeader = req.header("x-gulani-vendor-id")?.trim() || undefined;
  const vendorId = role === "vendor" ? vendorHeader || id : undefined;
  return { id, role, vendorId };
}

export function hasChatPermission(actor: ChatActor, permission: ChatPermission): boolean {
  return permissions[actor.role].includes(permission);
}

export function isStaff(actor: ChatActor): boolean {
  return ["support", "master_admin", "system_admin", "operations", "finance"].includes(actor.role);
}

export function roleForChat(actor: ChatActor): "customer" | "vendor" | "support" | "master_admin" | "system_admin" {
  if (actor.role === "operations" || actor.role === "finance") return "support";
  return actor.role;
}

export function requesterTypeForActor(actor: ChatActor): "customer" | "vendor" {
  if (actor.role === "vendor") return "vendor";
  return "customer";
}