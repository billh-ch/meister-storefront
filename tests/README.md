# Storefront regression checks

Use Node 24 or newer for the built-in TypeScript test imports.

```sh
npm test
npm run lint
node node_modules/typescript/bin/tsc --noEmit
```

For browser checks, start a separate **mock-mode** development server:

```sh
NEXT_PUBLIC_USE_MOCK_DATA=true NODE_USE_ENV_PROXY=1 npm run dev -- --hostname 127.0.0.1 --port 3001
```

In another terminal:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

Alternatively install Playwright's Chromium with `npx playwright install chromium`
and omit `CHROMIUM_PATH`. `TEST_BASE_URL` overrides the local test server URL.
Keep this suite on a mock-mode server: it adds, updates and removes cart lines.
It verifies that attempting checkout in mock mode is rejected before contacting
Stripe; it does not pay or create customers/orders.

The browser checks cover five viewport widths, mobile menu operation, add
feedback, modal cart opening/closing, cart quantity/removal synchronization,
named-country selection, postcode-triggered shipping refresh, a failed rate
request, blocked payment and retry. Mock delivery/pickup options also exercise
preserving the chosen method during address typing. They verify development behavior; they
do not establish real WooCommerce/Stripe/Redis integration readiness.

The cart-options regression check seeds two valid cookie lines with different
selections and no variation ID, matching variable products whose WooCommerce
variation attributes are empty. It verifies each line can be updated and removed
independently and that the popup cart renders a loaded product thumbnail.

Stop the dev server before running `NODE_USE_ENV_PROXY=1 npm run build`.


## Technical SEO regression checks

Stop any Next.js development server in this checkout, then run:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:seo
```

This runner starts and stops its own app on port 3002 and a local WooCommerce
fixture server on a random port. It tests production and preview deployment-mode
metadata, headers, Greek canonicals, pagination, private/search exclusions,
robots and sitemap responses. It overrides backend settings with fixture-only
credentials and makes no real-store mutations or payments. It does not fix or
validate the protected Vercel preview cart connection.

`npm test` additionally verifies entity decoding, Unicode-safe descriptions,
sitemap 503/no-store/retry behavior, catalog limits and rejection of demo entries.

Product schema unit tests cover sale/stock/range/wildcard/legacy data and safe
JSON embedding. Content tests cover legacy feature lists, preserved bracketed
text and HTML sanitization. The SEO browser runner also checks rendered product
and breadcrumb JSON-LD against canonical URLs and description lists at 390px.

## Product cache and webhook checks

Stop Next.js dev/start processes in this checkout before running
`CHROMIUM_PATH=/usr/bin/chromium npm run test:cache`. It builds and runs a
production app on port 3003 with a local WooCommerce fixture, counts cache
requests and verifies signed product update/deletion invalidation. No real
backend writes or payments occur. See `docs/guides/cache-validation.md` for
owner setup and limitations. Unit tests also cover raw-byte signatures, body
limits, activation pings and private lookup cache boundaries.

## Agent readiness

`CHROMIUM_PATH=/usr/bin/chromium npm run test:agents` starts its own app on port 3004
and a local WooCommerce fixture. Stop other Next dev servers first. It checks
HTML/Markdown negotiation, meaningful no-JS HTML, 404 representations, every
new documentation/discovery endpoint and official MCP client handshake/tools.
See `docs/guides/agent-readiness.md` for deployed curl checks and owner decisions.
Set `AGENTS_PRODUCTION=true` to build and test the production app instead of dev.

Cart recommendations checks cover horizontal scrolling, exclusion of existing
cart items, quick additions and refreshed totals in both cart views, backorder
purchases, variant navigation, pending additions, and recommendation outages.
The mobile variants check uses the mock variable hood product and verifies that
Options scrolls to and focuses its selector before adding the chosen variant.
