# Canonical source contract (v1)

Authenticated WooCommerce REST product responses gain `meister_translation_source`, an object with exactly `name`, `short_description`, `description`. Values are **raw Woo CRUD edit-context strings** from `get_name('edit')`, `get_short_description('edit')`, `get_description('edit')`; missing descriptions are `""`.

SHA-256 lower-case hex over UTF-8 bytes of `name + "\u0000" + short_description + "\u0000" + description`. No trim, HTML formatting, entity decoding, Unicode normalization or newline normalization. Do not hash REST display fields: they may have wpautop formatting. Keep original REST display fields as untranslated fallback. If canonical source is absent/invalid, fail closed to original display fields.

Storage: `meister_translations` product meta object, `version: 1`, locale keys `en`/`el`, each with status `draft|published`, `source_hash`, and optional name/short_description/description. Shopper uses only published, matching-source entries. Fields fall back independently when blank/invalid.

Shared fixture: `wordpress/fixtures/product-translations-canonical.json` (PHP tests consume this; TypeScript tests should consume the same file). Authenticated `meister_translations` response field is read-only; mutations use editor or guarded plugin endpoints, never generic REST meta writes.
