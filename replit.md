# Gulani Marketplace

Gulani is a mobile-first Lusaka marketplace for discovering products from local vendors, checking out as a guest or account holder, and tracking local or sourced orders.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/gulani-marketplace` — customer storefront, checkout, order history, vendor application, vendor portal, and operations dashboard.
- `artifacts/api-server/src/routes/marketplace.ts` — Phase 1 catalog, cart, checkout, orders, vendor, and admin endpoints.
- `lib/api-spec/openapi.yaml` — source of truth for the shared API contract.
- `lib/api-client-react/src/generated` and `lib/api-zod/src/generated` — generated client hooks and validation schemas.

## Architecture decisions

- The app is API-first: the web storefront consumes generated React Query hooks from the shared OpenAPI contract.
- Payment options are limited to MTN Mobile Money, Airtel Money, and Visa in the launch UI; cash on delivery is intentionally excluded.
- Delivery is constrained to Lusaka in the checkout contract, with a configurable-feeling fee rule and free delivery above ZMW 600.
- Vendor fulfillment and sourced/import fulfillment share the same product and order surfaces, with the fulfillment mode carried on the product and cart item.

## Product

- Customers can browse/search categories and products, choose variants, add to a multi-vendor cart, and check out as a guest.
- Customers can view confirmation and order timelines, and vendors can apply through the storefront.
- Vendor and admin dashboards expose the Phase 1 operational queues and summary metrics.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Regenerate the API client and Zod schemas after every OpenAPI change with `pnpm --filter @workspace/api-spec run codegen`.
- The current API route data is seeded in memory for the first build; wire it to the provisioned PostgreSQL schema before production use.
- The payment flow currently confirms the selected method as a demo flow; connect the chosen gateway after the launch provider decision is made.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
