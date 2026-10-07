# Storefront Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve discoverability, product clarity, update reliability and measured purchase completion without inventing product or business facts.

**Architecture:** Keep WooCommerce as the product source of truth and Next.js as the presentation/SEO layer. Add focused SEO, content, cache-invalidation and measurement helpers; preserve server-resolved carts and server-side payment validation. Provider integrations and business claims remain disabled until their prerequisites are available.

**Tech Stack:** Next.js 16.2.12, React 19, TypeScript, WooCommerce REST/Store API, Stripe Checkout, Upstash Redis, Node tests, Playwright.

**Spec:** [Optimization brief](../specs/2026-10-07-storefront-optimization-design.md)

## Global Constraints

- Preserve current bilingual content; English conversion is a separate later project.
- Preserve the existing visual identity, card cover images and desktop sizing.
- `main` automatically deploys production; implementation is reviewed on preview branches before owner-authorized promotion.
- Secrets belong in environment settings, never documents or chat.
- No invented ratings, SKU/GTIN/brand, condition, expiry dates, free shipping or policy terms.
- Keep cart, account, checkout and address-dependent responses private/uncached.
- Recheck prices, stock and shipping before payment.
- Do not change backend product content, slugs, hosting, payment mode or advertising spend as part of an unapproved frontend release.
- Consult installed Next.js documentation before framework changes. Do not enable Cache Components or upgrade Next.js just to apply generic advice.

## Review Focus

1. Backend outage must not expose demo products as purchasable, indexable or real sitemap entries — Tasks 1–2.
2. Greek, already encoded and malformed slugs must not double-encode or break canonical/404 behavior — Tasks 2 and 5.
3. Wildcard/empty-attribute variations and different selections of one product must retain accurate identity, prices and labels — Tasks 3 and 6.
4. Duplicate/delayed webhook delivery and failure after order creation must not lose or duplicate paid orders — Task 6.
5. Consent refusal, repeated confirmation visits and test traffic must not produce unwanted tracking or duplicate purchase events — Task 7.

## Sequence and release batches

| Batch | Tasks | Can begin without new business content? | Main prerequisite |
| --- | --- | --- | --- |
| A: Baseline and technical SEO | 1–2 | Yes | Real-data preview configuration for acceptance |
| B: Schema and readable content | 3–4 | Yes, except policy/condition claims | Representative real product fixtures |
| C: Product updates and speed | 5 | Measurement can begin | WooCommerce webhook setup for end-to-end tests |
| D: Purchase reliability and conversion | 6 | Investigation and neutral UX can begin | Test payment/backend integration; approved trust facts for publication |
| E: Measurement and marketing | 7–8 | Contracts/design can begin | Owner-selected providers, IDs, consent wording and business terms |

A reproduced order/payment integrity issue takes precedence over later release batches. Each task is an independently reviewable deliverable; do not combine all tasks into one production change.

### Task 1: Establish real-data acceptance and a reproducible baseline

**Files:** Create `tests/seo.browser.mjs`, `docs/guides/preview-validation.md`; update `tests/README.md` and `package.json` scripts only when the checks are executable.

**Interfaces:** Existing `getProducts()`, `getProductById(id)` and cart actions. Produce a baseline report identifying route, device, product ID/type, expected data source, status and measurement method, with no secrets/customer data.

- [ ] Inspect Preview-scoped Vercel variables, deployment logs and backend reachability through authorized access. Compare names/scopes, never print key values. Verify `NEXT_PUBLIC_USE_MOCK_DATA=false` for real-data acceptance.
- [ ] Reproduce the reported preview “Invalid request”; determine rejected field from controlled diagnostics. Test missing backend configuration, outage fallback and malformed product IDs separately. Preserve strict numeric WooCommerce ID validation.
- [ ] Capture home/shop/category/PDP/cart/checkout baselines at 360, 375, 390, 768 and 1440px. Include simple, variable, legacy/no-variant, sale, sold-out, backorder, Greek-slug and missing-image fixtures.
- [ ] Document a failing acceptance check when an outage preview is mistaken for real products. Improve explicit unavailable/error states only after the cause is established; do not make dummy IDs purchasable.
- [ ] Confirm real-data add/edit/remove/image/shipping checks. Test payments require Stripe test mode and a development database; no live charges.
- [ ] Commit documentation/checks with their deliverable. Block real-data readiness claims if preview access or service configuration remains unresolved; continue independent SEO work.

