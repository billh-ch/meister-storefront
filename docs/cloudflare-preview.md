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

Responsive WebP images are generated at build time and served as static assets;
unknown/new images fall back to their original URL. No Cloudflare Images, R2, D1
or paid Workers subscription is required by this config. Public catalog fetches
use a dedicated Workers KV namespace; this is separate from payment idempotency Redis.
`VERCEL_ENV=preview` also activates the storefront's existing noindex protection
on Workers; retain it for this test environment.

## Hosted deployment

Use only the dedicated `meister-storefront-test` Worker and its workers.dev URL.
The WooCommerce preview is online at
<https://meister-storefront-test.hbill5488.workers.dev>.
It reads the existing Pi catalog and blocks payment creation. Vercel production and DNS
remain unchanged.

Cloudflare Workers Builds is connected to `billh-ch/meister-storefront`:

| Setting | Value |
| --- | --- |
| Branch | `feat/cloudflare-preview` |
| Build command | `NEXT_PUBLIC_USE_MOCK_DATA=false VERCEL_ENV=preview pnpm run build:vinext` |
| Deploy command | `pnpm run deploy:vinext` |
| Root directory | `/` |
| Build tools | `NODE_VERSION=24.19.0`, `PNPM_VERSION=11.19.0` |
| Build watch exclusions | `docs/*`, `tests/*` |

Real-catalog build `68ade7ff-e4a1-42ea-8334-b24057b58347` succeeded on application
commit `77df1a3394a8b0a4f4b1a8e857dddb19fb11c1f5`. A new unique `SESSION_SECRET` was
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
| KV_REST_API_URL / KV_REST_API_TOKEN | Active Redis credentials shared with the existing Vercel webhook locks |

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
All three have now been installed and verified as encrypted `secret_text`
bindings. The user's original dashboard entries were plaintext; a sample-mode
redeploy cleared the conflicting entries before the same values were installed
as secrets. Credentials were not printed, written to the repository, or exported
to the managed workspace. Temporary remote credential copies were cleared.

The public backend origin is `https://rpiwordpress.kudu-ulmer.ts.net:8443`.
`CHECKOUT_PAYMENTS_ENABLED=false` blocks both checkout entry points before any
customer, cart/backend or Stripe access, independently of the catalog mode.
The flag is server-only; leaving it unset preserves existing Vercel behavior.
Both languages and entry points are covered by tests; all 169 unit tests pass.

The current hosted build uses `NEXT_PUBLIC_USE_MOCK_DATA=false` in the root
Wrangler config, Cloudflare build command and build environment. The public backend
origin must match at build and runtime. Do not switch only a runtime public
flag: Vite compiles public environment variables into the server/client output.

Verified against WooCommerce: 83 published products. Hosted checks passed for
fins 4869 (€80, size39–40) and wetsuit4908 (€320, sizeS), direct public Pi photos,
retained options and a €400 guest-cart subtotal. These two legacy products have
empty variation metadata; the existing supported parent/selected-options path
preserves choices and lets WooCommerce resolve its own variation for shipping.

With both products, Greece quotes returned flat_rate:1 (€3), local_pickup:2 (€0)
and box_now_delivery (€2). Cyprus returned flat_rate:3 (€5); a second Greece
request reproduced the original three methods. The mobile checkout displayed
the real Greece options. Greek product4908 rendered its published translated
title at390px and1440px without overflow or page errors.

The hosted payment endpoint returned the explicit payment-off message before
cart/customer/Stripe access. No order, Stripe session or shipment was created;
shipping used throwaway WooCommerce guest carts. No WordPress settings, DNS or
Vercel production deployment were changed.

Initial real-catalog analytics (18:48–18:52 UTC on 2026-10-28) reported 51
successful invocations and one client disconnect with zero execution errors.
Successful-request median CPU was27.475ms andp99 was204.681ms. The preview
functions, but these exceed the Free plan's normal CPU allowance; rollover can
mask enforcement in a small sample. Optimize and validate reliability before
considering production migration. No paid Workers plan was enabled.

