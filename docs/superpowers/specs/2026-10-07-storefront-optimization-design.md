# Meister storefront optimization brief

Date: 7 October 2026. Baseline: production merge `67067242d7221aeaf3aa22edb55cbb5c6d279628`.

## Outcome

Make real products easier to discover, understand and purchase, with accurate search metadata, dependable product updates and measurable shopping behavior. Improve the existing Next.js/WooCommerce storefront, preserving its visual identity and current bilingual content. English conversion is a separate later project.

This release contains planning documents only. Implementation should proceed in reviewable preview releases; `main` automatically deploys production.

## Evidence and current state

Reviewed the two supplied October 2026 audit documents, the earlier remediation roadmap and the current source. Recommendations in the audits are inputs to evaluate, not instructions to publish their sample policies, discounts or schema claims.

Read-only live checks on 7 October 2026:

| Check | Finding |
| --- | --- |
| Home and shop | HTTP 200; no canonical link observed; no JSON-LD on these routes |
| `/robots.txt` and `/sitemap.xml` | HTTP 404 |
| `/returns` | HTTP 404; source also lacks privacy, terms, contact and about routes |
| Sampled real product | HTTP 200; basic Product/Offer JSON-LD and title exist; no canonical observed |
| Cart and search | HTTP 200; no explicit noindex observed |
| Caching source | Catalog fetch requests 60-second revalidation; detail/variation fetches request 30 seconds; PDP uses `force-dynamic` |
| Marketing source | No analytics/consent/event integration found; newsletter remains disabled |
| Preview | Previous preview redirected automation to Vercel login; owner reported add-to-cart “Invalid request” there |

Recent production work already addressed mobile overflow, named-country selection, shipping refresh, cart feedback/drawer, card sizing/images, selected-option editing and popup thumbnails. Do not rebuild these features unnecessarily; preserve their regression checks.

Remaining purchase risks found in source: checkout can drop extra options when Stripe metadata grows beyond its limit; webhook locking alone does not prove exactly-once fulfillment after a partial failure; WooCommerce calculates order prices later than Stripe's charge. These require integration tests, not assumptions that they are already broken in production.

Access: repository and GitHub are available; public production pages can be inspected. WooCommerce variables exist in the cloud, but prior cloud requests failed. Vercel project settings, preview logs, Search Console, analytics, email tools, advertising accounts, DNS and WordPress administration are not verified accessible. Presence of variables is not proof of service readiness. Secrets belong in environment settings, never documents or chat.

## Recommended approach

Deliver several focused releases, rather than one broad redesign. Start with real-data preview validation and technical SEO, then content/schema, measured caching/performance, shopping reliability and conversion, and finally marketing integration. Purchase reliability work can run ahead of cosmetic work if integration tests expose failures. Defer paid traffic until purchase measurement and order reconciliation are validated.

An alternative is a large storefront/backend migration; it changes too many variables to review easily. Content-only edits help shoppers but leave indexing, update and measurement gaps. Neither is the recommended first approach.

## Design decisions

### 1. SEO and URLs

Introduce one configured public storefront origin for canonical/search URLs, separate from backend origin and payment redirect origin. Until the owner confirms a custom domain, use `https://meister-storefront.vercel.app`. A domain change requires redirects and Search Console updates; do not silently pick `meister.gr` or `dive-meister.com`.

Use unique titles/descriptions, consistent Open Graph/Twitter metadata, canonical URLs, a published-product sitemap, and explicit indexing rules. Preview/demo, search, account, login, cart and checkout pages must be excluded from indexing; robots restrictions do not replace authentication. Filter/sort/search URLs must not create unlimited indexable duplicates. Unfiltered pagination gets page-specific URLs; filtered/sorted views get noindex and an appropriate base collection canonical. Preserve Greek URLs and test their encoding.

Sitemaps contain published real products and real public routes, never outage mock products. On backend failure, use the last verified sitemap or return a retryable error, rather than claiming demo products are real. Do not invent last-modified dates.

### 2. Product schema and descriptions

Extract reusable, safely serialized Product/Offer and BreadcrumbList builders. For variable products, model actual selectable offers and their availability/price; do not label a parent's lowest price as the exact price of every selection. Empty-attribute legacy variations need conservative parent-level output until their data is repaired. Add business/website identity only using verified public facts.

