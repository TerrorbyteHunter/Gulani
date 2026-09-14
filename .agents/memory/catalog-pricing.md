---
name: Global sourced marketplace
description: Product direction and pricing model for external catalog imports.
---

Gulani is not a Lusaka-only marketplace. The storefront is intended to display products from local sellers and external catalog sources such as Taobao. Imported products should retain source identity and supplier/base cost separately from the customer-facing price.

**Why:** The product roadmap depends on bringing external products into the catalog while giving Master Admin control over the commercial margin before publishing them.

**How to apply:** New catalog adapters should map each product to a source identifier and base price, then apply the matching active percentage pricing rule, falling back to the default imported-product rule. Keep customer currency and delivery geography configurable rather than hardcoding Lusaka.