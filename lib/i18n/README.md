# Storefront locale contracts

English stays at existing URLs; Greek uses `/el` and `/el/...`. The proxy
rewrites only the explicit shopper allowlist to the existing page tree. Add
new shopper routes to `isShopperPath` deliberately. API, assets, technical
documentation and public integration endpoints never receive a locale prefix.

`lib/i18n` exports `Locale`, `isLocale`, `validateLocale` (invalid input falls
back to English), `stripLocale`, `localeFromPath`, `localePath`, `isShopperPath`,
`translate`, `Translator`, and `TranslationValues`. Paths are not decoded or
re-encoded. Queries, hashes, product slug bytes and external URLs survive.

`lib/i18n/server` exports request-scoped async `getLocale` and `getTranslator`.
The proxy overwrites `x-meister-locale` and `x-meister-original-path` on all
matched requests; URL determines language. React cache scopes reads to the
render. There is no global locale or preference-cookie routing.

Client imports live in `components/i18n/locale-provider`: `LocaleProvider`,
`useLocale`, `useTranslation`, `useLocalePath`. Legacy standalone mounts default
to English. `components/i18n/localized-link` exports both named and default
`LocalizedLink`, accepting Next Link props (including UrlObject hrefs and refs).
For server-only path generation call the pure `localePath` with `getLocale()`.

Source English phrases are dictionary keys. Add small focused files under
`dictionaries/` and register them in `index.ts`. Interpolation uses `{name}`
and plain strings/numbers; unknown phrases fall back to their English source.
Preserve WooCommerce labels, model names and IDs; do not translate catalog
objects or replace browser DOM text.

`buildPageMetadata` and `buildCollectionMetadata` accept `input.locale` (English
by default). `buildProductMetadata(product, env?, locale?)` and
`canonicalProductUrl(slug, env?, locale?)` are pure; callers pass request locale
explicitly. Product names and existing catalog descriptions remain unchanged.
Public pages publish English/Greek/x-default alternates; private/filtered pages
omit alternates. Sitemap duplicates public shopper URLs, never docs, retaining
numeric-product validation and retryable outage responses.

The language switch uses a native anchor to refresh the shared root layout,
keeps exact current query/hash on activation, and records `meister_locale` in
local storage without automatic redirects. Root font aliases cover existing
inline body and heading references. Cascadia Mono supplies Greek for both
locales and is the primary body/heading font on Greek pages; weights cap at700.
