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

Cart recommendations checks cover horizontal scrolling, exclusion of existing
cart items, quick additions and refreshed totals in both cart views, backorder
purchases, variant navigation, pending additions, and recommendation outages.
The mobile variants check uses the mock variable hood product and verifies that
Options scrolls to and focuses its selector before adding the chosen variant.
