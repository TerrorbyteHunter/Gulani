import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronRight, Headphones, MessageCircle, Paperclip, Plus, Send, UserRound } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import {
  getGetChatTicketQueryKey, getListAdminVendorsQueryKey, getListChatTicketsQueryKey, getListConversationMessagesQueryKey, getListConversationsQueryKey,
  useCreateChatTicket, useGetChatTicket, useListChatTickets, useListConversationMessages, useListConversations,
  useCreateConversation, useListAdminVendors, useMarkConversationRead, useSendChatTicketMessage, useSendConversationMessage, useUpdateChatTicket,
  type ChatConversation, type ChatMessage, type ChatTicket,
} from "@workspace/api-client-react";

const human = (value: string) => value.replaceAll("_", " ");
const date = (value?: string | null) => value ? new Date(value).toLocaleString("en-ZM", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

function EmptyChat({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"><MessageCircle className="mx-auto text-primary" size={28} /><h2 className="mt-4 font-display text-2xl font-bold">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>{action && <div className="mt-6">{action}</div>}</div>;
}

function Composer({ onSend, disabled = false, placeholder = "Write a message…" }: { onSend: (body: string) => void; disabled?: boolean; placeholder?: string }) {
  const [body, setBody] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (!body.trim() || disabled) return; onSend(body.trim()); setBody(""); };
  return <form onSubmit={submit} className="flex items-end gap-2 border-t border-border bg-background p-3"><button type="button" aria-label="Attach a file" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"><Paperclip size={17} /></button><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={1} placeholder={placeholder} className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" /><button type="submit" disabled={disabled || !body.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"><Send size={16} /></button></form>;
}

function Bubble({ message, currentUserId }: { message: ChatMessage; currentUserId: string }) {
  if (message.type === "system") return <div className="mx-auto max-w-md rounded-xl bg-secondary px-4 py-2 text-center text-xs text-muted-foreground">{message.body}</div>;
  const own = message.senderId === currentUserId;
  return <div className={`flex ${own ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${own ? "rounded-br-md bg-primary text-primary-foreground" : "bg-secondary"}`}><p>{message.deletedAt ? "This message was removed." : message.body}</p><p className={`mt-1 text-[10px] ${own ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{date(message.createdAt)}{own && <span className="ml-2"><Check size={11} className="inline" /> {message.deliveryStatus}</span>}</p></div></div>;
}

function ConversationPanel({ conversation }: { conversation: ChatConversation }) {
  const [location] = useLocation();
  const currentUserId = location.startsWith("/admin") ? "demo-admin" : location.startsWith("/vendor") ? "vendor-1001" : "demo-customer";
  const messages = useListConversationMessages(conversation.id, { query: { queryKey: getListConversationMessagesQueryKey(conversation.id), refetchInterval: 5000 } });
  const send = useSendConversationMessage();
  const read = useMarkConversationRead();
  const queryClient = useQueryClient();
  const items = messages.data?.items ?? [];
  useEffect(() => { const last = items.at(-1); if (last) read.mutate({ conversationId: conversation.id, data: { messageId: last.id } }); }, [conversation.id, items.length]);
  const submit = (body: string) => send.mutate({ conversationId: conversation.id, data: { body, clientMessageId: crypto.randomUUID() } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListConversationMessagesQueryKey(conversation.id) }) });
  const title = conversation.type === "buyer_vendor" || conversation.type === "vendor_support"
    ? `Vendor ${conversation.vendorId ?? "seller"}`
    : location.startsWith("/admin") ? `Customer ${conversation.buyerId ?? ""}` : "Gulani Support";
  return <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card"><header className="flex items-center gap-3 border-b border-border p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{title}</p><p className="mt-1 truncate text-[11px] capitalize text-muted-foreground">{human(conversation.contextType)}{conversation.contextId ? ` · ${conversation.contextId}` : ""} conversation · {conversation.status}</p></div></header><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.isLoading ? <p className="text-center text-sm text-muted-foreground">Loading messages…</p> : items.length ? items.map((message) => <Bubble key={message.id} message={message} currentUserId={currentUserId} />) : <p className="py-16 text-center text-sm text-muted-foreground">Start the conversation.</p>}</div>{conversation.status === "closed" ? <div className="border-t border-border bg-secondary p-4 text-center text-xs text-muted-foreground">This conversation is closed.</div> : <Composer onSend={submit} disabled={send.isPending} />}</section>;
}

function ConversationList({ selectedId, onSelect }: { selectedId?: string; onSelect?: (conversationId: string) => void }) {
  const query = useListConversations(undefined, { query: { queryKey: getListConversationsQueryKey(), refetchInterval: 5000 } });
  return <div className="space-y-2">{(query.data ?? []).map((conversation) => {
    const title = conversation.type === "buyer_vendor" || conversation.type === "vendor_support"
      ? `Vendor ${conversation.vendorId ?? "seller"}`
      : conversation.buyerId ? `Customer ${conversation.buyerId}` : "Gulani Support";
    const className = `flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedId === conversation.id ? "border-primary bg-primary/5" : "border-transparent bg-card hover:border-border"}`;
    const content = <><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{conversation.lastMessagePreview || "No messages yet"}</span></span>{conversation.unreadCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 font-mono text-[10px]">{conversation.unreadCount}</span>}</>;
    return onSelect
      ? <button key={conversation.id} type="button" data-testid={`button-conversation-${conversation.id}`} onClick={() => onSelect(conversation.id)} className={className}>{content}</button>
      : <Link key={conversation.id} href={`/messages/${conversation.id}`} data-testid={`link-conversation-${conversation.id}`} className={className}>{content}</Link>;
  })}{!query.isLoading && !query.data?.length && <p className="rounded-xl bg-card p-5 text-sm text-muted-foreground">No conversations yet.</p>}</div>;
}

export function MessagesPage() {
  const { id } = useParams<{ id?: string }>();
  const query = useListConversations(undefined, { query: { queryKey: getListConversationsQueryKey(), refetchInterval: 5000 } });
  const selected = query.data?.find((conversation) => conversation.id === id);
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Your conversations</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">Messages</h1><p className="mt-2 text-sm text-muted-foreground">Talk to sellers and keep Gulani support close.</p></div><Link href="/support" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground"><Headphones size={15} /> Contact support</Link></div><div className="grid gap-5 lg:grid-cols-[340px_1fr]"><aside><ConversationList selectedId={id} /></aside>{selected ? <ConversationPanel conversation={selected} /> : <EmptyChat title="Choose a conversation" copy="Select a seller or support conversation to see the full thread." />}</div></div>;
}

export function OperationsMessagesPage() {
  const queryClient = useQueryClient();
  const conversations = useListConversations(undefined, { query: { queryKey: getListConversationsQueryKey(), refetchInterval: 5000 } });
  const vendors = useListAdminVendors(undefined, { query: { queryKey: getListAdminVendorsQueryKey(), staleTime: 30000 } });
  const create = useCreateConversation();
  const [selectedId, setSelectedId] = useState<string>();
  const [createdConversation, setCreatedConversation] = useState<ChatConversation | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [recipientType, setRecipientType] = useState<"vendor" | "customer">("vendor");
  const [recipientId, setRecipientId] = useState("vendor-1001");
  const [initialMessage, setInitialMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedId && conversations.data?.[0]) setSelectedId(conversations.data[0].id);
  }, [conversations.data, selectedId]);

  const startConversation = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const message = initialMessage.trim();
    if (!recipientId || !message) return;
    create.mutate({
      data: {
        type: recipientType === "vendor" ? "vendor_support" : "customer_support",
        ...(recipientType === "vendor" ? { vendorId: recipientId } : { recipientId }),
        contextType: "general",
        initialMessage: message,
      },
    }, {
      onSuccess: (conversation) => {
        setCreatedConversation(conversation);
        setSelectedId(conversation.id);
        setInitialMessage("");
        setShowComposer(false);
        void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
      onError: () => setError("We could not start that conversation. Check the recipient and try again."),
    });
  };

  const selected = conversations.data?.find((conversation) => conversation.id === selectedId)
    ?? (createdConversation?.id === selectedId ? createdConversation : undefined);
  const vendorOptions = vendors.data ?? [];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Customer and vendor conversations</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">Messages</h2><p className="mt-2 text-sm text-muted-foreground">Review marketplace threads or start a new conversation from operations.</p></div>
      <button type="button" data-testid="button-new-operations-message" onClick={() => { setShowComposer(value => !value); setError(""); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground"><Plus size={15} /> New message</button>
    </div>
    {showComposer && <form onSubmit={startConversation} className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[.7fr_1fr_1.5fr_auto] sm:items-end">
      <label className="grid gap-2 text-xs font-bold">Send to<select data-testid="select-message-recipient-type" value={recipientType} onChange={event => { const next = event.target.value as "vendor" | "customer"; setRecipientType(next); setRecipientId(next === "vendor" ? vendorOptions[0]?.id ?? "" : "demo-customer"); }} className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal"><option value="vendor">A vendor</option><option value="customer">A customer</option></select></label>
      <label className="grid gap-2 text-xs font-bold">Recipient<select data-testid="select-message-recipient" value={recipientId} onChange={event => setRecipientId(event.target.value)} disabled={recipientType === "vendor" && vendors.isLoading} className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal disabled:opacity-60">{recipientType === "vendor" ? vendorOptions.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.businessName} · {vendor.contactName}</option>) : <option value="demo-customer">Current demo shopper</option>}</select></label>
      <label className="grid gap-2 text-xs font-bold">First message<textarea data-testid="input-new-message-body" required minLength={1} maxLength={4000} rows={2} value={initialMessage} onChange={event => setInitialMessage(event.target.value)} placeholder="Write the first message in this thread…" className="resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-primary" /></label>
      <button type="submit" data-testid="button-start-message-thread" disabled={create.isPending || !recipientId || !initialMessage.trim() || vendors.isError} className="h-11 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50">{create.isPending ? "Starting…" : "Start thread"}</button>
      {recipientType === "customer" && <p className="text-xs text-muted-foreground sm:col-span-4">Customer selection currently uses the seeded demo shopper; customer-specific accounts will need to replace this when sign-in is added.</p>}
      {vendors.isError && recipientType === "vendor" && <p role="alert" className="text-xs text-destructive sm:col-span-4">Vendor contacts could not be loaded. Retry the page before starting a thread.</p>}
      {error && <p role="alert" data-testid="status-message-create-error" className="text-xs text-destructive sm:col-span-4">{error}</p>}
    </form>}
    {conversations.isError ? <EmptyChat title="Messages could not be loaded" copy="Retry the page to reload the operations inbox." /> : <div className="grid gap-5 lg:grid-cols-[340px_1fr]"><aside><ConversationList selectedId={selectedId} onSelect={setSelectedId} /></aside>{selected ? <ConversationPanel conversation={selected} /> : <EmptyChat title="No conversation selected" copy="Choose a thread or start a new message to open a conversation." />}</div>}
  </div>;
}

export function SupportPage() {
  const tickets = useListChatTickets(undefined, { query: { queryKey: getListChatTicketsQueryKey(), refetchInterval: 10000 } });
  const create = useCreateChatTicket();
  const [form, setForm] = useState({ category: "order", subject: "", message: "", priority: "normal" as const });
  const [sent, setSent] = useState<ChatTicket | null>(null);
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate({ data: { ...form, clientMessageId: crypto.randomUUID() } }, { onSuccess: (ticket) => { setSent(ticket); tickets.refetch(); } }); };
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-8"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Gulani care</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">Support tickets</h1><p className="mt-2 text-sm text-muted-foreground">Open a ticket and keep the whole resolution in one thread.</p></div>{sent && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><Check className="mt-0.5 shrink-0 text-primary" size={18} /><div><p className="font-bold">Ticket {sent.ticketNumber} is open</p><p className="mt-1 text-muted-foreground">A support agent will reply here. <Link href={`/support/${sent.id}`} className="font-bold text-primary">View ticket</Link></p></div></div>}<div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]"><section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><h2 className="font-display text-2xl font-bold">Start with the details</h2><form onSubmit={submit} className="mt-6 grid gap-4"><label className="grid gap-2 text-xs font-bold">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal"><option value="order">Order issue</option><option value="payment">Payment issue</option><option value="delivery">Delivery</option><option value="refund">Refund or return</option><option value="product">Product issue</option><option value="account">Account</option><option value="other">Other</option></select></label><label className="grid gap-2 text-xs font-bold">Subject<input required minLength={3} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal outline-none focus:border-primary" /></label><label className="grid gap-2 text-xs font-bold">What can we help with?<textarea required minLength={5} rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm font-normal outline-none focus:border-primary" /></label><button disabled={create.isPending} className="rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{create.isPending ? "Opening ticket…" : "Open support ticket"} <ChevronRight size={16} className="ml-1 inline" /></button></form></section><section><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-bold">Your tickets</h2><span className="text-xs text-muted-foreground">{tickets.data?.length ?? 0} total</span></div>{tickets.isLoading ? <p className="rounded-xl bg-secondary p-5 text-sm">Loading tickets…</p> : tickets.data?.length ? <div className="space-y-3">{tickets.data.map((ticket) => <Link key={ticket.id} href={`/support/${ticket.id}`} className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/40"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">{ticket.ticketNumber}</p><h3 className="mt-2 font-display text-xl font-bold">{ticket.subject}</h3></div><span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold capitalize text-accent">{human(ticket.status)}</span></div><p className="mt-3 text-xs text-muted-foreground">{human(ticket.category)} · updated {date(ticket.updatedAt)}</p></Link>)}</div> : <EmptyChat title="No tickets yet" copy="If you need a hand, open your first support ticket here." />}</section></div></div>;
}

export function TicketPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [location] = useLocation();
  const currentUserId = location.startsWith("/admin") ? "demo-admin" : location.startsWith("/vendor") ? "vendor-1001" : "demo-customer";
  const ticket = useGetChatTicket(id, { query: { queryKey: getGetChatTicketQueryKey(id), refetchInterval: 10000 } });
  const t = ticket.data;
  const messages = useListConversationMessages(t?.conversationId ?? "", { query: { queryKey: getListConversationMessagesQueryKey(t?.conversationId ?? ""), enabled: !!t?.conversationId, refetchInterval: 5000 } });
  const send = useSendChatTicketMessage();
  const reopen = useUpdateChatTicket();
  const queryClient = useQueryClient();
  if (ticket.isLoading) return <div className="mx-auto max-w-3xl px-4 py-14 text-center text-sm text-muted-foreground">Loading ticket…</div>;
  if (ticket.isError || !t) return <div className="mx-auto max-w-3xl px-4 py-14"><EmptyChat title="Ticket not found" copy="This ticket may no longer be available." /></div>;
  const submit = (body: string) => send.mutate({ ticketId: t.id, data: { body, clientMessageId: crypto.randomUUID() } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListConversationMessagesQueryKey(t.conversationId) }) });
  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/support" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={15} /> Back to support</Link><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">{t.ticketNumber} · {human(t.category)}</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em]">{t.subject}</h1></div><div className="flex items-center gap-2"><span className="rounded-full bg-accent/15 px-3 py-1.5 text-xs font-bold capitalize text-accent">{human(t.status)}</span>{["resolved", "closed"].includes(t.status) && <button onClick={() => reopen.mutate({ ticketId: t.id, data: { status: "open" } })} className="rounded-xl border border-primary/30 px-3 py-2 text-xs font-bold text-primary">Reopen</button>}</div></div><section className="flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-border bg-card"><div className="flex-1 space-y-3 overflow-y-auto p-4">{(messages.data?.items ?? []).map((message) => <Bubble key={message.id} message={message} currentUserId={currentUserId} />)}</div>{t.status === "closed" ? <div className="border-t border-border bg-secondary p-4 text-center text-xs text-muted-foreground">Closed tickets are read-only.</div> : <Composer onSend={submit} disabled={send.isPending} placeholder="Reply to Gulani Support…" />}</section></div>;
}