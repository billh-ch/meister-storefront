# Meister & Meister Dive — Storefront

Headless diving-equipment storefront: Next.js 16 (App Router), React 19, Tailwind 4, TypeScript. Product, cart pricing, shipping and orders come from a self-hosted **WooCommerce** backend; payment is **Stripe** hosted Checkout. English and Greek (`/el`).

## Quick start (no backend needed)

```sh
pnpm install
cp .env.example .env.local     # keep NEXT_PUBLIC_USE_MOCK_DATA=true
# set SESSION_SECRET to 32+ random chars: openssl rand -base64 32
pnpm dev
```

Open <http://localhost:3000>. Mock mode serves fixture products and refuses checkout.

For a real catalog set `NEXT_PUBLIC_USE_MOCK_DATA=false` plus the WooCommerce, Stripe and Redis variables described in `.env.example`.

## Testing

```sh
pnpm test                 # unit tests
pnpm lint
pnpm exec tsc --noEmit
pnpm test:browser         # Playwright; needs a mock-mode server, see tests/README.md
```

## Hosting

- `main`: standard Next.js build, originally deployed on Vercel. Vercel Hobby is non-commercial, so commercial hosting needs a paid plan or another host.
- `feat/cloudflare-preview`: parallel Cloudflare Workers build (vinext, beta) with a KV catalog cache and pre-generated images. This is the intended commercial host but is not merged yet. See `docs/cloudflare-preview.md` on that branch.

## Where to read next

- `CLAUDE.md` / `AGENTS.md` — architecture, conventions and gotchas for humans and coding agents
- `components/CLAUDE.md` — component patterns
- `lib/i18n/README.md` — adding translated strings
- `docs/guides/` — agent readiness, BOX NOW, cache validation, Greek locale, SEO, product content
- `tests/README.md` — test setup
