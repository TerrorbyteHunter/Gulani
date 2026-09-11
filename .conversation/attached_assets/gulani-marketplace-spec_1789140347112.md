# GULANI — FULL PLATFORM SPECIFICATION
### E-Commerce Marketplace: Product, Technical & Operational Requirements

**Purpose of this document:** This is a build-ready specification intended to be handed to a development team or an AI coding assistant. It absorbs and expands the original "Admin Role & Permission System" document into a complete marketplace blueprint, and adds the sections that any real marketplace needs but were not yet specified — catalog, orders, payments, logistics, trust & safety, compliance, architecture, and rollout plan. Nothing here should be treated as optional unless explicitly marked "Phase 2" or "Optional."

---

## 0. Guiding Principles

1. **Manual today, automated tomorrow.** Every workflow must be usable by a human staff member from day one, but every manual action must write a structured database record that a future automation/API can replace without redesigning the schema.
2. **Permission-based, not role-name-based.** Access control is driven by granular permissions; roles are just named bundles of permissions.
3. **Everything important is logged.** If an admin, vendor, or system process changes state, there must be an audit trail.
4. **Marketplace, not a single store.** The platform must cleanly separate Customer, Vendor, and Admin concerns, even where one company runs all three at first.
5. **Design for multiple fulfillment models.** Orders may be (a) fulfilled from local vendor stock, or (b) sourced/imported on the customer's behalf (e.g., China sourcing) with a longer, staffed pipeline. The data model must support both without a rebuild.

---

## 1. Platform Overview

**Gulani** is a multi-vendor e-commerce marketplace with three primary user types:

- **Customers** — browse, buy, track orders, request support.
- **Vendors** — list products, fulfill orders, get paid out.
- **Administrators** — operate the platform under RBAC (see Section 3).

Two fulfillment tracks must both be supported:

- **Local/Vendor-fulfilled orders** — vendor has stock, ships directly (or via a Gulani-arranged courier).
- **Sourced/Imported orders** — Gulani staff (or eventually a sourcing API) purchase the item from a supplier on the customer's behalf, track it through customs/shipping, and deliver it. This is the "China order" workflow referenced in the original spec.

---

## 2. User Roles & Personas

### 2.1 Customer
- Browses/search, places orders, pays, tracks shipments, messages support, leaves reviews, requests refunds/returns.
- Needs: account, saved addresses, saved payment methods, order history, notifications, wishlist.

### 2.2 Vendor
- Applies to sell, gets approved/rejected, lists products, manages stock and pricing, fulfills orders, views payouts, handles disputes with customers via mediated support.
- Needs: vendor dashboard, product bulk upload, order queue, payout ledger, performance metrics (ratings, cancellation rate, late-shipment rate).

### 2.3 Administrator (see Section 3 for full RBAC)
- Master Admin plus specialized admin roles operating specific parts of the platform.

### 2.4 Guest (Unregistered visitor) — *added*
- Can browse and search freely. **Guest checkout is allowed from launch** (email + phone, delivery address, no full account required) to reduce friction; the guest is prompted to create an account post-purchase (order history, faster future checkout) but is never blocked from buying without one.

---

## 3. Admin Role & Permission System (RBAC)

*(Retained and expanded from the source document.)*

### 3.1 Master Admin
Complete control over Gulani. Exclusively able to:
- Create/delete/deactivate admins
- Assign roles and modify permissions
- Create custom roles
- View all customers, vendors, orders, payments, products, communications, system activity
- Configure pricing, platform settings, API integrations
- Manage automation
- View system logs and audit logs

**The Master Admin is the only role that can grant or revoke administrative permissions.** This must be enforced at the database/authorization layer, not just hidden in the UI.

### 3.2 Standard Roles

