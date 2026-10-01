import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  Filter,
  Globe2,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tags,
  Truck,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  getGetAdminDashboardQueryKey,
  getGetAdminSettingsQueryKey,
  getGetFulfillmentOverviewQueryKey,
  getGetSalesOverviewQueryKey,
  getListAdminOrdersQueryKey,
  getListAdminVendorApplicationsQueryKey,
  getListAdminVendorsQueryKey,
  getListPricingRulesQueryKey,
  getListProductsQueryKey,
  getListSupportAccountsQueryKey,
  getListSupportTicketsQueryKey,
  getListVendorPromotionsQueryKey,
  getListVendorReviewsQueryKey,
  useCreateSupportAccount,
  useGetAdminDashboard,
  useGetAdminSettings,
  useGetFulfillmentOverview,
  useGetSalesOverview,
  useListAdminOrders,
  useListAdminVendorApplications,
  useListAdminVendors,
  useListCategories,
  useListPricingRules,
  useListProducts,
  useListSupportAccounts,
  useListSupportTickets,
  useListVendorPromotions,
  useListVendorReviews,
  useUpdateAdminOrderStatus,
  useUpdateAdminSettings,
  useUpdateAdminVendor,
  useUpdatePricingRule,
  useUpdateSupportAccount,
  useUpdateSupportTicket,
  useUpdateVendorApplicationStatus,
} from '@workspace/api-client-react';
import { OperationsMessagesPage } from '@/pages/chat-workspace';
import type {
  AdminOrder,
  AdminVendor,
  AdminVendorApplication,
  MarketplaceSettings,
  PricingRule,
  Product,
  SupportAccount,
  SupportTicket,
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

const money = (value: number, currency = 'ZMW') =>
  `${currency} ${Number(value || 0).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateLabel = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-ZM', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not recorded';

const orderStatuses = [
  'PLACED',
  'PAYMENT_CONFIRMED',
  'PACKED',
  'SOURCING',
  'PURCHASED_FROM_SUPPLIER',
  'IN_TRANSIT',
  'CUSTOMS_CLEARANCE',
  'RECEIVED_LOCAL_WAREHOUSE',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

const sectionMeta: Record<string, { label: string; eyebrow: string; description: string; icon: IconType }> = {
  dashboard: { label: 'Operations dashboard', eyebrow: 'Control room', description: 'Make the next careful decision before the day gets noisy.', icon: LayoutDashboard },
  orders: { label: 'Order desk', eyebrow: 'Commerce flow', description: 'Every order, status change, and delivery promise in one queue.', icon: ShoppingBag },
  products: { label: 'Product oversight', eyebrow: 'Catalog health', description: 'Keep local assortment and imported inventory accurate and sellable.', icon: Package },
  vendors: { label: 'Vendor desk', eyebrow: 'Partner network', description: 'Review applications, KYC signals, performance, and account access.', icon: Store },
  customers: { label: 'Customer view', eyebrow: 'Relationship signals', description: 'Derived from order activity so the team can spot customers who need care.', icon: Users },
  sourcing: { label: 'Sourcing control', eyebrow: 'Global supply', description: 'Track imported inventory, supplier handoffs, and landed-cost pressure.', icon: Globe2 },
  fulfillment: { label: 'Fulfillment room', eyebrow: 'Last mile', description: 'Move local and sourced orders through the right queue without losing context.', icon: Truck },
  finance: { label: 'Finance ledger', eyebrow: 'Money movement', description: 'Sales, commission, payouts, refunds, and exceptions that deserve review.', icon: CircleDollarSign },
  promotions: { label: 'Promotion studio', eyebrow: 'Commercial levers', description: 'Tune pricing rules and promotion inventory without guessing at margin.', icon: Tags },
  support: { label: 'Support desk', eyebrow: 'Human response', description: 'Resolve customer issues and keep the queue accountable.', icon: Headphones },
  messages: { label: 'Messages', eyebrow: 'Direct conversations', description: 'Start and manage conversations with marketplace customers and vendors.', icon: Headphones },
  moderation: { label: 'Trust & moderation', eyebrow: 'Marketplace trust', description: 'Review product feedback and keep the public shelf constructive.', icon: ShieldCheck },
  analytics: { label: 'Analytics room', eyebrow: 'Signals, not noise', description: 'Read the business from sales, customers, vendors, products, and orders.', icon: BarChart3 },
  notifications: { label: 'Notification center', eyebrow: 'Team attention', description: 'A practical inbox for alerts generated by the current operations surface.', icon: Bell },
  management: { label: 'Team management', eyebrow: 'Access & accountability', description: 'Keep support and admin access tight, visible, and current.', icon: LockKeyhole },
  settings: { label: 'Marketplace settings', eyebrow: 'System controls', description: 'Configure the commercial rules that shape every new checkout.', icon: Settings },
};

type IconType = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

const navGroups: Array<{ label: string; items: Array<{ key: string; label: string; icon: IconType }> }> = [
  {
    label: 'Run the marketplace',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'orders', label: 'Orders', icon: ShoppingBag },
      { key: 'products', label: 'Products', icon: Package },
      { key: 'vendors', label: 'Vendors', icon: Store },
      { key: 'customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Move & monetize',
    items: [
      { key: 'sourcing', label: 'Sourcing', icon: Globe2 },
      { key: 'fulfillment', label: 'Fulfillment', icon: Truck },
      { key: 'finance', label: 'Finance', icon: CircleDollarSign },
      { key: 'promotions', label: 'Promotions', icon: Tags },
    ],
  },
  {
    label: 'Protect & improve',
    items: [
      { key: 'support', label: 'Support', icon: Headphones },
      { key: 'messages', label: 'Messages', icon: Headphones },
      { key: 'moderation', label: 'Moderation', icon: ShieldCheck },
      { key: 'analytics', label: 'Analytics', icon: BarChart3 },
      { key: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { key: 'management', label: 'Team access', icon: LockKeyhole },
      { key: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-[72px] rounded-2xl" />
      ))}
    </div>
  );
}

function ErrorState({ retry, message = 'The operations feed could not be loaded.' }: { retry?: () => void; message?: string }) {
  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/10 px-6 py-10 text-center">
      <AlertCircle className="mx-auto text-accent" size={26} />
      <p className="mt-3 font-display text-lg font-bold">A live feed is unavailable</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {retry && <button type="button" onClick={retry} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">Try again</button>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, copy, action }: { icon: IconType; title: string; copy: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"><Icon size={22} /></span>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = 'primary', detail }: { label: string; value: string | number; icon: IconType; tone?: 'primary' | 'accent' | 'neutral'; detail?: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone === 'accent' ? 'bg-accent/15 text-accent' : tone === 'neutral' ? 'bg-secondary text-foreground' : 'bg-primary/10 text-primary'}`}><Icon size={17} /></span>
        <ArrowUpRight size={15} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-[-.04em] sm:text-[28px]">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const positive = ['approved', 'active', 'delivered', 'paid', 'resolved', 'completed', 'confirmed'].some(item => normalized.includes(item));
  const alert = ['failed', 'rejected', 'cancelled', 'urgent', 'suspended', 'delayed', 'disputed'].some(item => normalized.includes(item));
  return <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.1em] ${positive ? 'bg-primary/10 text-primary' : alert ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground'}`}>{value.replaceAll('_', ' ')}</span>;
}

