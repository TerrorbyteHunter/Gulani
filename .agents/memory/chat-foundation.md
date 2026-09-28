---
name: Chat foundation
description: Phase 1 chat/support API constraints and the transition path to production auth and persistence.
---

The chat foundation currently uses required `x-gulani-user-id`, `x-gulani-user-role`, and optional `x-gulani-vendor-id` headers because the repository does not yet have session authentication or database-backed marketplace routes. New chat endpoints deny requests without an identity and centralize permission checks so the future session middleware can provide the same actor shape.

**Why:** Existing marketplace/admin routes are seeded and unauthenticated, so inferring identity or importing the database connection into the API would create a false production-security boundary or crash environments without `DATABASE_URL`.

**How to apply:** Replace the header adapter with the real session principal before enabling chat UI in production, then move the service maps to the additive Drizzle schema/migration without changing the REST authorization rules.