| Role | Can | Cannot |
|---|---|---|
| **CUSTOMER_SERVICE** | View customers & their orders; respond to messages; manage support conversations; create tickets; handle complaints/disputes; request refunds; view shipment info; send notifications | Create admins; change system settings; modify pricing; manage API credentials; access sensitive financial settings unless explicitly granted |
| **ORDER_MANAGER** | View/process orders; update status; manage sourcing orders; manage fulfillment; update/generate shipment info; mark orders processed; handle order issues | Approve refunds above a threshold (route to Finance Admin); edit product pricing |
| **PRODUCT_MANAGER** | Manage products & categories; edit product info; approve/reject vendor product submissions; manage visibility; manage pricing where permitted; trigger/review sync | Approve vendors; access payment data |
| **VENDOR_MANAGER** | Review/approve/suspend vendors; manage vendor info; review vendor products; monitor performance; handle vendor disputes | Refund customers directly; edit unrelated product categories |
| **FINANCE_ADMIN** | View payments/transactions; manage refunds; view commissions, vendor payouts, financial reports | Create admins; edit product catalog |
| **CONTENT_ADMIN** | Manage homepage, banners, promotions, categories, featured products, announcements, marketing content | View financial or customer PII beyond what's needed for content |
| **SYSTEM_ADMIN** | Manage system configuration; view system logs; monitor API integrations & sync; manage technical settings; view errors | **Must not automatically have access to financial information** |

### 3.3 Custom Roles
Master Admin can define custom roles as arbitrary permission bundles.

Example — *Order Fulfillment Staff*:
```
☑ orders.view
☑ orders.update_status
☑ shipments.view
☑ shipments.create
☐ payments.refund
☐ users.manage
☐ vendors.manage
☐ admins.manage
```

### 3.4 Permission Architecture
Do not hard-code by role name — check discrete permission strings. Suggested canonical permission list (expand as needed):

```
users.view            users.edit            users.suspend
orders.view           orders.edit           orders.fulfill        orders.cancel
products.view         products.create       products.edit         products.delete    products.sync
vendors.view          vendors.approve       vendors.suspend       vendors.edit
payments.view         payments.refund       payments.payout
messages.view         messages.respond
notifications.send
admins.create         admins.edit           admins.disable
settings.view         settings.edit
reports.view
promotions.manage
content.manage
disputes.manage
logs.view
```

### 3.5 Admin Creation
**Admin Panel → Administrators → Create Admin**
Fields: Name, Email, Phone, Role, Status, Password/setup invitation.
New admins receive an email invitation to set their own password (never send raw passwords).

### 3.6 Admin Dashboard (role-adaptive)
The dashboard renders only the modules and metrics an admin has permission to see. Examples:

- **Customer Service:** Open conversations, unresolved complaints, pending issues, unread messages.
- **Order Manager:** New orders, awaiting fulfillment, awaiting shipment, shipping problems.
- **Finance Admin:** Today's sales, pending payments, refund requests, vendor payouts.

### 3.7 Session & Access Security *(added)*
- Admin sessions should support forced logout / session revocation by Master Admin.
- Sensitive actions (refunds above a threshold, permission changes, admin deactivation) should require re-authentication (password or 2FA step-up).
- **Two-factor authentication should be mandatory for all admin accounts**, not just recommended — admin panels are the highest-value attack target on a marketplace.
- IP allow-listing or anomaly alerts for admin logins is recommended as the platform scales.

---

## 4. Product Catalog *(added — essential, was missing)*

### 4.1 Core entities
- **Category** (hierarchical, e.g., Electronics → Phones → Smartphones)
- **Product** (belongs to a vendor, belongs to one or more categories)
- **Variant** (size/color/spec combinations, each with its own SKU, price, and stock count)
- **Attribute set** (category-specific fields, e.g., "screen size" for electronics, "material" for clothing)
- **Media** (images, video; each product needs a minimum image count and image-quality rules before approval)

### 4.2 Required fields per product
Title, description, category, brand (optional), price, compare-at price (for showing discounts), currency, stock quantity, SKU, weight/dimensions (for shipping calculation), variant options, images, vendor ID, status (draft/pending review/live/rejected/archived), tags/keywords (SEO), country of origin (relevant for sourced/import items).

### 4.3 Moderation
Products should go through a **Product Manager** approval queue before going live, with a reason-coded rejection flow the vendor can see and correct.

### 4.4 Inventory
Real-time stock decrement on order confirmation, with a reservation window during checkout to prevent overselling. Low-stock and out-of-stock triggers feed the automation framework (Section 9).

---

## 5. Search & Discovery *(added)*