function SectionHeader({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Live workspace</p><h2 className="mt-1 font-display text-2xl font-bold tracking-[-.04em]">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{copy}</p></div>{action}</div>;
}

function DashboardView() {
  const dashboard = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey() } });
  const sales = useGetSalesOverview({ query: { queryKey: getGetSalesOverviewQueryKey() } });
  const orders = useListAdminOrders(undefined, { query: { queryKey: getListAdminOrdersQueryKey() } });
  const applications = useListAdminVendorApplications(undefined, { query: { queryKey: getListAdminVendorApplicationsQueryKey() } });
  if (dashboard.isLoading) return <LoadingPanel rows={5} />;
  if (dashboard.isError || !dashboard.data) return <ErrorState retry={() => dashboard.refetch()} />;
  const recentOrders = (orders.data || []).slice(0, 5);
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Orders today" value={dashboard.data.ordersToday} icon={ShoppingBag} detail="Across local and sourced" />
        <Metric label="Sales today" value={money(dashboard.data.salesToday)} icon={WalletCards} tone="accent" detail="Gross marketplace sales" />
        <Metric label="Vendor applications" value={dashboard.data.pendingVendorApplications} icon={Store} detail="Waiting for a review" />
        <Metric label="Open support" value={dashboard.data.openSupportTickets} icon={Headphones} tone="neutral" detail="Needs a human response" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <SectionHeader title="Today’s operating picture" copy="Queues that can change the customer promise." action={<Link href="/admin/fulfillment" className="text-xs font-bold text-primary">Open fulfillment <ChevronRight className="inline" size={14} /></Link>} />
          <div className="grid gap-3 sm:grid-cols-2">
            {(dashboard.data.fulfillmentQueue || []).map((queue, index) => (
              <Link href="/admin/fulfillment" key={queue.label} className="rounded-xl border border-border/70 bg-secondary/45 p-4 transition-colors hover:border-primary/40">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold">{queue.label}</span><span className={`font-mono text-lg font-bold ${index === 0 ? 'text-accent' : 'text-primary'}`}>{queue.count}</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background"><div className={`h-full rounded-full ${index === 0 ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${Math.min(100, Math.max(queue.count ? 10 : 0, queue.count * 9))}%` }} /></div>
                <p className="mt-2 text-[11px] text-muted-foreground">Review queue</p>
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary-foreground/60">Signal check</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-[-.04em]">Keep the promise.</h2>
          <p className="mt-2 text-sm leading-6 text-primary-foreground/70">A clear queue is a kind of customer service. Start with the item closest to a missed promise.</p>
          <div className="mt-7 space-y-2">
            <Link href="/admin/vendors" className="flex items-center justify-between rounded-xl bg-background/10 px-3 py-3 text-sm font-bold transition-colors hover:bg-background/15"><span>{applications.data?.filter(item => item.status === 'pending').length ?? dashboard.data.pendingVendorApplications} pending applications</span><ChevronRight size={15} /></Link>
            <Link href="/admin/finance" className="flex items-center justify-between rounded-xl bg-background/10 px-3 py-3 text-sm font-bold transition-colors hover:bg-background/15"><span>{sales.data ? money(sales.data.commission) : 'Commission'} earned</span><ChevronRight size={15} /></Link>
          </div>
        </section>
      </div>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <SectionHeader title="Latest orders" copy="The five most recent records from the live admin order feed." action={<Link href="/admin/orders" className="text-xs font-bold text-primary">View all orders <ChevronRight className="inline" size={14} /></Link>} />
        {orders.isLoading ? <LoadingPanel rows={3} /> : orders.isError ? <ErrorState retry={() => orders.refetch()} /> : recentOrders.length ? <OrderTable orders={recentOrders} compact /> : <EmptyState icon={ShoppingBag} title="No orders in the feed" copy="When customers check out, their orders will appear here." />}
      </section>
    </div>
  );
}

