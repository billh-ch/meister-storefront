=== Meister Product Add-ons ===
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 1.0.0
License: GPL-2.0-or-later

Optional paid add-ons per product for the Meister headless storefront.

== Description ==

* Classic product editor box "Add-ons (paid extras)": groups (choose one, or any number), options, English and Greek names, prices in EUR including VAT.
* Stored as the product meta `meister_addons` (JSON, version 1). Invalid data is refused on save with a message; nonce and edit_product capability are checked.
* REST product responses carry `meister_addons_pricing: 1` so the storefront knows add-ons will be priced on orders.
* New REST orders: lines with the hidden `_meister_addons` meta (ids only) are re-priced from the product's own add-ons with WooCommerce's VAT logic, and each add-on is recorded as visible line meta.
* Product duplication keeps the add-ons. WP-CLI: `wp meister-addons get|set`.

Full documentation: docs/guides/product-addons.md in the storefront repository.