### Performance improvements — 2026-10-28

Application commit `f738661` deployed successfully in Workers build
`f7d36f42-43ff-4ae8-83a2-325ef7778b3a`. It adds a supported KV data adapter and
responsive static WebP assets. Vercel main remains at `c0fb563`; no production,
DNS, WordPress settings or paid subscriptions were changed.

Only explicitly cached public catalog/detail fetches use `VINEXT_KV_CACHE`
(`meister-storefront-test-catalog`). Cart, customer, shipping, order and fresh
checkout price/stock reads retain their existing cache bypass. Shopper HTML is
still private/no-store. Existing 30/60-second fetch revalidation is preserved;
the adapter's physical entry TTL is 120 seconds, with 30-second KV read caching.
This bounds retention after rejected refresh writes, at the cost of origin
misses after idle expiry. KV propagation and stale-while-revalidate can add lag.
The product-webhook handler exists, but no WooCommerce webhook was installed and
`WC_WEBHOOK_SECRET` is not configured here; instant invalidation is not verified.

KV Free includes 100,000 reads and 1,000 writes per day. Excess operations fail,
without enabling a paid plan. Cache read failures go to origin; a rejected refresh
write can keep an existing entry until its physical expiry. Do not describe every
quota failure as an immediate origin fallback.

`scripts/prepare-images.mjs` generated 809 WebP files from 212 published product
photos and nine local images, at widths up to 320/640/960/1600px without enlarging
small originals. The approximately 27 MB of generated assets are committed so a
fresh build retains the current variants. The preview build's public
`MEDIA_MANIFEST_URL` points at `/api/catalog/media`; that endpoint projects only
published upload URLs and validated attachment modification dates, with no private
product fields or credentials. Downloads are restricted by origin/path, MIME,
byte/pixel limits, redirect rejection, timeouts and concurrency.

`StoreImage` emits native responsive `srcset` markup because this vinext version
ignores the global Next loader and its per-image loader omits responsive output.
The shared selector uses exact versioned source URLs. New/changed/unrecognized
photos load their original immediately and acquire generated variants on the
next deployment; no scheduled rebuild was added. Missing derivative recovery
failure removes the mapping so the original remains usable. Original files are
preserved. Hash-named `/optimized/*` assets bypass the Worker and were verified
with `image/webp` and `public, max-age=31536000, immutable` headers.

Measurements from the same managed execution location (not a Greek customer
connection or load test):

| Sample | Before | After |
| --- | --- | --- |
| Warm homepage time to first byte | 5.53 / 5.77 s | 0.226 / 0.201 s |
| Warm shop time to first byte | Not recorded | 0.577 / 0.472 s |
| Previously unvisited product, then repeat | Not recorded | 1.903 / 0.364 s |
| Fire Camo photo at 640px | 158,138-byte original | 39,258-byte WebP |
| Accessories category photo at 640px | 3,843,162-byte original | 69,164-byte WebP |

The product sample was `/products/speargun-pathos-laser-evo-pro`; its first visit
is not proof of a fully cold Cloudflare isolate. Warm samples do not guarantee
uncached performance: expired/missing data
still needs the Pi and its internet connection. The homepage retained noindex
and private/no-store headers after deployment. The hosted browser passed actual
fins/wetsuit selection, optimized images, server-priced €400 cart, GR→CY→GR
shipping, mobile checkout, Greek pages at390/1440px and a blocked payment attempt.
Card-image touch swiping, desktop/keyboard controls and nested carousel behavior
also passed against the hosted real catalog. All177 unit tests, native and Workers
production builds, type checking and lint passed.

### Commercial readiness

Cloudflare Free can host a commercial storefront within its service terms and
usage limits. This particular preview is **not ready to accept paid orders**.
Payments are deliberately disabled. Stripe test credentials and a separate
Cloudflare webhook are installed; the active Redis pair is still missing. Before
cutover, finish the test payment/webhook/idempotency configuration and verify a complete test payment creates
the correct WooCommerce order, dashboard/account history and confirmation. Test
webhook retries for duplicate protection before configuring live credentials.
Production also needs the chosen domain, production indexing configuration and
an always-available Pi/internet connection. Existing Vercel production is untouched.

