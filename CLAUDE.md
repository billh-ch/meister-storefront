@AGENTS.md

# Meister & Meister Dive — Storefront

Headless diving-equipment storefront. **Next.js 16 (App Router) + React 19 + Tailwind 4 + TypeScript** in front of a **WooCommerce** backend (self-hosted on a Raspberry Pi, reached over a protected public HTTPS proxy). Payments are **Stripe hosted Checkout**. Languages: English (default) and Greek (`/el`).

> Earlier versions of this file said the backend was BigCommerce Catalyst and all data was mock. That is wrong. BigCommerce was never integrated.

## Conventions

- Always commit and push changes to GitHub after making them
- Colors as inline styles or Tailwind tokens — no hardcoded values outside globals.css
- Every user-facing string must exist in both EN and EL (`lib/i18n/`, see its README). `tests/i18n*.test.mjs` enforce this.
- Never trust the client for prices, cart contents or totals. Resolve server-side from WooCommerce.

See `components/CLAUDE.md` for component-specific gotchas and patterns.

## Hosting (read this before touching deploy config)

| | Branch | Status |
|---|---|---|
| Next.js on Vercel | `main` | Original target. Vercel Hobby is non-commercial, so it cannot be used for the real business without a paid plan. |
| Cloudflare Workers via **vinext** (beta) | `feat/cloudflare-preview` | **The intended commercial host.** Not merged into `main`. Deployed as the test Worker `meister-storefront-test`. |

The Cloudflare branch is a parallel build (`build:vinext`, `deploy:vinext`, `wrangler.jsonc`, `vite.config.ts`) and also carries unrelated work (pre-generated WebP images, KV catalog cache, and the promotions system below). Details: `docs/cloudflare-preview.md` *on that branch*. Do not assume `main` contains any of it. If a task mentions Cloudflare, check out or diff against `origin/feat/cloudflare-preview` first.

## Architecture (on `main`)

- **Catalog** — `lib/woocommerce/` (REST client, queries, mappers). ISR caching. `WC_PROXY_TOKEN` authenticates to the Pi proxy; `WC_CONSUMER_KEY/SECRET` authenticate to WooCommerce. WooCommerce product webhook: `app/api/webhooks/woocommerce`.
- **Mock mode** — `NEXT_PUBLIC_USE_MOCK_DATA=true` serves `lib/mock-data.ts`. Used for dev and browser tests. Checkout is refused in mock mode. If WooCommerce is unreachable at runtime, listings fall back to mock products marked unavailable. A genuine 404 from WooCommerce must stay a 404 (never resurrect deleted products from mock data).
- **Cart** — cookie-based (`lib/cart/cookie.ts`), re-resolved against live WooCommerce data on every read (`lib/cart/resolve.ts`). Variable products may carry selected options without a variation id.
- **Checkout** — `lib/checkout/` + `app/checkout`. Shipping quotes come from WooCommerce (incl. BOX NOW lockers). Stripe session is created server-side. **The WooCommerce order is created only by the verified Stripe webhook** (`app/api/webhooks/stripe/route.ts`), with Upstash Redis (`lib/redis.ts`) for idempotency/locks. Do not create orders anywhere else.
- **Auth** — WooCommerce customers; login verified through a JWT plugin; session in an iron-session cookie (`SESSION_SECRET`). `/account` is gated in `proxy.ts`.
- **`proxy.ts`** (Next 16's replacement for middleware) — locale detection/rewrite for `/el/*` (sets `x-meister-locale`), `/account` gate, and markdown content negotiation for agents.
- **i18n** — `lib/i18n/` (dictionaries, paths). Greek product translations come from WooCommerce (`docs/frontend-product-translations.md`).
- **Agent readiness** — `/.well-known/mcp` (MCP server, `lib/agents/mcp.ts`), `/llms.txt`, `/docs/*`, `Accept: text/markdown` negotiation. See `docs/guides/agent-readiness.md`.
- **SEO** — `lib/seo/`; sitemap, robots, structured data. Non-production deployments must be `noindex` (driven by `VERCEL_ENV` / `NEXT_PUBLIC_SITE_URL`; see `lib/seo/site.ts`).
- **Discount codes** — native WooCommerce coupons (percent / fixed cart only) validated live in `lib/coupons/`; the discount is recomputed server-side when the Stripe session is created and the paid webhook creates the Woo order with `coupon_lines`. Unsupported coupon settings are rejected, not ignored. See `docs/guides/coupons.md`.
- **Order emails** — Resend from `orders.meister.gr`: confirmation + owner alert from the Stripe webhook after the Woo order exists, "completed" (with tracking) from a signed WooCommerce `order.updated` webhook (`app/api/webhooks/woocommerce/orders`). Also cancelled (same webhook), refunds (Stripe `refund.created` → mirrored in WooCommerce, then emailed; refund only in Stripe) and a welcome email with an optional WooCommerce coupon (`WELCOME_COUPON_CODE`). Never blocks or fails an order; once-only via Redis + Resend idempotency keys. See `docs/guides/order-emails.md`.
- **Password reset** — storefront-run (WordPress cannot send mail): hashed single-use tokens in Redis, Resend email, new password set via the Woo customer API, earlier sessions revoked by a cut-off time. See `docs/guides/password-reset.md`.
- **Features** — gear finder (`lib/gear-finder`, `docs/gear-finder.md`), compare, wishlist, BOX NOW (`docs/guides/box-now-checkout.md`).

## On `feat/cloudflare-preview` only

- **Promotions** (a larger custom engine; superseded for now by the native coupons above) — WooCommerce plugin `wordpress/meister-promotions` + `lib/promotions/*` + `app/api/promotions/*`. Coupons, selected-product bundles, newsletter codes. Gated by `PROMOTIONS_ENABLED=false`; the plugin is **not installed** on the Pi yet. See `docs/guides/promotions-operations.md`.
- `CHECKOUT_PAYMENTS_ENABLED=false` blocks all checkout entry points (catalog-only preview).
- `STRIPE_EXPECTED_MODE` refuses keys of the wrong mode. Live payments are not authorized on the preview.
- Images are pre-generated at build (`scripts/prepare-images.mjs`) and served by a custom loader, to avoid image-transformation quotas.

## Commands

```sh
pnpm install            # pnpm-lock.yaml is the lockfile (tests/README.md still says npm)
pnpm dev                # next dev
pnpm build
pnpm lint
pnpm test               # node --test tests/*.test.mjs (unit)
pnpm exec tsc --noEmit
# Browser tests need a MOCK-mode server; they mutate carts. See tests/README.md.
NEXT_PUBLIC_USE_MOCK_DATA=true pnpm dev --hostname 127.0.0.1 --port 3001
pnpm test:browser
```

Use Node 24. Env vars are documented in `.env.example`.

## Gotchas

- Next.js here is v16 with breaking changes. Read `node_modules/next/dist/docs/` before writing code (see AGENTS.md).
- Never prefix secrets with `NEXT_PUBLIC_`. Public vars are compiled into the bundle, so on Cloudflare/Vite they must be correct at **build** time, not just runtime.
- Don't run native Next and vinext builds concurrently; they overwrite each other's `.next/types`.
- Don't point Stripe webhooks or production DNS at a preview deployment.
- Do not put credentials in the repo, docs or chat.