- Full-text search across title, description, tags, category, brand.
- Filters: category, price range, brand, rating, vendor, availability, attributes (color/size/etc.).
- Sort: relevance, price (asc/desc), newest, best-selling, top-rated.
- Autosuggest/typeahead.
- Recommended: a dedicated search index (e.g., Elasticsearch/OpenSearch or Algolia/Meilisearch) rather than relying on raw SQL `LIKE` queries once catalog size grows.
- Merchandising controls for Content Admin: featured products, sponsored placement (if the business model includes paid placement), homepage banners.

---

## 6. Cart, Checkout & Order Lifecycle

### 6.1 Cart
Persistent cart tied to account (and a guest/session cart if guest checkout is enabled), multi-vendor cart support (a single cart can contain items from multiple vendors, which then splits into multiple orders at checkout).

### 6.2 Checkout
Address selection/entry, delivery method selection, payment method selection, order review, coupon/promo code entry, final confirmation.

### 6.3 Order splitting
One checkout can produce **multiple vendor sub-orders** (one per vendor) that are tracked, fulfilled, and paid out independently, while the customer sees one parent order reference.

### 6.4 Order status state machine
Minimum required states (both fulfillment tracks share the trunk, then branch):

```
PLACED → PAYMENT_CONFIRMED →
   ├── (Local/Vendor stock) → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
   └── (Sourced/Import)     → SOURCING → PURCHASED_FROM_SUPPLIER → IN_TRANSIT (int'l) →
                               CUSTOMS/CLEARANCE → RECEIVED_LOCAL_WAREHOUSE → SHIPPED (local leg) →
                               OUT_FOR_DELIVERY → DELIVERED
Any state → CANCELLED / RETURN_REQUESTED → RETURN_APPROVED → REFUNDED
```

Each transition must be:
- Logged with actor (system/admin/vendor), timestamp, and reason.
- Capable of triggering a notification and an automation event (Section 9).

### 6.5 Returns, Refunds & Cancellations *(added — essential, was missing)*
- Clear, published return window and eligibility rules (per category — e.g., sourced/imported items may be non-returnable past a point).
- Return request flow: customer requests → reason code → optional photo upload → Customer Service/Finance Admin review → approve/reject → refund or replacement.
- Partial refunds and partial-item cancellations (relevant for multi-item/multi-vendor orders).
- Refund methods: original payment method, wallet credit, or mobile money — define which are supported at MVP.

---

## 7. Payments & Financial System

### 7.1 Payment methods
- **Mobile money** (MTN Mobile Money, Airtel Money) — primary payment rail.
- **Visa** card payments via a payment gateway.
- **No cash on delivery.** Every order must be paid in full before it enters fulfillment — this simplifies the order state machine (no "awaiting payment on delivery" branch) and removes no-show/fraud risk from the courier leg entirely.
- Optional wallet/store credit for refunds only (not a purchase method at MVP).

### 7.2 Commission & payouts
- Configurable commission percentage per category or per vendor.
- Vendor payout ledger: gross sales, commission deducted, refunds deducted, net payable.
- Payout schedule (e.g., weekly/bi-weekly) and payout method (bank transfer, mobile money).
- Hold/reserve period on new vendor payouts to cover potential returns/disputes (common marketplace risk control) — **added, essential for fraud/chargeback protection**.

### 7.3 Pricing & tax
- Multi-currency support is not required at MVP if operating only in Zambia, but the schema should store currency per transaction (default ZMW) so it isn't a rewrite later.
- **Prices are VAT-inclusive.** The displayed/listed price is what the customer pays — no VAT added at checkout. Internally, each order/order-item should still store the VAT component (price ÷ 1.16 × 0.16 at the current 16% Zambian VAT rate, kept as a config value in case the rate changes) so that ZRA-compliant invoices and vendor payout/commission calculations can separate the tax portion from vendor revenue and platform commission.
- Promotions/coupon engine: percentage off, fixed amount off, free shipping, minimum-spend thresholds, usage limits, per-vendor vs platform-wide promotions.

### 7.4 Fraud & risk controls *(added)*
- Velocity checks (same card/device used across many accounts), order-value anomaly flags, mismatched billing/shipping address flags.
- Manual review queue for flagged high-value or high-risk orders, visible to Finance Admin / Customer Service.

