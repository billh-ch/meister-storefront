=== Meister Product Translations ===
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 1.0.0
License: GPL-2.0-or-later

Reviewable English/Greek product text on existing WooCommerce product IDs.
Requires WooCommerce. Classic product editor and WooCommerce > Product translations.
Only published translations matching the raw source hash are shopper-visible via
an accompanying storefront reader. This plugin does not change WordPress front-end templates.

Import/export: 50 products, 2 MiB per job. UTF-8 byte limits: name 1000;
short_description and description 100000 each, for source and translation.
Generate: max 3 products, 20000 source bytes each. Draft-only, no overwrite.
Apply reserves every product before provider calls using separate generation
option locks, retained through guarded import and released on success/error.
Dry runs take no locks and make no provider calls. Crash recovery: only remove
meister_translation_generate_lock_<ID> or meister_translation_lock_<ID> after
verifying no matching generation/import operation remains active. No automatic
expiry: deleting an active reservation can cause duplicate provider charges.
All bulk mutations default to dry-run. Explicit application, overwrite and
publication are independent controls. Provider usage requires confirmation.

Server-only OPENAI_API_KEY constant/environment; MEISTER_TRANSLATION_MODEL optional,
default gpt-5-mini-2025-08-07. No browser API key or credential storage.
No automatic paid enrollment. A custom server callable may be supplied with the
meister_translation_provider filter. Product source is sent to the configured
provider only when explicitly generating. OpenAI request store:false does not
replace reviewing the provider's data retention policy.

Deactivation retains translations. No uninstall data deletion or cron generation.
See repository wordpress/README.md for full operations, backup and rollback.