### Task 2: Canonical URLs, metadata, sitemap and indexing policy

**Files:** Create `lib/seo/site.ts`, `lib/seo/metadata.ts`, `app/robots.ts`, `app/sitemap.ts`, `tests/seo.test.mjs`; modify `app/layout.tsx`, `app/products/[slug]/page.tsx`, `app/shop/page.tsx`, `app/[category]/page.tsx`, `app/search/page.tsx`, and metadata for cart/checkout/account/auth routes. Add a real-product-only catalog interface in `lib/woocommerce/index.ts` for sitemap use.

**Interfaces:** `getPublicSiteUrl(): URL` uses `NEXT_PUBLIC_SITE_URL` with the confirmed Vercel production URL fallback, never request Host headers. `canonicalProductUrl(slug: string): string` encodes a decoded path segment once. `plainTextDescription(html: string, maxLength: number): string` decodes entities and normalizes whitespace. `getPublishedProducts(): Promise<Product[]>` fetches published real products and throws on outage; it never returns mocks.

- [ ] Add failing tests: Greek/encoded slugs yield one encoding; malformed percent strings do not crash; canonical URLs never target localhost/preview; descriptions do not expose entities/HTML or cut a surrogate pair; filtered/search/private/demo pages have noindex.
- [ ] Run `npm test` and observe the expected failures; implement the helpers and per-route metadata with unique titles, descriptions and social previews. Use only confirmed brand/location facts.
- [ ] Implement sitemap/robots from confirmed origin, category registry and `getPublishedProducts()`. Tests assert published real products only, correct 404 handling, no fake modification dates and retryable behavior on backend outage. Do not map demo fallback content into the sitemap.
- [ ] Add browser checks for canonical tags, pagination/filter policy, social metadata and preview robots. `/robots.txt` and `/sitemap.xml` must return valid production output; robots restrictions are not security controls.
- [ ] Run unit/browser checks, lint, TypeScript and build; validate deployed metadata on representative real URLs. Commit as a focused SEO release.

### Task 3: Accurate product and breadcrumb structured data

**Files:** Create `lib/seo/structured-data.ts`, `tests/structured-data.test.mjs`; modify product page and `lib/mock-data.ts`/WooCommerce mappers only where real additional fields are needed. Extend category/home schema only with verified business facts.

**Interfaces:** `buildProductStructuredData(product: ProductDetail, canonicalUrl: string): Record<string, unknown>`, `buildBreadcrumbStructuredData(items: { name: string; url: string }[]): Record<string, unknown>`, `serializeStructuredData(value: unknown): string` escapes `<` before embedding JSON.

- [ ] Write failing tests for simple/sale/sold-out/backorder products, differing variant prices, missing identifiers, empty-attribute legacy variants, wildcard axes and `</script>` in product data. Assert EUR prices and availability match the visible real offering; no invented ratings/identifiers/policy values.
- [ ] Run the tests red; extract current schema and implement offer/variant semantics using supported Schema.org/Google patterns. Use parent-level conservative output where variant data cannot support exact offers. Add breadcrumb URLs matching Task 2.
- [ ] Keep shipping, returns, condition and reviews omitted until the owner supplies authoritative facts/data. Missing optional fields are preferable to false claims.
- [ ] Validate representative real pages with Google's Rich Results Test and Schema.org validator when accessible; distinguish structural errors, optional warnings and eligibility. Run suite/build, then commit.

### Task 4: Description normalization and catalog editing guidance

**Files:** Modify `lib/sanitize.ts`, `lib/woocommerce/mappers/map-product-detail.ts` and product prose styles only as needed; create `lib/product-content/normalize-description.ts`, `tests/product-content.test.mjs`, `docs/guides/product-content-template.md`.

**Interfaces:** `normalizeProductDescription(html: string): string` normalizes only documented legacy patterns before `sanitizeProductHtml`; `plainTextDescription` from Task 2 shares metadata text extraction.

