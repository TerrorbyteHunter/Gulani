<<<<<<< HEAD
# Gulani Marketplace

Gulani is a mobile-first marketplace for discovering products from local Zambian vendors and international sourcing partners. Customers can browse products, build a multi-vendor basket, check out with supported payment methods, and follow orders through local or sourced fulfillment. Vendors have a dedicated workspace, while operations teams use a broad admin control room to manage the marketplace.

The project is currently a working first-phase application with seeded in-memory marketplace data. The PostgreSQL/Drizzle package and API contracts are prepared for the next persistence and production-hardening phase.

## Product areas

### Customer marketplace

- Discover featured, trending, and category-based products
- Search products and vendors
- View product details, variants, prices, stock, sourcing method, and vendor information
- Ask a product's seller a question from its product page or basket item
- Add multiple products and vendor items to a cart
- Check out as a guest
- Pay using MTN Mobile Money, Airtel Money, or Visa
- View order history, confirmation details, and order timelines
- Submit an application to sell on Gulani

### Vendor workspace

Available at `/vendor` for the seeded vendor account:

- Overview and store health
- Product creation, editing, archiving, variants, stock, and bulk updates
- Vendor order queue and fulfillment status updates
- Inventory and low-stock signals
- Customer and earnings summaries
- Review browsing and replies
- Promotions
- Sales analytics
- Public storefront editing and preview
- Verification/KYC information
- Vendor settings
- Vendor support tickets

Public vendor storefronts are available at `/store/:vendorId`.

### Admin and operations workspace

Available at `/admin`. The operations desk includes:

- Dashboard and queue health
- Orders and status updates
- Product and inventory oversight
- Vendor applications, vendor accounts, KYC signals, performance, payouts, and disputes
- Customer activity derived from order data
- Sourcing and supplier workflow views
- Fulfillment queues and delivery exceptions
- Finance and sales reporting
- Promotions and pricing rules
- Support tickets and operations workflows
- Customer/vendor message threads, including operations-started conversations with an opening message
- Reviews and moderation
- Analytics and reporting
- Notifications
- Team access and support account management
- Marketplace settings

The admin workspace uses dedicated APIs where they exist. Some newer sections currently derive their display data from existing order, product, vendor, sales, and pricing feeds; those areas are clearly labeled in the UI and are not intended to imply production persistence yet.

## Routes

### Customer routes

| Route | Purpose |
| --- | --- |
| `/` | Marketplace discovery, search, categories, featured products, and trending products |
| `/product/:id` | Product details, variants, stock, pricing, and add-to-cart |
| `/cart` | Cart contents and quantity management |
| `/checkout` | Delivery details and payment method selection |
| `/order/:id` | Order confirmation and fulfillment timeline |
| `/orders` | Customer order history |
| `/sell` | Vendor application form |
| `/store/:vendorId` | Public vendor storefront |

### Operations routes

| Route | Purpose |
| --- | --- |
| `/admin` | Operations dashboard |
| `/admin/orders` | Order search, filtering, and status changes |
| `/admin/products` | Product and inventory oversight |
| `/admin/vendors` | Vendor applications and account operations |
| `/admin/customers` | Customer activity view |
| `/admin/sourcing` | Global sourcing and supplier workflow |
| `/admin/fulfillment` | Fulfillment queue management |
| `/admin/finance` | Sales and finance overview |
| `/admin/promotions` | Pricing and promotion controls |
| `/admin/support` | Support ticket operations |
| `/admin/messages` | Start and manage customer/vendor conversations |
| `/admin/moderation` | Reviews and marketplace trust signals |
| `/admin/analytics` | Business analytics |
| `/admin/notifications` | Operations notifications |
| `/admin/management` | Team access and support accounts |
| `/admin/settings` | Marketplace configuration |

## Architecture

This repository is a pnpm workspace monorepo:

