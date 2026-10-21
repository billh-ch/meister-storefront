# Storefront product translations

## Server contract

The WooCommerce product remains the only fulfillment identity. Product and variation IDs, slug, SKU, attributes/options, measurements, stock and prices are never translated. English is the default; Greek uses the existing `/el` routing and locale typography.

The custom plugin exposes **authenticated** REST inputs:

- `meister_translation_source`: `{ name, short_description, description }` from raw WooCommerce edit-context getters, all strings.
- `meister_translations`: version-1 translation object. The plugin removes its corresponding entry from normal `meta_data`.

The reader prefers an explicitly present top-level `meister_translations` field. An invalid top-level value cannot resurrect a legacy metadata value. For compatibility it can read exactly one `meta_data` entry only when the top-level field is absent. Without a valid raw source field, translations are never trusted: the existing REST-rendered authored content remains visible.

A locale entry is visible only with `status: published` and a matching lowercase SHA-256 source hash. The hash is over the exact UTF-8 bytes of `name + NUL + short_description + NUL + description`, without HTML/entity/Unicode/newline normalization. Missing descriptions hash as empty strings. PHP and TypeScript share `wordpress/fixtures/product-translations-canonical.json` (Greek, entities, CRLF, combining Unicode and empty descriptions).

Missing, stale, draft, unknown-version and malformed entries fall back to authored content. Each blank, non-string or oversized field falls back independently. Limits match PHP: 1,000 UTF-8 bytes for titles, 100,000 for each HTML description. The existing product HTML sanitizer runs after projection for both original and translated HTML.

`lib/product-content/translations.ts` imports `server-only` and Node crypto. Neither raw source nor translation metadata is copied into public product objects. Comparison's server mapper is in `lib/compare/map-product.ts`; its browser model remains server-dependency-free.

## Locale and caching

Woo fetches/cache tags store the original bilingual REST response. Locale projection happens **after** fetching, using an explicit argument (`en` by default), with no global mutable locale. Cart repricing still uses fresh no-store Woo reads. Static product params, published sitemap data and technical agent tools retain their English-default interfaces.

Server pages pass their request locale through homepage rails/cards, collection/shop/search results, PDP/related products, product metadata/structured data, cart and checkout display. Stable catalog APIs validate `locale=en|el`; omission means English, invalid explicit locale is HTTP 400. Wishlist, comparison, drawer, recommendations and suggestions send locale explicitly. Cookies, saved IDs, checkout signatures and fulfillment identifiers remain unchanged.

## Verification

Unit tests:

```sh
npm test
npm run lint
node node_modules/typescript/bin/tsc --noEmit
node tests/i18n-audit.mjs
```

Self-contained real-REST-shape browser fixture:

```sh
node tests/product-translations.browser.mjs
```

The fixture starts its own local Woo/Store API and Next server; it overrides backend credentials and disables Redis through an intentionally unconfigured prefix. It never uses the Pi, Stripe, shared Redis or real orders. Use `CHROMIUM_PATH` if Chrome is not installed at the macOS default. Artifacts go under `BH_AGENT_WORKSPACE` or `~/.hermes/cache/scratch/meister-product-translations`. Optional port overrides are `TRANSLATIONS_APP_PORT` and `TRANSLATIONS_FIXTURE_PORT`.

Builds must also explicitly set mock mode and disable shared Redis. The preview's mock configuration does not demonstrate Vercel-to-Pi connectivity, plugin installation or published product translations. Those require a separately verified private backend connection and reviewed publication.