---

## 8. Logistics & Fulfillment

### 8.1 Local fulfillment
Vendor packs and hands to a **third-party courier** (own delivery fleet is a Phase 2 decision, not launch scope); tracking number entered manually at first, later pulled automatically from courier APIs. The courier should be an interface/abstraction in the code from day one (a `delivery_provider` concept) so swapping in or adding an owned fleet later is a new provider, not a rebuild.

### 8.2 Sourced/import fulfillment (the "China order" model)
Follows the manual pipeline from the original spec:

```
Customer places order → Order Manager sees order → Staff manually purchases product
   → Staff enters supplier/order reference → Staff updates status
   → Staff enters tracking number → Customer receives notification
```

Future automated version (same data model, different actor):

```
Customer places order → Gulani automatically sends order to Sourcing API
   → Fulfillment partner → Tracking automatically imported → Customer automatically notified
```

**Design requirement:** the `order` and `shipment` tables must record supplier reference, sourcing status, and tracking number regardless of whether a human or an API populated them.

### 8.3 Shipping cost calculation
Rules-based (flat rate, weight-based, per-vendor rate) at MVP; carrier-API real-time rates as a later phase.

### 8.4 Delivery zones
**Launch zone: Lusaka only.** Build the zone concept as a configurable table (`delivery_zones`), not a hard-coded check, so adding new cities/zones later is a data change, not a code change. Addresses outside Lusaka should get a clear "not yet serviceable" message at checkout rather than being silently allowed through.

---

## 9. Automation & Event Framework

Centralized event bus so that manual actions and future automation share the same triggers.

```
Order Paid
   → Event: ORDER_PAID
        ├── Notify Customer
        ├── Notify Order Team
        ├── Create Sourcing Task (if applicable)
        └── Eventually → Automatically send supplier order
```

Recommended event catalog (expanded):
```
ORDER_PLACED            ORDER_PAID              ORDER_CANCELLED
ORDER_SHIPPED           ORDER_DELIVERED         ORDER_RETURN_REQUESTED
PAYMENT_FAILED          REFUND_ISSUED
PRODUCT_OUT_OF_STOCK    PRODUCT_LOW_STOCK       PRICE_CHANGED
VENDOR_APPLIED          VENDOR_APPROVED         VENDOR_SUSPENDED
NEW_MESSAGE             DISPUTE_OPENED          DISPUTE_RESOLVED
ADMIN_CREATED           ADMIN_PERMISSION_CHANGED
```

Each event should support multiple subscribed actions (notification, task creation, webhook, analytics log) so new automations can be added without touching the core order/payment code.

---

## 10. Notifications *(added — essential, was missing)*

- Channels: email, SMS, push (mobile app), in-app notification center.
- Customer notifications: order confirmation, payment confirmation, status changes, delivery, promotions (opt-in), support replies.
- Vendor notifications: new order, low stock, payout processed, product approved/rejected, customer message.
- Admin notifications: flagged orders, new vendor applications, disputes, system errors.
- Notification preferences per user (marketing vs transactional — transactional cannot be disabled; marketing must be opt-in/opt-out compliant).

---

## 11. Messaging & Support

- In-app messaging between customer ↔ Customer Service, and customer ↔ vendor (mediated/logged, ideally masking direct contact info to keep transactions on-platform).
- Support ticketing: category (order issue, payment issue, account issue, product issue), priority, SLA timer, assigned agent, status.
- Knowledge base / FAQ for self-service — **added**, reduces support load.

---

## 12. Reviews, Ratings & Trust *(added — essential, was missing)*

- Product reviews (star rating + text + optional photos), restricted to verified purchasers.
- Vendor rating aggregated from: review scores, on-time shipment rate, cancellation rate, response time.
- Moderation queue for flagged/reported reviews.
- Public vendor storefront page showing rating, policies, and product catalog.

---

## 13. Disputes & Complaints

- Formal dispute object distinct from a support ticket: linked to an order, has a resolution outcome (refund, replacement, rejected, escalated), and a resolution deadline.
- Escalation path: Customer Service → Vendor Manager (if vendor-caused) or Finance Admin (if payment-related) → Master Admin (if unresolved).
- All dispute actions are audit-logged.

