# Storefront locale contracts

English stays at existing URLs; Greek uses `/el` and `/el/...`. The proxy
rewrites shopper paths and unknown nontechnical Greek paths to the existing
page tree (unknown paths render the branded Greek404). Add
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
`LocalizedLink`, accepting Next Link props (including UrlObject hrefs, localized `as` aliases and refs).
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
local storage and reuses an explicit Greek choice only on a bare homepage entry at `/`.
Direct English links and entries with query/hash keep English. This mount-only
client preference navigation never intercepts Server Action POST requests. Root font aliases cover existing
inline body and heading references. Cascadia Mono supplies Greek for both
locales and is the primary body/heading font on Greek pages; weights cap at700.


Customer dictionaries separate interface phrases, authored information/showcase
copy and static Greek country display names. Country codes, filter/sort values,
variant options, catalog descriptions and amounts are unchanged. Known legacy
cart/comparison notification templates are translated as complete sentences.
Run `node tests/i18n-audit.mjs` to inventory authored customer phrases and raw
JSX text; catalog values and technical docs are deliberately excluded.

The proxy decodes/normalizes paths only for service and authentication boundaries;
raw bytes remain unchanged in rewritten product paths. Decoded technical/asset
prefixes are blocked, and encoded account paths use the same session guard.
`lib/business-contact.ts` is the shared leaf source for the published business
contact; `lib/agents/content.ts` keeps its existing BUSINESS_CONTACT export.


`localeSwitchPath(current, locale)` in `navigation.ts` transforms the current
nontechnical shopper URL, including unknown URLs that render404, while normal
`localePath`/LocalizedLink destinations keep their explicit allowlist. The
switch classifier decodes/normalizes only for technical-path exclusion and
preserves original query/hash and encoded catalog bytes in the generated URL.
The cart variation formatter accepts an optional third `displayName` callback;
UI callers pass their translator, while the default/raw integration behavior
and stored attribute keys/values remain unchanged.
