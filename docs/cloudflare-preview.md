# Cloudflare test environment

This branch adds a parallel Workers build with vinext 1.3.1. The existing
Next.js/Vercel commands remain available. Production hosting and DNS are unchanged.
vinext is beta; this is a compatibility environment, not a production migration.

## Local build and runtime

Use Node 24 and pnpm 11.19.0. The lockfile and pnpm workspace file include the
native build approvals required by workerd, esbuild, sharp and unrs-resolver.

```sh
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# Set SESSION_SECRET in .dev.vars to a newly generated 32+ character value.
NEXT_PUBLIC_USE_MOCK_DATA=true VERCEL_ENV=preview pnpm run build:vinext
pnpm run start:vinext --port 8787
```

Vite copies local `.dev.vars` to the generated server directory. Both paths are
ignored by git. Never copy development secrets or environment files into an upload.

```sh
pnpm test
pnpm exec tsc --noEmit
CHROMIUM_PATH=/usr/bin/chromium TEST_BASE_URL=http://localhost:8787 node tests/shopping.browser.mjs
TEST_BASE_URL=http://localhost:8787 node tests/locale.browser.mjs
TEST_BASE_URL=http://localhost:8787 node tests/wishlist.browser.mjs
TEST_BASE_URL=http://localhost:8787 node tests/compare.browser.mjs
TEST_BASE_URL=http://localhost:8787 node tests/cloudflare-runtime.mjs
```

Original images are served directly without paid image transformations. No
Cloudflare Images, R2, D1 or paid Workers subscription is required by this config.
`VERCEL_ENV=preview` also activates the storefront's existing noindex protection
on Workers; retain it for this test environment.

## Hosted deployment

Use only the dedicated `meister-storefront-test` Worker and its workers.dev URL.
With an authorized local Wrangler login, deployment is:

```sh
pnpm run deploy:vinext
```

The deploy script uploads the existing verified build without rebuilding it
under different environment settings. The hosted connector can upload the same modules and assets without exporting
its account credentials to the CLI. Build output contains public fixture data;
all secrets must be separate Worker bindings. Do not upload source maps or
`.dev.vars` files. Do not change production routes or webhook endpoints.

For fixture mode, install only a new `SESSION_SECRET` as a Worker secret. Keep
`NEXT_PUBLIC_USE_MOCK_DATA=true`: the checkout explicitly prevents fixture data
from producing Stripe sessions or real WooCommerce orders.

For a later real-service test, configure the exact workers.dev origin as
`NEXT_PUBLIC_SITE_URL` at build and runtime, then rebuild with mock mode disabled.
Set these server secrets through Cloudflare's encrypted environment settings:

| Setting | Purpose |
| --- | --- |
| SESSION_SECRET | Unique test cookie encryption secret, 32+ characters |
| WC_CONSUMER_KEY / WC_CONSUMER_SECRET | Actual WooCommerce API credentials |
| WC_PROXY_TOKEN | Pi's protected API proxy credential |
| STRIPE_SECRET_KEY | Verified Stripe test/sandbox secret key |
| STRIPE_WEBHOOK_SECRET | Secret of a separate test webhook endpoint |
| KV_REST_API_URL / KV_REST_API_TOKEN | Isolated test Redis database credentials |

Public configuration additionally needs `NEXT_PUBLIC_WC_URL`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test key), and optionally
`BOX_NOW_PARTNER_ID`. Leave `REDIS_ENV_PREFIX` empty for the unprefixed Redis pair.
Use the exact intended prefix if a prefixed pair is installed instead.

Managed workspace credentials may be outbound-proxy placeholders. They cannot
be exported into Workers as if they were real service credentials. Do not paste
credentials into chat or commit them. No real-service verification is complete
until these settings and their resulting requests have been checked.

## Validation and limits

The compatibility scanner reported 97% support: 17 supported items and one
partial item for image optimization. This app uses direct originals instead.
The native Next build, Workers build, lint, type check and all 167 unit tests passed.
Local Workers browser checks passed shopping/cart/server actions, delivery
refresh/retry, English/Greek fonts and locale navigation, account protection,
guest wishlist and compare at mobile and desktop sizes.

The local webhook fixture uses the deliberately invalid Stripe key and fixture
signing secret in `.dev.vars.example`. It verifies a signed `ping` event and
rejects tampering without calling Stripe, Redis or WooCommerce. Workers selects
Stripe's Web Crypto provider, so the handler uses `constructEventAsync`; Vercel's
Node provider supports the same method. Payment return URLs retain Vercel's
deployment-origin precedence; Workers falls back to `NEXT_PUBLIC_SITE_URL`.

The Cloudflare connection succeeded and an empty dedicated test Worker was
created. Upload is currently blocked by a 403 response from the connection
provider. There is no public deployment URL yet. No paid Workers subscription
was enabled, and the account had no paid Workers plan in its subscription list.

These checks do not prove live Stripe payment fulfillment, WooCommerce order
creation, account sign-in against the Pi, Redis connectivity or a traffic-level
performance target. Those require the real test integrations above.

Workers Free has a daily request allowance and a per-request CPU limit. Static
assets and dynamic render requests have different costs. A successful local
build cannot establish free-plan suitability; inspect hosted request failures
and CPU measurements before moving production. No paid upgrade is authorized.