---

## 14. Audit Logs

Every important administrative action must be recorded, e.g.:

```
Admin: John Banda
Action: Changed order status
Order: GUL-2026-000921
From: Sourcing
To: Purchased
Time: 14:32
```

Also record: admin creation, permission changes, product changes, price changes, refunds, order changes, vendor approval, account suspension, system configuration changes, **login/logout and failed login attempts** (added — important for security forensics).

The Master Admin (and, with `logs.view`, other permitted admins) can view the audit log, with filtering by admin, action type, date range, and entity.

---

## 15. Security & Data Protection *(added — essential, was missing)*

- Passwords hashed with a strong algorithm (bcrypt/argon2); never store plaintext.
- All traffic over HTTPS/TLS; payment data should never touch Gulani's own servers unencrypted — use a PCI-DSS-compliant gateway/tokenization so Gulani is not directly holding raw card data.
- Role-based authorization enforced server-side on every endpoint, not just hidden UI elements.
- Rate limiting and brute-force protection on login and OTP endpoints.
- Compliance with Zambia's **Data Protection Act (2021)** for handling customer PII: lawful basis for processing, data subject access, breach notification process, and a published privacy policy.
- Regular backups with a tested restore procedure, and a documented disaster-recovery plan.
- Input validation/sanitization to prevent SQL injection, XSS, and file-upload abuse (product images, review photos).

---

## 16. Legal, Compliance & Policy Documents *(added — essential, was missing)*

- Terms of Service (customer + vendor versions)
- Privacy Policy
- Vendor Agreement (commission terms, listing standards, prohibited items, penalties for cancellation/late shipment)
- Return & Refund Policy
- Prohibited/restricted items list (relevant given cross-border sourcing — customs restrictions, counterfeit goods policy)
- Business registration / tax compliance references (PACRA registration, ZRA VAT/TPIN where applicable)

---

## 17. Analytics & Reporting *(added)*

- Sales dashboards (GMV, order count, average order value) by day/week/month, by vendor, by category.
- Vendor performance reports (used to feed Vendor Manager suspension decisions).
- Funnel analytics: browse → cart → checkout → payment success (to spot drop-off points).
- Cohort/retention view of customers (Phase 2).

---

## 18. Non-Functional Requirements *(added)*

- **Localization:** default currency ZMW; language default English, architecture should not hard-code English strings (future local-language support).
- **Performance:** target page-load and API response benchmarks should be defined before build (e.g., product page < 2s on 3G-equivalent connections, given mobile-first usage patterns).
- **Scalability:** stateless application servers behind a load balancer; catalog and order data should be designed to scale horizontally as vendor/product count grows.
- **Availability:** target uptime SLA (e.g., 99.5%) with monitoring/alerting on downtime.
- **Mobile-first, web-responsive at launch:** the customer-facing storefront is a responsive web app built to work well on mobile browsers, since that is the majority of expected traffic. A native mobile app is explicitly **Phase 2**, not launch scope — but the API layer should be built API-first (not tightly coupled to the web frontend) so the Phase 2 app consumes the same backend without rework.
- **Accessibility:** basic WCAG-AA compliance for the customer storefront (contrast, alt text, keyboard navigation).

---

## 19. Suggested Technical Architecture

- **Backend:** RESTful (or GraphQL) API, modular by domain (users, catalog, orders, payments, vendors, admin) so RBAC and future microservice extraction are straightforward.
- **Database:** relational database (PostgreSQL recommended) for transactional integrity on orders/payments; a search index (Elasticsearch/OpenSearch/Meilisearch) layered on top for catalog search.
- **File/media storage:** object storage (e.g., S3-compatible) + CDN for product images.
- **Frontend:** a responsive customer web app (mobile-first, no native app at launch), plus a separate vendor portal and admin panel — sharing a common design system/component library but deployed independently so admin changes don't risk customer-site uptime. Because the backend is API-first, the Phase 2 native app is a new frontend against the existing API, not a backend rewrite.
- **Background jobs/queue:** for notifications, payout processing, and the automation/event framework (Section 9) — a message queue (e.g., Redis/RabbitMQ) rather than synchronous processing.
- **CI/CD:** automated testing and staged deployments (staging → production) with rollback capability.
- **Monitoring:** application performance monitoring, error tracking, and uptime alerting from day one, not bolted on later.