Free-plan reliability is a separate outstanding issue. A small post-deployment
sample at20:00–20:03 UTC reported20 successful invocations, one client disconnect
and zero execution errors, with successful-request median CPU49.281ms andp99
272.368ms. A later20:03–20:05 UTC sample improved to median11.311ms andp99
211.640ms across103 successful invocations, one client disconnect and zero
execution errors. Both samples exceed Workers Free's normal10ms allowance;
rollover means a working preview is not evidence of reliable Free operation under
traffic. Static optimized assets avoid this CPU cost, but dynamic rendering still
needs further CPU profiling/architectural work or an appropriate paid allowance.
No paid upgrade was made. Cloudflare currently lists Workers Paid from$5/month
plus usage, if that route is later chosen; it is not required to view this preview.

References: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and
[KV pricing](https://developers.cloudflare.com/kv/platform/pricing/).

### Stripe preview preparation — 2026-10-28

Application commits `6d66cff`/`2301f62` deployed in successful build
`c9d0705f-d418-479c-b3d9-b30ce18a81c6`. The existing portable Stripe test key was
verified against account `acct_1U7BqPGbOGPKGWDR` and transferred directly into an
encrypted Worker secret. This account has live charging disabled. No account
switch, live credentials, real payment, order or shipment was created.

The separate test webhook `we_1UVeEIGbOGPKGWDRzB0gy7r7` points to
`https://meister-storefront-test.hbill5488.workers.dev/api/webhooks/stripe` for
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.
Its newly generated signing secret was installed directly as an encrypted
`STRIPE_WEBHOOK_SECRET`; temporary credential copies were cleared. Existing
Vercel webhook endpoints were preserved. Hosted signed ping returned200,
tampering400, and foreign storefront/live events were acknowledged and ignored
before Redis/WooCommerce access. These checks do not prove payment fulfillment.

`STRIPE_EXPECTED_MODE=test` refuses live/unknown API keys and live webhook events.
New sessions carry `metadata.storefrontOrigin`; the new endpoint requires an exact
match with `STRIPE_CHECKOUT_ORIGIN`. The intended workers.dev public origin is
configured at both build and runtime. Existing Vercel behavior is retained when
these new optional guards are unset. All180 unit tests, both production builds,
lint and type checks passed; an independent review found no regressions and
independently reran33 focused tests.

The remaining setup is **KV_REST_API_URL and KV_REST_API_TOKEN** as encrypted
Worker secrets. Use the REST URL and writable REST token from the same active
Upstash database supplying Vercel's `restore_KV_REST_API_URL` and
`restore_KV_REST_API_TOKEN`, not the older archived unprefixed integration.
Vercel marks that active pair sensitive/write-only, so it cannot be read back
through the API. Obtain the values from the active Upstash database's Connect/
REST API panel; do not paste them into chat. `REDIS_ENV_PREFIX` is explicitly empty
on Cloudflare because the copied secret names are unprefixed.

Sharing this Redis database is intentional: the existing Vercel webhook also
receives this account's test payments, and both endpoints must use the same
`stripe:pi:<paymentIntent>` locks to avoid overlapping WooCommerce writes.
Cloudflare's new endpoint additionally ignores unrelated storefront events.

`CHECKOUT_PAYMENTS_ENABLED=false` remains in source and build/runtime settings.
The hosted endpoint was verified still blocking payment creation. After the
Redis pair is installed, verify connectivity and shared locks before enabling
test sessions. Then verify the session's origin metadata and success/cancel URLs,
one actual test payment → exactly one Woo order → confirmation receipt, and
retry protection. Test payments create transactional WooCommerce records using
the existing fulfillment code, so identify test data and prevent it from being
shipped. Live activation and Free CPU reliability remain separate launch gates.

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