```text
.
├── artifacts/
│   ├── api-server/              Express API service
│   ├── gulani-marketplace/      React/Vite customer, vendor, and admin app
│   └── mockup-sandbox/          Design canvas component preview service
├── lib/
│   ├── api-spec/                OpenAPI source of truth and code generation
│   ├── api-client-react/        Generated React Query client
│   ├── api-zod/                Generated Zod schemas and types
│   └── db/                     PostgreSQL/Drizzle database package scaffold
├── scripts/                    Workspace utility and post-merge scripts
├── attached_assets/            Product requirements and supplied assets
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Frontend

The web application is a React 19 + Vite app using:

- TypeScript
- Wouter for client-side routing
- TanStack React Query for server state
- Generated hooks from `@workspace/api-client-react`
- Tailwind CSS and the existing Gulani theme tokens
- Radix UI primitives for reusable interface components
- Lucide icons
- Recharts and custom chart primitives for analytics views
- Framer Motion where animated interactions are needed

Important frontend files:

- `artifacts/gulani-marketplace/src/App.tsx` — application shell, public routes, cart/checkout/order screens, and route registration
- `artifacts/gulani-marketplace/src/pages/vendor-workspace.tsx` — vendor workspace and public vendor storefront
- `artifacts/gulani-marketplace/src/pages/admin-workspace.tsx` — expanded operations/admin workspace
- `artifacts/gulani-marketplace/src/index.css` — global theme tokens, typography, and shared styling
- `artifacts/gulani-marketplace/src/components/ui/` — shared UI primitives

The frontend accesses the API through relative `/api` paths. The Replit proxy routes `/api` requests to the API service.

### API

The API is an Express 5 service mounted under `/api`.

Important backend files:

- `artifacts/api-server/src/index.ts` — starts the server using the required `PORT` environment variable
- `artifacts/api-server/src/app.ts` — Express middleware, logging, CORS, body parsing, and `/api` mounting
- `artifacts/api-server/src/routes/index.ts` — combines health and marketplace routers
- `artifacts/api-server/src/routes/health.ts` — health check endpoint
- `artifacts/api-server/src/routes/marketplace.ts` — catalog, cart, checkout, orders, vendor, and admin routes
- `artifacts/api-server/src/lib/logger.ts` — shared Pino logger

The API currently stores its primary marketplace records in seeded in-memory structures. This makes the demo flows functional across the running app, but changes are not a durable production data layer yet.

### Contract-first API

`lib/api-spec/openapi.yaml` is the source of truth for the shared API contract. The generated packages are:

- `lib/api-client-react/src/generated/` — React Query hooks, request functions, and query key helpers
- `lib/api-zod/src/generated/` — Zod schemas and inferred types

When changing an API endpoint:

1. Update `lib/api-spec/openapi.yaml`.
2. Implement or update the matching server route.
3. Run API code generation.
4. Use the generated hook and schema in the frontend.
5. Run the workspace typecheck.

### Database package

`lib/db` contains the PostgreSQL connection and Drizzle ORM setup:

- `lib/db/src/index.ts` creates the connection pool from `DATABASE_URL`
- `lib/db/src/schema/index.ts` is currently an empty schema scaffold
- `lib/db/drizzle.config.ts` configures Drizzle Kit

The database package is not yet the source of truth for marketplace records. Before production, the in-memory route data should be migrated into durable tables for products, variants, carts, orders, vendors, customers, payments, fulfillment, promotions, support, and admin activity.

## API surface

The current OpenAPI contract includes:

### Public and customer APIs

- Health check
- Catalog summary
- Categories
- Product list and product detail
- Cart read, add, update, and remove
- Checkout
- Customer order list and order detail
- Vendor application submission

### Vendor APIs

- Vendor dashboard
- Vendor products and bulk product updates
- Vendor orders and order status updates
- Vendor reviews and replies
- Vendor promotions
- Vendor analytics
- Vendor storefront and public storefront
- Vendor verification
- Vendor settings
- Vendor support tickets

### Admin APIs

- Admin dashboard
- Admin orders and order status updates
- Vendor applications and application status updates
- Vendor account list and account updates
- Vendor/admin messages
- Support tickets and ticket status updates
- Support ticket messages
- Support accounts and account updates
- Fulfillment overview
- Sales overview
- Marketplace settings
- Source-aware pricing rules

## Business rules currently represented

- Default currency is ZMW.
- Checkout is configured for Lusaka delivery.
- Standard and free-delivery thresholds are configurable through admin settings.
- The default free-delivery threshold is ZMW 600.
- Products can be local-vendor items or sourced/imported items.
- Sourced products use source-aware pricing rules and configurable markup.
- Supported launch payment methods are MTN Mobile Money, Airtel Money, and Visa.
- Cash on delivery is intentionally not included in the current checkout flow.
- Order statuses cover payment confirmation, packing, sourcing, supplier purchase, transit, customs, local warehouse receipt, shipment, delivery, and cancellation.
- Vendor and sourced fulfillment share the same customer order surfaces while retaining fulfillment mode information.

## Running the project

### Prerequisites

- Node.js 24
- pnpm
- A configured Replit workspace
- `DATABASE_URL` when using the database package or database commands

Install dependencies:

```bash
pnpm install
```

### Recommended Replit workflow

The project has managed workflows for the services:

```text
artifacts/gulani-marketplace: web
artifacts/api-server: API Server
artifacts/mockup-sandbox: Component Preview Server
```

Use the Replit workflow controls to start or restart them. Do not start the entire workspace with a root-level `pnpm dev`; the root package intentionally has no development server.

### Run individual services

The web and API commands expect workflow-provided environment variables:

```bash
pnpm --filter @workspace/gulani-marketplace run dev
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/mockup-sandbox run dev
```

The web artifact requires:

- `PORT`
- `BASE_PATH`

The API service requires:

- `PORT`

The current artifact configuration uses the shared proxy paths:

- Web: `/`
- API: `/api`
- Mockup sandbox: `/__mockup`

## Development commands

Run the full typecheck:

```bash
pnpm run typecheck
```

Check only the marketplace frontend:

```bash
pnpm --filter @workspace/gulani-marketplace run typecheck
```

Check only the API:

```bash
pnpm --filter @workspace/api-server run typecheck
```

Build the marketplace frontend:

```bash
pnpm --filter @workspace/gulani-marketplace run build
```

Build the API bundle:

```bash
pnpm --filter @workspace/api-server run build
```

Regenerate API clients and schemas after an OpenAPI change:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Push database schema changes in development after schema work:

```bash
pnpm --filter @workspace/db run push
```

Build and typecheck the workspace:

```bash
pnpm run build
```

## Environment and configuration

| Variable | Used by | Purpose |
| --- | --- | --- |
| `PORT` | Web and API services | Service listening port, supplied by the workflow |
| `BASE_PATH` | Web service | Vite artifact base path |
| `DATABASE_URL` | `@workspace/db` | PostgreSQL connection string |
| `SESSION_SECRET` | Workspace environment | Reserved for session/auth configuration |
| `NODE_ENV` | API service | Runtime mode |

Do not commit secrets or copy secret values into the repository. Use the workspace secrets/environment tooling.

## Deployment

The repository is configured for an autoscale application deployment:

- The API builds with `pnpm --filter @workspace/api-server run build`.
- The API runs from `artifacts/api-server/dist/index.mjs`.
- The web artifact builds with `pnpm --filter @workspace/gulani-marketplace run build`.
- The web artifact is served statically from `artifacts/gulani-marketplace/dist/public`.
- Client-side routes rewrite to `index.html`.
- The API health startup path is `/api/healthz`.

Before publishing, run the typecheck, build the affected artifact, and verify the relevant workflow preview.

## Current limitations and production work

The following areas are intentionally still first-phase or seeded:

- Marketplace and admin records are primarily in memory rather than persisted in PostgreSQL.
- Admin authentication, authorization, roles, permissions, and audit logs are not production-ready.
- Payment confirmation is a demo flow; real Mobile Money, Visa, and gateway settlement integrations still need to be connected.
- Dedicated persistent APIs are still needed for the full products, customers, finance, promotion, moderation, notification, and activity-log sitemap.
- Delivery partner integrations and real shipment tracking are not connected.
- Reporting and analytics use seeded or derived summaries rather than a production reporting warehouse.
- Customer accounts and sessions need a complete production authentication flow.

## Design and product direction

Gulani is intentionally warm, editorial, and marketplace-led rather than a generic dashboard:

- Teal primary brand color with a citrus accent
- Warm, readable surfaces and strong display typography
- Compact operational tables and clear status pills in admin areas
- Mobile-first customer and vendor experiences
- Clear sourcing labels so customers understand local versus imported fulfillment
- Human-readable empty, loading, error, and confirmation states

## Contributing guidelines

- Preserve the existing pnpm workspace structure.
- Keep API changes contract-first through `lib/api-spec/openapi.yaml`.
- Regenerate clients after OpenAPI changes.
- Prefer existing generated hooks over handwritten fetch calls.
- Keep frontend state synchronized after mutations by invalidating or updating affected React Query caches.
- Use the existing shared theme and UI primitives before introducing new visual patterns.
- Do not add fake persistence to flows that appear to save important data.
- Run the relevant typecheck after code changes and the full workspace typecheck before a broad release.

## License

This repository currently declares an MIT license in the root workspace package metadata.
=======
# Gulani
>>>>>>> 49b691dab3cb0c3fad79e4be6309ff9f68c8f14f
