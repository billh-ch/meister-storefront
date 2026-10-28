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

Run native Next and vinext builds sequentially: both generate
`.next/types/routes.d.ts`, with different type exports. Concurrent builds can
overwrite each other's generated types. After switching back to native Next,
`pnpm exec next typegen` refreshes its types before a standalone TypeScript check;
the native build also regenerates them.

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
The fixture preview is online at
<https://meister-storefront-test.hbill5488.workers.dev>.
It uses sample products and blocks payment creation. Vercel production and DNS
remain unchanged.

Cloudflare Workers Builds is connected to `billh-ch/meister-storefront`:

| Setting | Value |
| --- | --- |
| Branch | `feat/cloudflare-preview` |
| Build command | `NEXT_PUBLIC_USE_MOCK_DATA=true VERCEL_ENV=preview pnpm run build:vinext` |
| Deploy command | `pnpm run deploy:vinext` |
| Root directory | `/` |
| Build tools | `NODE_VERSION=24.19.0`, `PNPM_VERSION=11.19.0` |
| Build watch exclusions | `docs/*`, `tests/*` |

Build `77932512-9c8a-4752-afc6-f9412a90e404` succeeded on application commit
`33f16bbafc7934539a6cc02c5ad20ae162924c9e`. A new unique `SESSION_SECRET` was
generated directly into an encrypted Worker binding, separate from production.
Documentation and test-only changes do not rebuild the unchanged application.

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

### Connecting the real catalog while keeping payments off

The user authorized connecting the existing WooCommerce catalog after reviewing
the fixture preview. The Pi's protected API is reachable over public HTTPS;
unauthenticated product requests return HTTP 401 as expected.

Only these three additional Worker secrets are needed for this catalog stage:
`WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`, and `WC_PROXY_TOKEN`. Copy their existing
values from Vercel's project environment settings into the dedicated Worker's
**Settings → Variables and Secrets**, choosing **Secret**. Do not post values in
chat, reuse production's session secret, or install Stripe/Redis settings yet.

The public backend origin is `https://rpiwordpress.kudu-ulmer.ts.net:8443`.
`CHECKOUT_PAYMENTS_ENABLED=false` blocks both checkout entry points before any
customer, cart/backend or Stripe access, independently of the catalog mode.
The flag is server-only; leaving it unset preserves existing Vercel behavior.
Both languages and entry points are covered by tests; all 169 unit tests pass.

Until the three secrets are installed, retain `NEXT_PUBLIC_USE_MOCK_DATA=true`
and the current fixture build command. Once they are confirmed, switch that flag
to false in the root Wrangler config **and** the Cloudflare build command and
build environment, then deploy the matching source commit. The public backend
origin must match at build and runtime. Do not switch only a runtime public
flag: Vite compiles public environment variables into the server/client output.

Verify real published catalog IDs, variants, localized content and photos, then
guest cart and Greece shipping quotes. Confirm the payment-off response and
inspect hosted errors/CPU. Real orders and Stripe setup are separate work.

### Completed fixture checks

The compatibility scanner reported 97% support: 17 supported items and one
partial item for image optimization. This app uses direct originals instead.
The native Next build, Workers build, lint, type check and all 167 unit tests passed.
Local Workers browser checks passed shopping/cart/server actions, delivery
refresh/retry, English/Greek fonts and locale navigation, account protection,
guest wishlist and compare at mobile and desktop sizes.

The same hosted preview passed shopping/cart/server actions, mock delivery
refresh/retry and blocked fixture payments, English/Greek locale and typography,
guest wishlist, compare and mobile variant selection. The hosted shopping test
waits for client scripts before clicking an SSR-rendered button. An initial
early click did not invoke a handler; a hydrated request completed with HTTP 200.
Some existing sample Unsplash product-image URLs fail independently of hosting;
the sample catalog is not evidence that real product photos are unavailable.
A browser on the hosted preview loaded three actual public Pi product-photo
originals and the homepage hero/community image assets successfully, bypassing
the paid image optimizer. The homepage also returned the expected noindex header.

The local webhook fixture uses the deliberately invalid Stripe key and fixture
signing secret in `.dev.vars.example`. It verifies a signed `ping` event and
rejects tampering without calling Stripe, Redis or WooCommerce. Workers selects
Stripe's Web Crypto provider, so the handler uses `constructEventAsync`; Vercel's
Node provider supports the same method. Payment return URLs retain Vercel's
deployment-origin precedence; Workers falls back to `NEXT_PUBLIC_SITE_URL`.

The earlier connection-provider 403 cleared. After the user initialized the
workers.dev address and connected GitHub, the configured Workers build deployed
successfully. No paid Workers subscription was enabled; the account subscription
list still contained only the existing zero-cost Teams Free plan.

Initial hosted analytics (17:00–17:03 UTC on 2026-10-28) reported 602 successful
invocations and six client disconnects, with zero execution errors. Successful
invocations had a median CPU time of 9.674 ms and a 99th percentile of 124.735 ms.
GraphQL reports these values in microseconds. This is a small browser-test sample,
not a load test. Cloudflare allows rollover CPU time, so high quantiles can exceed
the normal Free limit without immediate errors. These measurements do not yet
establish reliable Free-plan suitability for the real storefront.

These checks do not prove live Stripe payment fulfillment, WooCommerce order
creation, account sign-in against the Pi, Redis connectivity or a traffic-level
performance target. Those require the real test integrations above. The signed
webhook crypto check ran locally; no Stripe webhook endpoint was added or changed.

Workers Free has a daily request allowance and a per-request CPU limit. Static
assets and dynamic render requests have different costs. A successful local
build cannot establish free-plan suitability; inspect hosted request failures
and CPU measurements before moving production. No paid upgrade is authorized.
