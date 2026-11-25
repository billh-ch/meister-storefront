# Testing the new catalog on staging (free, before any production server)

Goal: a private copy of the storefront at **https://staging.meister.gr** that reads the **staging WooCommerce** (the new catalog on the Pi, port 8086). It takes payments only in a **Stripe sandbox**, and keeps its own **Redis**. The live site (`storefront.meister.gr` → the old Pi catalog) is untouched. Every piece used here has a free tier.

```
staging.meister.gr (Vercel, branch "staging") ──► https://<pi>.ts.net:10000 (Funnel) ──► staging WordPress :8086
          │                                                                                   │
          ├── Stripe SANDBOX (own keys + webhook)                       webhooks ◄────────────┘
          └── Upstash Redis (separate free database)
```

Why each piece is separate:
- **Stripe sandbox:** Stripe sends every test-mode event to every test-mode endpoint of an account. A sandbox stops live-site test payments from creating orders on staging, and the other way round.
- **Redis:** keys such as `email:order-created:<orderId>` would collide between the two WooCommerce databases.
- **Custom domain:** `*.vercel.app` previews are behind Vercel's login (Deployment Protection), which blocks Stripe and WooCommerce webhooks. Custom domains are not protected.

## 1. Staging server (migration agent, with temporary sudo)

Instructions for the agent:

1. **Public HTTPS:** serve the staging site over Tailscale Funnel on port **10000**. Port 8443 is the live site; don't touch it. Command: `tailscale funnel --bg --https=10000 http://127.0.0.1:8086`. Record the resulting URL.
2. **API gate:** protect `/wp-json/*` exactly like the live site's nginx gate, but with a **new** random token in `X-Meister-API-Key`. Media under `/wp-content/uploads/` stays public. The owner puts the token in Vercel; never print it.
3. **WordPress URLs:** after a backup, change WordPress `home`/`siteurl` and all stored URLs from `http://100.118.133.73:8086` to the Funnel URL (`wp search-replace`, dry run first). Make WordPress honour `X-Forwarded-Proto: https` in `wp-config.php`.
4. **Delivery:** let shipping methods work on staging (adjust `meister-staging-safety`, but **keep outgoing mail blocked**). Create the methods from `docs/catalog/structure.json → shipping`, with costs before VAT: Greece 2.42 plus local pickup, Cyprus 4.03, Europe 8.06, rest of world 12.10. No BOX NOW yet.
5. **Check:** report the Funnel URL, and confirm that `GET <url>/wp-json/wc/store/v1/products?per_page=1` works **with** the token and returns 403 **without** it.

## 2. Owner, in the staging WP Admin

- WooCommerce → Settings → Advanced → REST API → **Add key**, Permissions **Read/Write**. The key goes into Vercel only.
- Marketing → Coupons: create `WELCOME5` (5%, individual use, 1 use per user) and a test code, e.g. `TEST10`.
- **Publish a test set.** The storefront shows only published products. Publishing on staging affects nothing live. At least:
  - 2–3 fins;
  - a wetsuit with made-to-measure;
  - one wetsuit with add-ons;
  - a simple accessory.
- Publish the Greek translation of at least one product, to test `/el`.

## 3. Owner: Stripe sandbox (free)

1. Stripe Dashboard → account menu → **Sandboxes** → create **"Meister staging"**.
2. In the sandbox, open Developers → API keys and copy the **secret key** (`sk_test_…`).
3. Add an endpoint under Developers → Webhooks:
   - URL `https://staging.meister.gr/api/webhooks/stripe`;
   - events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `refund.created`;
   - copy its **signing secret** (`whsec_…`).

## 4. Owner: Redis (free)

Vercel → project → Storage → create a new **Upstash Redis** database (free plan), e.g. `meister-staging`. Connect it to the project for the **Preview** environment with the environment variable prefix **`STAGING_`**. Vercel then creates `STAGING_KV_REST_API_URL` and `STAGING_KV_REST_API_TOKEN`.

## 5. Vercel: branch, domain, settings

1. Branch `staging` (Claude creates it from `main`). Every push to it redeploys staging.
2. Project → Settings → Domains → add `staging.meister.gr`, assigned to **Git branch `staging`**. Add the DNS record Vercel shows (a CNAME) where `meister.gr`'s DNS is managed.
3. Project → Settings → Environment Variables. Add each one as **Preview**, Git branch **`staging`** only (secrets marked **Sensitive**):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_USE_MOCK_DATA` | `false` |
| `NEXT_PUBLIC_WC_URL` | the Funnel URL from step 1 |
| `WC_PROXY_TOKEN` | the new staging token from step 1 |
| `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | the staging Read/Write key |
| `WC_WEBHOOK_SECRET` | a new random string (also used in step 6) |
| `WC_ORDER_WEBHOOK_SECRET` | another new random string (step 6) |
| `STRIPE_SECRET_KEY` | the sandbox `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | the sandbox endpoint's `whsec_…` |
| `REDIS_ENV_PREFIX` | `STAGING_` |
| `SESSION_SECRET` | a new random string of 32+ characters |
| `APP_BASE_URL` | `https://staging.meister.gr` |
| `WELCOME_COUPON_CODE` | `WELCOME5` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ORDER_ALERT_EMAIL` | same as production (emails go only to the addresses you test with) |

Generate random strings with `openssl rand -hex 32`.

4. Redeploy the `staging` branch. `NEXT_PUBLIC_*` values are baked in at build time.

## 6. Owner: staging WooCommerce webhooks

WooCommerce → Settings → Advanced → Webhooks → Add:
- **Product created**, **updated** and **deleted**: delivery URL `https://staging.meister.gr/api/webhooks/woocommerce`, secret = `WC_WEBHOOK_SECRET`.
- **Order updated**: delivery URL `https://staging.meister.gr/api/webhooks/woocommerce/orders`, secret = `WC_ORDER_WEBHOOK_SECRET`.

## 7. Test checklist (Stripe test card 4242 4242 4242 4242, any future date and CVC)

1. The shop and category pages show only the new catalog. Sections, brands and images are correct. `/el` shows published Greek.
2. The gear finder recommends the new products.
3. A wetsuit with add-ons shows the right prices. Made-to-measure is the standard price + €50.
4. Sign up: the welcome email arrives with `WELCOME5`. Log out, log in, then do a password reset.
5. Order with Greek delivery: delivery is **€3.00**, and the WooCommerce order total equals the Stripe payment, with no "Total check" note.
6. Order with add-ons plus a coupon: the totals match, and the add-ons are listed on the order and in the emails.
7. Local pickup order: delivery is €0.
8. Cancel an order from the account page within 2 hours: Stripe refund, WooCommerce Cancelled, one email.
9. Refund part of another order in the Stripe sandbox: the refund is recorded in WooCommerce and emailed.
10. Mark an order Completed with tracking in WooCommerce: the "completed" email arrives. WP-Cron can delay it a few minutes.

Report anything that differs to Claude with the time it happened. Vercel Hobby keeps runtime logs for 1 hour.