- [ ] Write failing fixtures: real `>` feature-list text becomes readable list items; literal comparisons/brackets remain intact; shortcodes/malformed HTML do not leak unsafe markup; encoded characters decode correctly; existing paragraphs/tables/links survive.
- [ ] Run red; implement targeted normalization followed by sanitization. Do not use unrestricted regex replacement to interpret arbitrary HTML. Do not guess missing characters or rewrite product claims automatically.
- [ ] Compare before/after on representative real descriptions and verify mobile readability and screen-reader heading order.
- [ ] Produce an owner template: short benefit summary, suitability, factual specifications, sizing/compatibility, included items, maintenance, availability and approved delivery guidance. Draft a small example set from existing facts; WooCommerce publication remains owner-controlled.
- [ ] Run tests/lint/types/build and commit the formatting improvements and guide.

### Task 5: Measured caching, update invalidation and performance

**Files:** Modify `lib/woocommerce/client.ts`, catalog/detail queries, product route, `next.config.ts`, gallery/hero/font code only where measurement warrants; create `app/api/webhooks/woocommerce/route.ts`, `lib/woocommerce/webhook-signature.ts`, `tests/woocommerce-webhook.test.mjs`, `docs/guides/cache-validation.md`.

**Interfaces:** `verifyWooCommerceWebhook(rawBody: Buffer, signature: string, secret: string): boolean` verifies WooCommerce base64 HMAC-SHA256 with constant-time comparison. Product detail fetches include an ASCII-safe `product:<id>` tag so a signed event can invalidate that product, shared catalog and sitemap-derived data. `WC_WEBHOOK_SECRET` is server-only.

- [ ] Measure repeated-request backend counts, warm/cold page response times and stale-data behavior with current 30/60-second settings. Test the Greek route on Vercel before changing `force-dynamic`; record Data Cache and HTML cache separately.
- [ ] Add failing signature/raw-body/bounded-payload tests; wrong or missing secret must never invalidate. Duplicate product update/delete deliveries must be safe. Verify changes refresh product metadata/schema/listings/related products and sitemap.
- [ ] Implement the authenticated webhook and targeted invalidation using this Next.js version's documented `revalidateTag` behavior. Keep periodic freshness as a fallback. Document WooCommerce admin webhook registration for the owner.
- [ ] Test missing/deleted products and outages, plus private cart/account/checkout responses. Do not globally cache address-dependent rates or payment state.
- [ ] Fix measured LCP/image/font/client-work bottlenecks individually. Keep requested card cover fitting; test long-product detail galleries separately. If URL migration is required, prepare redirect inventory as a separate owner-reviewed project instead of changing slugs here.
- [ ] Compare identical before/after performance runs and backend call counts, run suite/build and commit. End-to-end webhook acceptance waits for owner configuration if admin access is unavailable.

### Task 6: Purchase integrity and conversion friction

**Files:** `lib/checkout/actions.ts`, `app/api/webhooks/stripe/route.ts`, `lib/woocommerce/queries/create-order.ts`, confirmation routes/components, cart/product controls, hero/category/empty-state components and trust content as relevant; create `tests/commerce.integration.mjs` and `docs/guides/commerce-reconciliation.md`.

**Interfaces:** Preserve existing cart line identity and `CartActionResult`. Financial redesign interfaces are intentionally defined in a separate design after the capability investigation below; this task does not authorize an unverified fulfillment architecture.

- [ ] Reproduce with integration tests: large multi-axis carts must retain every selected fulfillment option; duplicate/concurrent paid events; timeout after a successful WooCommerce write; Redis write failure after order creation; delayed/failed payments; price/tax/shipping changes between session creation and fulfillment. Assert one order with correct customer, options and charged/order total reconciliation.
- [ ] Identify authoritative WooCommerce payment lookup/uniqueness capabilities. Produce a specific fulfillment/snapshot design addressing demonstrated failures; determine whether a backend plugin or durable snapshot store is required. Owner backend configuration may be a prerequisite; do not claim Redis locking alone proves uniqueness.
- [ ] Implement the reviewed financial fix separately, with failing tests first and the above integration matrix passing. Never solve Stripe metadata limits by silently discarding required options.
- [ ] Improve neutral conversion UX: explicit item/variation errors, retry states, selection guidance, category quick links, visible product discovery, helpful empty-cart recommendations and keyboard/mobile usability. Recommendations use actual category relevance, not fabricated bestseller/margin claims.
- [ ] Publish contact/policy pages and replace trust claims only when owner-approved facts exist; until then remove misleading promises. Validate every footer/support destination, accessible interactions and all existing cart regressions.
- [ ] Commit financial and presentation deliverables separately; report any external integration checks that could not run.

