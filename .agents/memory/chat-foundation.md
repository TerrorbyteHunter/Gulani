---
name: Chat foundation
description: Phase 1 chat/support API constraints and the transition path to production auth and persistence.
---

The chat/support service stores conversations, participants and read markers, messages, tickets, and ticket events in the existing Drizzle/PostgreSQL schema. The remaining security boundary is the actor: remove the temporary demo-header adapter and derive identity from a verified session plus trusted server-side role/vendor associations. Never trust browser-supplied role or vendor IDs.

**Why:** The original headers only separated test actors before session auth existed; they are not proof of identity or authorization. Seller access must not be self-assigned through a request.

**How to apply:** Replace the adapter with the authenticated session principal and an operations-controlled vendor membership before enabling buyer/seller messaging for real accounts. Preserve participant checks and staff permission checks.

The user wants the admin panel and vendor login to be in different places for safety.

**Why:** The user explicitly asked for separate admin and vendor access points to reduce risk.

**How to apply:** Keep the entry routes or origins distinct as chosen, but enforce account roles on the server; a separate URL by itself is not a security boundary.

The web client must establish the authenticated session before mounting chat queries; otherwise React Query can cache an initial 401 result.

**Why:** The Messages page can render before the route effect runs, and React Query will otherwise retain the unauthorized result until invalidated.

**How to apply:** Wait for Clerk's signed-in state before enabling chat queries, and invalidate relevant queries when the session changes.