---

## 20. Core Database Entities (minimum viable schema)

```
users (id, name, email, phone, password_hash, role, status, created_at)
admins (id, user_id, role_id, status, created_by, created_at)
roles (id, name, is_custom)
permissions (id, key)
role_permissions (role_id, permission_id)
vendors (id, user_id, business_name, status, commission_rate, approved_by, approved_at)
categories (id, parent_id, name, slug)
products (id, vendor_id, category_id, title, description, status, created_at)
product_variants (id, product_id, sku, price, stock_qty, attributes_json)
product_media (id, product_id, url, type, sort_order)
orders (id, customer_id, status, total, currency, created_at)
order_items (id, order_id, vendor_id, product_variant_id, qty, price, status)
shipments (id, order_item_id, tracking_number, carrier, supplier_reference, status)
payments (id, order_id, method, amount, status, gateway_reference)
payouts (id, vendor_id, period_start, period_end, gross, commission, net, status)
reviews (id, product_id, customer_id, rating, text, status)
disputes (id, order_id, opened_by, type, status, resolution)
support_tickets (id, customer_id, category, priority, status, assigned_admin_id)
notifications (id, user_id, type, channel, status, sent_at)
audit_logs (id, admin_id, action, entity_type, entity_id, before, after, created_at)
events (id, type, payload_json, created_at, processed_at)
promotions (id, code, type, value, scope, starts_at, ends_at, usage_limit)
```

---

## 21. MVP Phasing / Roadmap

**Phase 1 — Manual MVP (confirmed launch scope)**
- Customer storefront: responsive web app (no native app yet); browse, search, cart, checkout.
- **Guest checkout enabled** alongside full accounts.
- Payments: **mobile money (MTN/Airtel) + Visa only — no cash on delivery**.
- Pricing: **VAT-inclusive** display prices; VAT component tracked internally for invoicing.
- Delivery: **Lusaka zone only**, fulfilled via **third-party courier(s)** (delivery-provider abstraction built in from day one).
- Vendor portal: apply, list products (manual approval), view orders, mark shipped.
- Admin panel: Master Admin + Customer Service + Order Manager + Product Manager roles live; manual sourcing workflow for imported items; basic audit log.
- Notifications: transactional email/SMS only.

**Phase 2 — Operational Depth & Own Infrastructure**
- **Native mobile app** (consuming the same API built in Phase 1).
- **Own delivery fleet** introduced alongside (or replacing) third-party couriers.
- **Expanded delivery zones** beyond Lusaka.
- Finance Admin payouts + commission automation.
- Reviews & ratings, dispute workflow, promotions engine.
- Vendor Manager role, vendor performance dashboards.
- Shipping-rate rules per zone, wishlist.

**Phase 3 — Automation**
- Sourcing API integration replacing manual purchase step.
- Carrier tracking API integration.
- Fraud/risk scoring automation, real-time payout reconciliation.
- Recommendation engine, personalization, loyalty/wallet system.

---

## 22. Confirmed Launch Decisions

| Decision | Answer |
|---|---|
| Guest checkout | Allowed from launch |
| Payment methods | Mobile money (MTN/Airtel) + Visa only |
| Cash on delivery | Not offered |
| Pricing | VAT-inclusive displayed prices |
| Delivery zone at launch | Lusaka only, expandable framework |
| Delivery fleet | Third-party courier at launch; own fleet is Phase 2 |
| Platform at launch | Web-responsive only; native app is Phase 2 |

### Still open (not yet decided — confirm before build)
1. Is Gulani VAT-registered/TPIN-holding at launch (needed to issue ZRA-compliant tax invoices)?
2. Which specific mobile money providers/aggregator will be integrated first (direct MTN/Airtel APIs vs. a payment aggregator like Flutterwave/DPO that bundles both plus Visa)?
3. Return/refund method when a guest (no account) requests a refund — same mobile money number/card, since there's no stored wallet to credit?

---

*End of specification. This document is meant to be pasted directly into a development brief, an engineering ticket system, or an AI coding assistant as the authoritative build reference.*