No invented ratings, SKU/GTIN/brand, condition, expiry dates, free shipping or policy terms. Shipping and returns schema are dependency-gated on confirmed countries/rates/rules; `EU` is not an ISO country code. Valid schema does not guarantee Google rich results.

Normalize known legacy text patterns before sanitization, keeping lists, tables, links and headings readable. Use fixtures for literal `>` feature lists, shortcodes, entities, malformed HTML and legitimate bracket text. Broken encoding and missing factual descriptions belong in WooCommerce editorial work; do not guess repairs or manufacture specifications. Draft an owner-maintained description template and examples without overwriting product records.

### 3. Caching and performance

Measure actual backend requests, cache behavior and page timings before changing cache settings. Request memoization, Data Cache and full-route/CDN caching are different; source comments do not prove deployed behavior. Keep cart, account, checkout and address-dependent responses private/uncached. Recheck prices, stock and shipping before payment.

Keep current freshness windows until measurement justifies a change. Add signed WooCommerce product-update invalidation with bounded input, raw-body HMAC verification and a periodic revalidation fallback. Update/delete events must refresh details, catalog, related products and sitemap. Duplicate deliveries must be harmless.

Do not remove the Greek-slug dynamic workaround or transliterate the catalog blindly. Reproduce the header issue on current Next.js/Vercel; try a compatible fix on preview. If changing URLs remains necessary, first produce an old-to-new redirect map and secure owner approval for the backend migration.

Optimize actual LCP images, responsive image sizes, font loading, repeated product requests and unnecessary client work. Preserve the requested cover-style cards and current desktop sizing. Image CDN/media offload is optional until measurement shows a need; stable backend hosting is a prerequisite for reliable commerce.

### 4. Conversion and reliability

Use clearer category/product discovery, truthful availability and selection guidance, helpful empty states and better loading/error/retry states. Improve simple, variable, backorder, sold-out and missing-image experiences. Clarify shipping/returns/support when the owner provides approved facts. Remove placeholders rather than replace them with guessed promises.

Test payment-to-order totals, selected options, signed-in/guest flows, delayed payments and duplicate/retried fulfillment. Resolve any reproduced financial/data-loss issue before increasing traffic. Separate architecture work required by those tests into a specific reviewed design; do not treat a Redis lock as a permanent uniqueness guarantee.

### 5. Measurement and marketing

Prepare a provider-neutral ecommerce event contract and a consent-aware integration, with GA4 as the suggested initial provider if the owner chooses it. Record view_item, select_item, add_to_cart, remove_from_cart, view_cart, begin_checkout, add_shipping_info and purchase. Events must reflect successful real actions; purchase is recorded from confirmed payment/order state and deduplicated by transaction ID. Exclude demo products/test traffic and avoid sending email, addresses or other personal data in event payloads.

Connect an owner-selected email provider with server-only credentials, validation, abuse controls, consent and honest success/error states. Enable only when the provider and approved subscription wording are available. Plan Merchant Center product feed support after canonical URLs, product facts and policies are correct. Ads, discounts, email campaigns, review publication and budgets require owner business decisions; no fabricated offers or reviews.

## Success and validation

- Real-data preview: simple and variable adds, independent line edits/removal, images, subtotal and test checkout work; no silent demo acceptance.
- SEO: correct production canonical URLs; sitemap/robots return valid output; preview/private/search routes noindex; encoded URLs/404 behavior pass.
- Schema: price/currency/availability match visible purchasable data; JSON-LD is safe and parses; representative pages validated with Google's tools when access permits.
- Content: fixture-based normalization preserves meaning and safe HTML; actual product facts remain owner-controlled.
- Cache: request counts and stale-data behavior measured; update/delete webhook tests refresh expected pages without exposing private data.
- Performance: before/after measurements on identical pages/devices; aim for field LCP <=2.5s, INP <=200ms and CLS <=0.1 at the 75th percentile when enough field data exists. Lab results are diagnostic, not proof of field performance.
- Commerce: exactly one correct order per tested paid session; no lost options or silent total mismatch; explicit recovery from injected failures.
- Marketing: event debug checks, consent gating and purchase deduplication pass; report conversion changes only after sufficient comparable data, never promise a percentage increase.

## Release policy

Each implementation release gets appropriate unit/browser/integration checks, lint, TypeScript, build, independent review and owner-visible preview evidence. Production promotion remains an explicit owner decision. A failed preview configuration is fixed or reported as a blocker, not used to claim real-data verification. Maintain a rollback reference for each production release.