### Task 7: Conversion measurement with consent

**Files:** Create `lib/analytics/events.ts`, `lib/analytics/provider.ts`, consent UI/storage helper, `tests/analytics.test.mjs`; modify product/list/cart/checkout/confirmation components only at successful event boundaries. Add `docs/guides/measurement.md`.

**Interfaces:** `trackEcommerceEvent(event: EcommerceEvent): void`; supported names are `view_item`, `select_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `purchase`. Payload uses product/variation IDs, quantity, item price, EUR value, list ID and confirmed transaction ID where applicable. It excludes names/emails/addresses/customer identifiers. `setAnalyticsConsent(allowed: boolean): void` gates provider dispatch.

- [ ] Write failing tests for consent refusal/revocation, failed cart actions, successful quantity deltas, demo/test exclusion, SPA navigation and revisited confirmation pages. Purchase requires confirmed fulfillment state and is deduplicated by transaction ID.
- [ ] Implement provider-neutral events; activate GA4 only after the owner chooses the provider and configures its property ID, consent wording and test-traffic policy. Document blocked dependencies rather than install multiple trackers speculatively.
- [ ] Verify event sequence/value/quantity in the provider's debug tooling and a complete test purchase. Never send purchase from an unverified redirect alone. Prevent server/client double counting.
- [ ] Document funnel definitions and baseline: product view -> successful add -> checkout -> confirmed purchase, with device/source segmentation, cancellations/refunds and consent-related reporting limitations. Commit integration and guide.

### Task 8: Email capture, product feed and operational marketing handoff

**Files:** `components/newsletter-section.tsx`, `components/footer.tsx`, provider-specific server subscription action/helper and tests once provider is chosen; optional feed route/model tests; `docs/guides/marketing-operations.md`.

**Interfaces:** Subscription returns `{ ok: true } | { ok: false; error: string }`, validates email and consent, uses server-only provider credentials and appropriate rate limiting. Product feed uses Task 2 canonical URLs and Task 3 accurate product/offer data.

- [ ] Owner selects email provider/sender and supplies approved signup wording. Test valid/invalid/duplicate requests, missing consent, abuse limits, provider timeout and failure. Successful UI must mean provider acceptance; keep the form disabled until configured.
- [ ] Implement subscription integration and unsubscribe/double-opt-in behavior supported by the chosen provider. No invented welcome discount.
- [ ] If owner establishes Merchant Center access, validate a product feed against real inventory, policies, identifiers, image URLs and visible prices. Test variants, unavailable products and refresh behavior; do not publish a fabricated feed or auto-launch campaigns.
- [ ] Produce follow-up checklists for Search Console, Merchant Center, email flows, UTMs, genuine reviews and campaign measurement. Backend coupons, campaign content/budgets and abandoned-cart consent/settings are owner tasks.
- [ ] Run checks, provider sandbox tests and preview review; commit only configured, independently testable integrations.

## Common release verification

For each code release, run the affected regression tests plus `npm test`, `npm run lint`, `node node_modules/typescript/bin/tsc --noEmit` and `NODE_USE_ENV_PROXY=1 npm run build`. Run `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` against the documented mock server; identify it as mock verification. Add real-data/integration evidence separately. Stop development server before build.

Review source changes, deployed preview, dependencies and rollback reference. Do not claim conversion improvement without comparable measured data. Promote to production only after the owner chooses to publish that concrete release.

## Owner handoff

See [owner checklist](../../guides/storefront-owner-checklist.md). Required owner actions are dependencies with their own timing; technical SEO/content formatting can proceed before all marketing choices are made.