function OrderTable({ orders, compact = false }: { orders: AdminOrder[]; compact?: boolean }) {
  const update = useUpdateAdminOrderStatus();
  const { toast } = useToast();
  const refresh = useListAdminOrders(undefined, { query: { queryKey: getListAdminOrdersQueryKey(), enabled: false } });
  const changeStatus = (order: AdminOrder, status: string) => {
    update.mutate({ orderId: order.id, data: { status: status as typeof orderStatuses[number] } }, {
      onSuccess: () => { refresh.refetch(); toast({ title: 'Order status updated', description: `${order.orderNumber} is now ${status.replaceAll('_', ' ').toLowerCase()}.` }); },
      onError: () => toast({ title: 'Could not update order', description: 'The status was not changed.', variant: 'destructive' }),
    });
  };
  return <div className="overflow-x-auto rounded-xl border border-border"><div className="min-w-[720px]"><div className="grid grid-cols-[1.1fr_1.2fr_.72fr_.85fr_1.25fr] gap-4 border-b border-border bg-secondary/50 px-4 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground"><span>Order</span><span>Customer / vendor</span><span>Route</span><span>Total</span><span>Decision</span></div>{orders.map(order => <div key={order.id} className="grid grid-cols-[1.1fr_1.2fr_.72fr_.85fr_1.25fr] items-center gap-4 border-b border-border p-4 last:border-0"><div><p className="font-mono text-xs font-bold">{order.orderNumber}</p><p className="mt-1 text-[11px] text-muted-foreground">{dateLabel(order.placedAt)} · {order.itemCount} items</p></div><div><p className="text-sm font-bold">{order.customerName}</p><p className="mt-1 text-[11px] text-muted-foreground">{order.vendorName}</p></div><StatusPill value={order.fulfillment} /><p className="font-mono text-xs font-bold">{money(order.total, order.currency)}</p><select aria-label={`Update ${order.orderNumber} status`} disabled={update.isPending} value={order.status} onChange={event => changeStatus(order, event.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-[11px] font-semibold outline-none focus:border-primary">{!orderStatuses.includes(order.status as typeof orderStatuses[number]) && <option value={order.status}>{order.status.replaceAll('_', ' ')}</option>}{orderStatuses.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></div>)}</div></div>;
}

function OrdersView() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const orders = useListAdminOrders({ search: search || undefined, status: status || undefined }, { query: { queryKey: getListAdminOrdersQueryKey({ search: search || undefined, status: status || undefined }) } });
  const visible = (orders.data || []).filter(order => `${order.orderNumber} ${order.customerName} ${order.vendorName}`.toLowerCase().includes(search.toLowerCase()));
  return <div><div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Search size={16} className="text-muted-foreground" /><input aria-label="Search orders" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order, customer or vendor" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Filter size={15} className="text-muted-foreground" /><select aria-label="Filter order status" value={status} onChange={event => setStatus(event.target.value)} className="h-11 bg-transparent text-sm outline-none"><option value="">All statuses</option>{orderStatuses.map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label><button type="button" onClick={() => orders.refetch()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-xs font-bold hover:border-primary hover:text-primary"><RefreshCw size={14} /> Refresh</button></div>{orders.isLoading ? <LoadingPanel /> : orders.isError ? <ErrorState retry={() => orders.refetch()} /> : visible.length ? <OrderTable orders={visible} /> : <EmptyState icon={ShoppingBag} title="No orders match that view" copy="Try a broader search or clear the status filter." />}</div>;
}

function ProductsView() {
  const products = useListProducts({ limit: 50 }, { query: { queryKey: getListProductsQueryKey({ limit: 50 }) } });
  const categories = useListCategories();
  const [search, setSearch] = useState('');
  const visible = (products.data || []).filter(product => `${product.title} ${product.vendorName} ${product.category}`.toLowerCase().includes(search.toLowerCase()));
  const lowStock = visible.filter(product => (product.variants?.[0]?.stockQty ?? 0) < 5);
  return <div><div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Search size={16} className="text-muted-foreground" /><input aria-label="Search products" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search product, vendor or category" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><span className="flex items-center justify-center rounded-xl bg-secondary px-4 text-xs font-semibold text-muted-foreground">{categories.data?.length ?? 0} categories · {lowStock.length} low stock</span></div>{products.isLoading ? <LoadingPanel /> : products.isError ? <ErrorState retry={() => products.refetch()} /> : visible.length ? <div className="overflow-x-auto rounded-2xl border border-border bg-card"><div className="min-w-[760px]"><div className="grid grid-cols-[1.4fr_1fr_.8fr_.8fr_.8fr] gap-4 border-b border-border bg-secondary/50 px-5 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground"><span>Product</span><span>Vendor</span><span>Source</span><span>Price</span><span>Stock</span></div>{visible.map(product => <ProductRow key={product.id} product={product} />)}</div></div> : <EmptyState icon={Package} title="Catalog is quiet" copy="No products match this search." />}</div>;
}

function ProductRow({ product }: { product: Product }) {
  const stock = product.variants?.[0]?.stockQty ?? 0;
  return <div className="grid grid-cols-[1.4fr_1fr_.8fr_.8fr_.8fr] items-center gap-4 border-b border-border p-5 last:border-0"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Package size={17} /></div><div><p className="text-sm font-bold">{product.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{product.category} · {product.variants?.length ?? 0} variants</p></div></div><p className="text-xs font-semibold">{product.vendorName}</p><StatusPill value={product.fulfillment} /><p className="font-mono text-xs font-bold">{money(product.price, product.currency)}</p><div><p className={`font-mono text-xs font-bold ${stock < 5 ? 'text-accent' : 'text-primary'}`}>{stock} units</p><p className="mt-1 text-[10px] text-muted-foreground">{stock < 5 ? 'Review stock' : 'Healthy'}</p></div></div>;
}

function VendorsView() {
  const applications = useListAdminVendorApplications(undefined, { query: { queryKey: getListAdminVendorApplicationsQueryKey() } });
  const vendors = useListAdminVendors(undefined, { query: { queryKey: getListAdminVendorsQueryKey() } });
  const updateApplication = useUpdateVendorApplicationStatus();
  const updateVendor = useUpdateAdminVendor();
  const { toast } = useToast();
  const [tab, setTab] = useState<'applications' | 'active' | 'suspended'>('applications');
  const changeApplication = (application: AdminVendorApplication, status: 'pending' | 'approved' | 'rejected') => updateApplication.mutate({ applicationId: application.id, data: { status } }, { onSuccess: () => { applications.refetch(); toast({ title: `Application ${status}`, description: application.businessName }); }, onError: () => toast({ title: 'Could not update application', variant: 'destructive' }) });
  const toggleVendor = (vendor: AdminVendor) => updateVendor.mutate({ vendorId: vendor.id, data: { accountStatus: vendor.accountStatus === 'active' ? 'suspended' : 'active' } }, { onSuccess: () => { vendors.refetch(); toast({ title: 'Vendor account updated', description: vendor.businessName }); } });
  return <div><div className="mb-5 flex flex-wrap gap-2">{(['applications', 'active', 'suspended'] as const).map(item => <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition-colors ${tab === item ? 'bg-primary text-primary-foreground' : 'border border-border bg-card hover:border-primary'}`}>{item} {item === 'applications' ? applications.data?.filter(v => v.status === 'pending').length ?? '' : vendors.data?.filter(v => v.accountStatus === item).length ?? ''}</button>)}</div>{tab === 'applications' ? applications.isLoading ? <LoadingPanel /> : applications.isError ? <ErrorState retry={() => applications.refetch()} /> : applications.data?.length ? <div className="grid gap-4 lg:grid-cols-2">{applications.data.map(application => <article key={application.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-lg font-bold">{application.businessName}</h3><p className="mt-1 text-xs text-muted-foreground">{application.category} · submitted {dateLabel(application.submittedAt)}</p></div><StatusPill value={application.status} /></div><div className="mt-4 space-y-2 text-xs"><p><strong>{application.contactName}</strong> · {application.email}</p><p className="text-muted-foreground">{application.description}</p></div><div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">{application.status !== 'approved' && <button type="button" disabled={updateApplication.isPending} onClick={() => changeApplication(application, 'approved')} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Approve</button>}{application.status !== 'rejected' && <button type="button" disabled={updateApplication.isPending} onClick={() => changeApplication(application, 'rejected')} className="rounded-lg border border-accent/40 px-3 py-2 text-xs font-bold text-accent">Reject</button>}{application.status !== 'pending' && <button type="button" onClick={() => changeApplication(application, 'pending')} className="rounded-lg border border-border px-3 py-2 text-xs font-bold">Return to review</button>}</div></article>)}</div> : <EmptyState icon={FileCheck2} title="No applications waiting" copy="New vendor applications will appear here for review." /> : vendors.isLoading ? <LoadingPanel /> : vendors.isError ? <ErrorState retry={() => vendors.refetch()} /> : <div className="overflow-x-auto rounded-2xl border border-border bg-card"><div className="min-w-[780px]"><div className="grid grid-cols-[1.35fr_1fr_.85fr_.7fr_.95fr_.8fr] gap-4 border-b border-border bg-secondary/50 px-5 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground"><span>Vendor</span><span>Contact</span><span>KYC</span><span>Catalog</span><span>Orders</span><span>Access</span></div>{(vendors.data || []).filter(vendor => vendor.accountStatus === tab).map(vendor => <div key={vendor.id} className="grid grid-cols-[1.35fr_1fr_.85fr_.7fr_.95fr_.8fr] items-center gap-4 border-b border-border p-5 last:border-0"><div><p className="text-sm font-bold">{vendor.businessName}</p><p className="mt-1 text-[11px] text-muted-foreground">{vendor.category} · joined {dateLabel(vendor.joinedAt)}</p></div><p className="text-xs">{vendor.contactName}<br /><span className="text-muted-foreground">{vendor.email}</span></p><StatusPill value={vendor.verificationStatus} /><p className="font-mono text-xs">{vendor.productCount}</p><p className="font-mono text-xs">{vendor.orderCount}</p><button type="button" disabled={updateVendor.isPending} onClick={() => toggleVendor(vendor)} className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold hover:border-accent hover:text-accent">{vendor.accountStatus === 'active' ? 'Suspend' : 'Restore'}</button></div>)}</div></div>}</div>;
}

function CustomersView() {
  const orders = useListAdminOrders(undefined, { query: { queryKey: getListAdminOrdersQueryKey() } });
  const { toast } = useToast();
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; spend: number; last: string; vendors: Set<string> }>();
    (orders.data || []).forEach(order => { const current = map.get(order.customerName) || { name: order.customerName, orders: 0, spend: 0, last: order.placedAt, vendors: new Set<string>() }; current.orders += 1; current.spend += order.total; current.last = new Date(order.placedAt) > new Date(current.last) ? order.placedAt : current.last; current.vendors.add(order.vendorName); map.set(order.customerName, current); });
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [orders.data]);
  if (orders.isLoading) return <LoadingPanel />;
  if (orders.isError) return <ErrorState retry={() => orders.refetch()} />;
  return <div><div className="mb-5 flex items-center justify-between"><div className="rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground"><strong className="font-mono text-foreground">{customers.length}</strong> customer profiles derived from live order records.</div><span className="font-mono text-xs text-muted-foreground">Derived view</span></div>{customers.length ? <div className="overflow-x-auto rounded-2xl border border-border bg-card"><div className="min-w-[700px]"><div className="grid grid-cols-[1.4fr_.8fr_1fr_1fr_.9fr] gap-4 border-b border-border bg-secondary/50 px-5 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground"><span>Customer</span><span>Orders</span><span>Spend</span><span>Last order</span><span>Reach</span></div>{customers.map(customer => <div key={customer.name} className="grid grid-cols-[1.4fr_.8fr_1fr_1fr_.9fr] items-center gap-4 border-b border-border p-5 last:border-0"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound size={16} /></span><div><p className="text-sm font-bold">{customer.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{customer.vendors.size} vendor relationships</p></div></div><p className="font-mono text-sm">{customer.orders}</p><p className="font-mono text-sm font-bold">{money(customer.spend)}</p><p className="text-xs text-muted-foreground">{dateLabel(customer.last)}</p><button type="button" onClick={() => toast({ title: 'Customer activity', description: `${customer.name} has ${customer.orders} order${customer.orders === 1 ? '' : 's'} totaling ${money(customer.spend)}.` })} className="inline-flex items-center gap-1 text-xs font-bold text-primary">View activity <ChevronRight size={14} /></button></div>)}</div></div> : <EmptyState icon={Users} title="No customer activity yet" copy="Customer profiles will be derived from completed orders." />}</div>;
}

function SourcingView() {
  const products = useListProducts({ limit: 50 }, { query: { queryKey: getListProductsQueryKey({ limit: 50 }) } });
  const orders = useListAdminOrders({ status: 'SOURCING' }, { query: { queryKey: getListAdminOrdersQueryKey({ status: 'SOURCING' }) } });
  const sourced = (products.data || []).filter(product => product.fulfillment === 'sourced');
  const queue = orders.data || [];
  return <div className="space-y-6"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Imported products" value={sourced.length} icon={Globe2} detail="Live catalog records" /><Metric label="Sourcing queue" value={queue.length} icon={ClipboardList} tone="accent" detail="Orders awaiting supplier action" /><Metric label="Supplier orders" value={Math.max(0, queue.length - 1)} icon={Boxes} detail="Derived from sourcing status" /><Metric label="Sync health" value="Live" icon={RefreshCw} tone="neutral" detail="No separate sync endpoint" /></div><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><SectionHeader title="Sourcing queue" copy="Real orders currently carrying the sourcing status." action={<span className="rounded-full bg-secondary px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">Live order feed</span>} />{orders.isLoading ? <LoadingPanel rows={3} /> : orders.isError ? <ErrorState retry={() => orders.refetch()} /> : queue.length ? <OrderTable orders={queue} /> : <EmptyState icon={ClipboardList} title="No sourcing decisions waiting" copy="Sourced orders will land here when a supplier handoff is needed." />}</section><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><SectionHeader title="Imported inventory" copy="Products marked as sourced in the marketplace catalog." />{products.isLoading ? <LoadingPanel rows={3} /> : sourced.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sourced.slice(0, 9).map(product => <div key={product.id} className="rounded-xl border border-border/70 bg-secondary/35 p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">{product.title}</p><StatusPill value={product.source || 'supplier'} /></div><div className="mt-4 flex items-center justify-between text-xs"><span className="text-muted-foreground">{product.vendorName}</span><strong className="font-mono">{money(product.basePrice ?? product.price, product.currency)}</strong></div></div>)}</div> : <EmptyState icon={Globe2} title="No imported inventory" copy="Sourced catalog records will appear when available." />}</section></div>;
}

function FulfillmentView() {
  const fulfillment = useGetFulfillmentOverview({ query: { queryKey: getGetFulfillmentOverviewQueryKey() } });
  const update = useUpdateAdminOrderStatus();
  if (fulfillment.isLoading) return <LoadingPanel rows={5} />;
  if (fulfillment.isError || !fulfillment.data) return <ErrorState retry={() => fulfillment.refetch()} />;
  return <div className="space-y-6"><div className="grid grid-cols-3 gap-3"><Metric label="Sourced" value={fulfillment.data.sourcedOrders} icon={Globe2} /><Metric label="Local" value={fulfillment.data.localOrders} icon={Store} tone="neutral" /><Metric label="Delayed" value={fulfillment.data.delayedOrders} icon={AlertCircle} tone="accent" /></div><div className="grid gap-4 lg:grid-cols-2">{fulfillment.data.queues.map(queue => <section key={queue.status} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">{queue.status}</p><h2 className="mt-1 font-display text-xl font-bold">{queue.label}</h2></div><span className="grid h-9 min-w-9 place-items-center rounded-full bg-secondary px-2 font-mono text-sm font-bold text-primary">{queue.count}</span></div>{queue.orders.length ? <div className="mt-5 space-y-2">{queue.orders.map(order => <div key={order.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/50 p-3"><div className="min-w-[130px] flex-1"><p className="font-mono text-xs font-bold">{order.orderNumber}</p><p className="mt-1 text-[11px] text-muted-foreground">{order.customerName} · {order.vendorName}</p></div><strong className="font-mono text-xs">{money(order.total, order.currency)}</strong><button type="button" disabled={update.isPending} onClick={() => { const current = orderStatuses.indexOf(order.status as typeof orderStatuses[number]); const next = orderStatuses[Math.min(current + 1, orderStatuses.length - 1)]; update.mutate({ orderId: order.id, data: { status: next } }, { onSuccess: () => fulfillment.refetch() }); }} className="rounded-lg border border-primary/30 px-3 py-2 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground">Advance</button></div>)}</div> : <p className="mt-5 rounded-xl bg-secondary/45 p-4 text-xs text-muted-foreground">Queue is clear. Keep an eye on the next handoff.</p>}</section>)}</div></div>;
}

function FinanceView() {
  const sales = useGetSalesOverview({ query: { queryKey: getGetSalesOverviewQueryKey() } });
  const orders = useListAdminOrders(undefined, { query: { queryKey: getListAdminOrdersQueryKey() } });
  if (sales.isLoading) return <LoadingPanel rows={4} />;
  if (sales.isError || !sales.data) return <ErrorState retry={() => sales.refetch()} />;
  const failed = (orders.data || []).filter(order => ['FAILED', 'CANCELLED'].includes(order.status)).length;
  const max = Math.max(...sales.data.byDay.map(day => day.sales), 1);
  return <div className="space-y-6"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Gross sales" value={money(sales.data.totalSales)} icon={CircleDollarSign} tone="accent" /><Metric label="Orders" value={sales.data.totalOrders} icon={ShoppingBag} /><Metric label="Average order" value={money(sales.data.averageOrderValue)} icon={WalletCards} /><Metric label="Commission" value={money(sales.data.commission)} icon={Percent} /></div><div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><SectionHeader title="Sales rhythm" copy="Seven-day sales overview from the finance endpoint." /><div className="flex h-56 items-end gap-2 sm:gap-4">{sales.data.byDay.map(day => <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="font-mono text-[9px] text-muted-foreground">{day.sales ? `${(day.sales / 1000).toFixed(1)}k` : '—'}</span><div className="flex h-40 w-full items-end rounded-t-lg bg-secondary"><div className="w-full rounded-t-lg bg-primary transition-[height] duration-500" style={{ height: `${day.sales ? Math.max(8, day.sales / max * 100) : 0}%` }} /></div><span className="font-mono text-[10px] text-muted-foreground">{day.label}</span></div>)}</div></section><section className="rounded-2xl bg-secondary p-5 sm:p-6"><SectionHeader title="Reconciliation watch" copy="Exceptions are derived from the live order feed." /><div className="space-y-3"><div className="flex items-center justify-between rounded-xl bg-background/70 p-4"><span className="text-sm font-semibold">Failed or cancelled</span><strong className="font-mono text-accent">{failed}</strong></div><div className="flex items-center justify-between rounded-xl bg-background/70 p-4"><span className="text-sm font-semibold">Platform commission</span><strong className="font-mono text-primary">{money(sales.data.commission)}</strong></div><div className="flex items-center justify-between rounded-xl bg-background/70 p-4"><span className="text-sm font-semibold">Refund workflow</span><span className="text-xs text-muted-foreground">Review in orders</span></div></div></section></div></div>;
}

function PromotionsView() {
  const rules = useListPricingRules({ query: { queryKey: getListPricingRulesQueryKey() } });
  const promotions = useListVendorPromotions({ query: { queryKey: getListVendorPromotionsQueryKey() } });
  const update = useUpdatePricingRule();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const saveRule = (rule: PricingRule) => { const markupRate = Number(drafts[rule.id] ?? rule.markupRate); if (!Number.isFinite(markupRate) || markupRate < 0) { toast({ title: 'Enter a valid markup', variant: 'destructive' }); return; } update.mutate({ ruleId: rule.id, data: { markupRate, active: rule.active } }, { onSuccess: () => { rules.refetch(); toast({ title: 'Pricing rule saved', description: rule.label }); } }); };
  if (rules.isLoading) return <LoadingPanel />;
  if (rules.isError) return <ErrorState retry={() => rules.refetch()} />;
  return <div className="space-y-6"><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><SectionHeader title="Pricing controls" copy="Adjust the live catalog rules used for sourced products." /><div className="divide-y divide-border">{(rules.data || []).map(rule => <div key={rule.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-[190px] flex-1"><p className="text-sm font-bold">{rule.label}</p><p className="mt-1 text-[11px] text-muted-foreground">{rule.source} · updated {dateLabel(rule.updatedAt)}</p></div><StatusPill value={rule.active ? 'active' : 'inactive'} /><label className="flex items-center gap-2 rounded-lg border border-input px-2"><input aria-label={`Markup for ${rule.label}`} type="number" min="0" max="500" value={drafts[rule.id] ?? rule.markupRate} onChange={event => setDrafts(current => ({ ...current, [rule.id]: event.target.value }))} className="h-8 w-20 bg-transparent text-right font-mono text-xs outline-none" /><span className="text-xs text-muted-foreground">%</span></label><button type="button" onClick={() => saveRule(rule)} disabled={update.isPending} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground">Save</button></div>)}</div>{!rules.data?.length && <EmptyState icon={SlidersHorizontal} title="No pricing rules" copy="Pricing controls will appear when configured." />}</section><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><SectionHeader title="Vendor promotions" copy="Promotion records available from the vendor promotion feed." />{promotions.isLoading ? <LoadingPanel rows={2} /> : promotions.data?.length ? <div className="grid gap-3 md:grid-cols-2">{promotions.data.slice(0, 8).map(promotion => <div key={promotion.id} className="rounded-xl bg-secondary/50 p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">{promotion.name}</p><StatusPill value={promotion.status} /></div><p className="mt-3 text-xs text-muted-foreground">{promotion.type.replaceAll('_', ' ')} · {promotion.value}{promotion.type === 'percentage' ? '%' : ' ZMW'}</p></div>)}</div> : <EmptyState icon={Tags} title="No promotions are running" copy="This view is read-only until a promotion workflow is available." />}</section></div>;
}

function SupportView() {
  const tickets = useListSupportTickets(undefined, { query: { queryKey: getListSupportTicketsQueryKey() } });
  const update = useUpdateSupportTicket();
  const { toast } = useToast();
  const [status, setStatus] = useState('all');
  const visible = (tickets.data || []).filter(ticket => status === 'all' || ticket.status === status);
  const change = (ticket: SupportTicket, next: 'open' | 'in_progress' | 'resolved') => update.mutate({ ticketId: ticket.id, data: { status: next, assignedTo: ticket.assignedTo || 'Operations desk' } }, { onSuccess: () => { tickets.refetch(); toast({ title: 'Ticket updated', description: ticket.subject }); } });
  return <div><div className="mb-5 flex flex-wrap gap-2">{['all', 'open', 'in_progress', 'resolved'].map(item => <button type="button" key={item} onClick={() => setStatus(item)} className={`rounded-full px-3 py-2 text-xs font-bold ${status === item ? 'bg-primary text-primary-foreground' : 'border border-border bg-card'}`}>{item === 'all' ? 'All tickets' : item.replace('_', ' ')}</button>)}</div>{tickets.isLoading ? <LoadingPanel /> : tickets.isError ? <ErrorState retry={() => tickets.refetch()} /> : visible.length ? <div className="space-y-3">{visible.map(ticket => <article key={ticket.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${ticket.priority === 'urgent' ? 'bg-accent/15 text-accent' : 'bg-secondary text-primary'}`}><Headphones size={16} /></span><div><p className="text-sm font-bold">{ticket.subject}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.customerName} · {ticket.category} · {ticket.priority} priority</p></div></div><select aria-label={`Update ${ticket.subject}`} value={ticket.status} disabled={update.isPending} onChange={event => change(ticket, event.target.value as 'open' | 'in_progress' | 'resolved')} className="h-9 rounded-lg border border-input bg-background px-2 text-xs font-bold"><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></div><p className="mt-4 rounded-xl bg-secondary/55 p-3 text-xs leading-5 text-muted-foreground">{ticket.lastMessage}</p><div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground"><span>Assigned to: <strong className="text-foreground">{ticket.assignedTo || 'Unassigned'}</strong></span><span>Updated {dateLabel(ticket.updatedAt)}</span></div></article>)}</div> : <EmptyState icon={LifeBuoy} title="Support queue is clear" copy="No tickets match this view." />}</div>;
}

function ModerationView() {
  const reviews = useListVendorReviews({ query: { queryKey: getListVendorReviewsQueryKey() } });
  return <div><div className="mb-5 rounded-xl border border-primary/15 bg-primary/5 p-4 text-xs text-muted-foreground"><strong className="text-foreground">Trust check:</strong> Reviews below are from the live vendor review feed. Replies and reports are not available in the current admin API, so this surface stays review-only.</div>{reviews.isLoading ? <LoadingPanel /> : reviews.isError ? <ErrorState retry={() => reviews.refetch()} /> : reviews.data?.length ? <div className="grid gap-3 lg:grid-cols-2">{reviews.data.map(review => <article key={review.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold">{review.productTitle}</p><p className="mt-1 text-xs text-muted-foreground">{review.customerName} · {dateLabel(review.createdAt)}</p></div><span className={`font-mono text-sm font-bold ${review.rating < 3 ? 'text-accent' : 'text-primary'}`}>{review.rating.toFixed(1)} / 5</span></div><p className="mt-4 text-sm leading-6 text-muted-foreground">“{review.comment}”</p><div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground"><span>{review.reply ? 'Reply published' : 'No reply yet'}</span><span>{review.repliedAt ? dateLabel(review.repliedAt) : 'Needs review'}</span></div></article>)}</div> : <EmptyState icon={ShieldCheck} title="No reviews to moderate" copy="New customer feedback will appear here." />}</div>;
}

function AnalyticsView() {
  const sales = useGetSalesOverview({ query: { queryKey: getGetSalesOverviewQueryKey() } });
  const orders = useListAdminOrders(undefined, { query: { queryKey: getListAdminOrdersQueryKey() } });
  const vendors = useListAdminVendors(undefined, { query: { queryKey: getListAdminVendorsQueryKey() } });
  const products = useListProducts({ limit: 50 }, { query: { queryKey: getListProductsQueryKey({ limit: 50 }) } });
  if (sales.isLoading) return <LoadingPanel rows={5} />;
  if (sales.isError || !sales.data) return <ErrorState retry={() => sales.refetch()} />;
  const completed = (orders.data || []).filter(order => order.status === 'DELIVERED').length;
  return <div className="space-y-6"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Sales" value={money(sales.data.totalSales)} icon={CircleDollarSign} tone="accent" /><Metric label="AOV" value={money(sales.data.averageOrderValue)} icon={Activity} /><Metric label="Vendors" value={vendors.data?.length ?? '—'} icon={Store} /><Metric label="Products" value={products.data?.length ?? '—'} icon={Package} /></div><div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><SectionHeader title="Category mix" copy="Sales contribution by category." /><div className="space-y-5">{sales.data.byCategory.map(category => <div key={category.label}><div className="flex justify-between text-xs font-bold"><span>{category.label}</span><span className="font-mono">{money(category.sales)}</span></div><div className="mt-2 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(100, category.sales / Math.max(1, sales.data.totalSales) * 100)}%` }} /></div></div>)}</div></section><section className="rounded-2xl bg-secondary p-5 sm:p-6"><SectionHeader title="Funnel pulse" copy="Simple operational ratios from live records." /><div className="space-y-3"><div className="flex justify-between rounded-xl bg-background/70 p-4 text-sm"><span>Orders delivered</span><strong className="font-mono text-primary">{completed}</strong></div><div className="flex justify-between rounded-xl bg-background/70 p-4 text-sm"><span>Orders in motion</span><strong className="font-mono">{Math.max(0, (orders.data?.length ?? 0) - completed)}</strong></div><div className="flex justify-between rounded-xl bg-background/70 p-4 text-sm"><span>Vendors with orders</span><strong className="font-mono">{vendors.data?.filter(v => v.orderCount > 0).length ?? '—'}</strong></div></div></section></div></div>;
}

function NotificationsView() {
  const dashboard = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey() } });
  const fulfillment = useGetFulfillmentOverview({ query: { queryKey: getGetFulfillmentOverviewQueryKey() } });
  const notifications = [
    ...(dashboard.data?.pendingVendorApplications ? [{ tone: 'attention', title: `${dashboard.data.pendingVendorApplications} vendor applications need a review`, href: '/admin/vendors' }] : []),
    ...(dashboard.data?.openSupportTickets ? [{ tone: 'attention', title: `${dashboard.data.openSupportTickets} support tickets are open`, href: '/admin/support' }] : []),
    ...(fulfillment.data?.delayedOrders ? [{ tone: 'attention', title: `${fulfillment.data.delayedOrders} delivery exceptions need attention`, href: '/admin/fulfillment' }] : []),
    { tone: 'info', title: 'Daily operations summary is ready', href: '/admin/analytics' },
  ];
  if (dashboard.isLoading || fulfillment.isLoading) return <LoadingPanel rows={4} />;
  return <div><div className="mb-5 rounded-xl bg-secondary p-4 text-xs text-muted-foreground">This inbox is generated from live dashboard and fulfillment signals. It does not send outbound notifications.</div>{notifications.length ? <div className="space-y-2">{notifications.map((notification, index) => <Link href={notification.href} key={`${notification.title}-${index}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"><span className={`grid h-10 w-10 place-items-center rounded-xl ${notification.tone === 'attention' ? 'bg-accent/15 text-accent' : 'bg-primary/10 text-primary'}`}><Bell size={17} /></span><div className="flex-1"><p className="text-sm font-bold">{notification.title}</p><p className="mt-1 text-[11px] text-muted-foreground">Generated just now · operations signal</p></div><ChevronRight size={16} className="text-muted-foreground" /></Link>)}</div> : <EmptyState icon={Bell} title="No new notifications" copy="The desk is quiet." />}</div>;
}

function ManagementView() {
  const accounts = useListSupportAccounts({ query: { queryKey: getListSupportAccountsQueryKey() } });
  const update = useUpdateSupportAccount();
  const create = useCreateSupportAccount();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'support' as 'master_admin' | 'support' | 'operations' | 'finance' });
  const save = (event: React.FormEvent) => { event.preventDefault(); create.mutate({ data: form }, { onSuccess: () => { accounts.refetch(); setForm({ name: '', email: '', role: 'support' }); setShowForm(false); toast({ title: 'Team account created' }); }, onError: () => toast({ title: 'Could not create account', variant: 'destructive' }) }); };
  return <div><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Admin access is persistent and backed by support account records.</p><button type="button" onClick={() => setShowForm(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"><Plus size={15} /> Add team account</button></div>{showForm && <form onSubmit={save} className="mb-5 grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:grid-cols-[1fr_1fr_.8fr_auto]"><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Full name" className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none" /><input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="Work email" className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none" /><select value={form.role} onChange={event => setForm({ ...form, role: event.target.value as typeof form.role })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"><option value="support">Support</option><option value="operations">Operations</option><option value="finance">Finance</option><option value="master_admin">Master admin</option></select><button type="submit" disabled={create.isPending} className="h-10 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground">{create.isPending ? 'Creating…' : 'Create'}</button></form>}{accounts.isLoading ? <LoadingPanel /> : accounts.isError ? <ErrorState retry={() => accounts.refetch()} /> : accounts.data?.length ? <div className="overflow-x-auto rounded-2xl border border-border bg-card"><div className="min-w-[700px]"><div className="grid grid-cols-[1.4fr_1.4fr_1fr_.8fr_.85fr] gap-4 border-b border-border bg-secondary/50 px-5 py-3 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground"><span>Team member</span><span>Email</span><span>Role</span><span>Status</span><span>Access</span></div>{accounts.data.map(account => <AccountRow key={account.id} account={account} update={update} onDone={() => accounts.refetch()} />)}</div></div> : <EmptyState icon={Users} title="No team accounts" copy="Create the first support or operations account." />}</div>;
}

function AccountRow({ account, update, onDone }: { account: SupportAccount; update: ReturnType<typeof useUpdateSupportAccount>; onDone: () => void }) {
  const { toast } = useToast();
  const toggle = () => update.mutate({ accountId: account.id, data: { status: account.status === 'active' ? 'suspended' : 'active' } }, { onSuccess: () => { onDone(); toast({ title: 'Access updated', description: account.name }); } });
  return <div className="grid grid-cols-[1.4fr_1.4fr_1fr_.8fr_.85fr] items-center gap-4 border-b border-border p-5 last:border-0"><div><p className="text-sm font-bold">{account.name}</p><p className="mt-1 text-[11px] text-muted-foreground">Added {dateLabel(account.createdAt)}</p></div><p className="text-xs">{account.email}</p><StatusPill value={account.role} /><StatusPill value={account.status} /><button type="button" onClick={toggle} disabled={update.isPending} className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold hover:border-accent hover:text-accent">{account.status === 'active' ? 'Suspend' : 'Restore'}</button></div>;
}

function SettingsView() {
  const settings = useGetAdminSettings({ query: { queryKey: getGetAdminSettingsQueryKey() } });
  const update = useUpdateAdminSettings();
  const { toast } = useToast();
  const [form, setForm] = useState<MarketplaceSettings | null>(null);
  useEffect(() => {
    if (settings.data && !form) setForm(settings.data);
  }, [settings.data, form]);
  if (settings.isError) return <ErrorState retry={() => settings.refetch()} />;
  if (settings.isLoading || !form) return <LoadingPanel rows={4} />;
  const set = <K extends keyof MarketplaceSettings>(key: K, value: MarketplaceSettings[K]) => setForm(current => current ? { ...current, [key]: value } : current);
  const save = (event: React.FormEvent) => { event.preventDefault(); update.mutate({ data: form }, { onSuccess: saved => { setForm(saved); toast({ title: 'Settings saved', description: 'New checkout rules are now active.' }); }, onError: () => toast({ title: 'Could not save settings', variant: 'destructive' }) }); };
  return <form onSubmit={save} className="max-w-4xl rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="flex items-start justify-between gap-4 border-b border-border pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">System configuration</p><h2 className="mt-1 font-display text-2xl font-bold">Marketplace rules</h2><p className="mt-2 text-sm text-muted-foreground">Changes apply to new checkout and vendor settlement calculations.</p></div><Settings size={23} className="text-primary" /></div><div className="mt-7 grid gap-5 sm:grid-cols-2">{([['storeName', 'Store name', 'text'], ['supportEmail', 'Support email', 'email'], ['defaultCurrency', 'Default currency', 'text'], ['deliveryZone', 'Delivery zone', 'text'], ['standardDeliveryFee', 'Standard delivery fee', 'number'], ['freeDeliveryThreshold', 'Free delivery threshold', 'number'], ['vatRate', 'VAT rate (%)', 'number'], ['vendorCommissionRate', 'Vendor commission (%)', 'number']] as Array<[keyof MarketplaceSettings, string, string]>).map(([key, label, type]) => <label key={key} className="grid gap-2 text-xs font-bold">{label}<input type={type} min={type === 'number' ? 0 : undefined} max={key === 'vatRate' || key === 'vendorCommissionRate' ? 100 : undefined} value={String(form[key])} onChange={event => set(key, type === 'number' ? Number(event.target.value) : event.target.value as MarketplaceSettings[typeof key])} className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal outline-none focus:border-primary" /></label>)}</div><label className="mt-6 flex items-center gap-3 rounded-xl bg-secondary/60 p-4 text-sm font-bold"><input type="checkbox" checked={form.maintenanceMode} onChange={event => set('maintenanceMode', event.target.checked)} className="h-4 w-4 accent-primary" /> Put storefront in maintenance mode <span className="ml-auto text-xs font-normal text-muted-foreground">Stops new checkout</span></label><button type="submit" disabled={update.isPending} className="mt-7 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60">{update.isPending ? 'Saving…' : 'Save settings'}</button></form>;
}

function SectionView({ section }: { section: string }) {
  if (section === 'dashboard') return <DashboardView />;
  if (section === 'orders') return <OrdersView />;
  if (section === 'products') return <ProductsView />;
  if (section === 'vendors') return <VendorsView />;
  if (section === 'customers') return <CustomersView />;
  if (section === 'sourcing') return <SourcingView />;
  if (section === 'fulfillment') return <FulfillmentView />;
  if (section === 'finance') return <FinanceView />;
  if (section === 'promotions') return <PromotionsView />;
  if (section === 'support') return <SupportView />;
  if (section === 'messages') return <OperationsMessagesPage />;
  if (section === 'moderation') return <ModerationView />;
  if (section === 'analytics') return <AnalyticsView />;
  if (section === 'notifications') return <NotificationsView />;
  if (section === 'management') return <ManagementView />;
  if (section === 'settings') return <SettingsView />;
  return <EmptyState icon={LayoutDashboard} title="That workspace is not configured" copy="Choose an operations area from the left rail." action={<Link href="/admin" className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">Back to dashboard</Link>} />;
}

function AdminWorkspaceLayout() {
  const [, params] = useRoute('/admin/:section');
  const rawSection = params?.section || 'dashboard';
  const section = rawSection === 'tickets' ? 'support' : rawSection === 'sales' ? 'finance' : rawSection === 'pricing' ? 'promotions' : rawSection;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const meta = sectionMeta[section] || sectionMeta.dashboard;
  const Icon = meta.icon;
  return <div className="min-h-[100dvh] bg-background"><div className="flex min-h-[100dvh]"><aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-[78px]' : ''}`}><div className={`flex h-[76px] items-center border-b border-border px-4 ${collapsed ? 'lg:justify-center' : 'justify-between'}`}><Link href="/admin" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-xl font-bold text-primary-foreground">G</span>{!collapsed && <span className="font-display text-xl font-bold tracking-[-.06em]">gulani<span className="text-accent">.</span></span>}</Link><button type="button" onClick={() => setCollapsed(value => !value)} className="hidden h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:grid" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div><div className="flex-1 overflow-y-auto px-3 py-5">{navGroups.map(group => <div key={group.label} className="mb-6"><p className={`mb-2 px-3 font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground ${collapsed ? 'lg:hidden' : ''}`}>{group.label}</p><div className="space-y-1">{group.items.map(item => { const ItemIcon = item.icon; const active = section === item.key; return <Link key={item.key} href={item.key === 'dashboard' ? '/admin' : `/admin/${item.key}`} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'} ${collapsed ? 'lg:justify-center' : ''}`}><ItemIcon size={17} strokeWidth={active ? 2.2 : 1.8} />{!collapsed && <span>{item.label}</span>}{!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}</Link>; })}</div></div>)}</div><div className={`border-t border-border p-3 ${collapsed ? 'lg:text-center' : ''}`}><Link href="/" className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground ${collapsed ? 'lg:justify-center' : ''}`}><ArrowDownRight size={16} />{!collapsed && 'Back to marketplace'}</Link></div></aside>{mobileOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" />}<main className="min-w-0 flex-1"><header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md"><div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card lg:hidden" aria-label="Open navigation"><Menu size={18} /></button><div className="hidden h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary sm:grid"><Icon size={17} /></div><div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-accent">{meta.eyebrow}</p><h1 className="font-display text-xl font-bold tracking-[-.04em] sm:text-2xl">{meta.label}</h1></div></div><div className="flex items-center gap-2"><Link href="/admin/notifications" aria-label="Open notifications" className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"><Bell size={17} /></Link><div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 sm:flex"><span className="grid h-6 w-6 place-items-center rounded-lg bg-secondary text-primary"><UserRound size={13} /></span><span className="text-xs font-bold">Operations desk</span><ChevronDown size={14} className="text-muted-foreground" /></div></div></div><div className="border-t border-border/60 bg-secondary/35 px-4 py-2 text-[11px] text-muted-foreground sm:px-6 lg:px-8"><span className="font-semibold text-foreground">Gulani control room</span><span className="mx-2 text-border">/</span>{meta.description}</div></header><div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9"><SectionView section={section} /></div></main></div></div>;
}

export function AdminWorkspace() {
  return <AdminWorkspaceLayout />;
}

export default AdminWorkspace;