---
name: Package firewall upgrades
description: How to handle package installs blocked by a transitive dependency in this workspace.
---

When a workspace install receives a package-firewall 403 for an older transitive dependency, identify which direct dependency brings it in and try the latest compatible version of that parent. Do not bypass the firewall or pin around it without first trying the parent upgrade.

**Why:** In October 2026, the API server's Express 5.2.x dependency resolved to `proxy-addr` 2.0.7, which the firewall rejected. Updating Express within the same major version resolved to `proxy-addr` 2.0.8 and allowed installation.

**How to apply:** Check the lockfile dependency chain and the package registry's latest compatible versions, update the direct parent, then rerun the frozen workspace install.
