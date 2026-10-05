---
name: Clerk setup for imported projects
description: Replit-managed Clerk provisioning uses the workspace title, which can differ from the artifact display title.
---

For projects imported from ZIP files, check the Replit workspace/project title before provisioning managed Clerk. An archive-style title can be rejected as an invalid Clerk application name even when `artifact.toml` already has a clean product title. Rename the workspace title in the editor first; changing only the artifact title does not fix the generated auth app name.

**Why:** Managed Clerk provisioning rejected this imported project's generated title because it contained the ZIP suffix, while the registered artifact title was already clean.

**How to apply:** Rename the Replit project using its title control in the editor, then retry managed Clerk setup. Do not replace managed Clerk or hand-edit its generated keys to work around the title.
