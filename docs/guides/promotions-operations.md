# Meister promotions — installation and operation

Implementation targets the WooCommerce backend currently configured on the Cloudflare preview, not the new empty catalog staging server. The authenticated Cloudflare settings read on 2026-11-05 reported `https://rpiwordpress.kudu-ulmer.ts.net:8443`. The managed workspace has no private Tailscale/SSH grant and its injected Woo URL is an obsolete tunnel, so installation on the owner's Pi has **not** been performed here.

## What ships

- `wordpress/dist/meister-promotions-1.0.0.zip`: separate plugin, no credentials or fixtures.
- Checkout-only EN/EL coupon entry, one code, guests supported.
- Automatic selected-product bundles; best single bundle versus coupon, never combined. Delivery is not discounted.
- Native coupon restrictions and Woo-native coupon/stock holds; durable pending orders and exact Stripe projection.
- Trusted newsletter issuance service/CLI, one code for first confirmed subscription per email, independent of purchase history. The homepage signup stays disabled until its future provider integration exists.
- Native coupon campaign/influencer fields and sales attribution. No commissions.
- Prepared campaign links such as `/shop?coupon=SUMMER` or `/el/shop?coupon=SUMMER`.

## Installation and preflight

1. Verify the actual site/database behind the currently configured Cloudflare backend. Do not install on `/var/www/meister-catalog-stage` or infer a target from a convenient SSH hostname. Use the protected API/proxy and matching local nginx/PHP configuration to identify it.
2. Back up that database and any existing `meister-promotions` directory to a private directory outside the web root, permissions 0700/0600. Preserve the existing translations plugin, product data, checkout settings and proxy protection. Record backup paths and SHA256 without putting credentials or exports in Git/chat.
3. Confirm PHP >=8.1 and Woo >=9.5.2, native reservation APIs, InnoDB for order/postmeta/stock/ledger tables, and compatible pricing/shipping hooks. New order preparation refuses unhealthy prerequisites. Existing YITH extras are **not** made headless-compatible by this plugin; audit unexpected fees/pricing hooks before activation.
4. Rebuild/inspect the ZIP. Install and activate it only on that site. No offers or welcome template are enabled by installation. In WooCommerce settings, enable native coupon use if disabled. Use a valid existing read/write Woo key with a shop-management-capable user; do not create or expose public admin endpoints.
5. The existing protected API must allow the specific `/wp-json/wc/v3/meister-promotions/` route family while retaining both proxy authentication and Woo Basic/API authentication. No Funnel admin exposure, broad allow-all changes or credential query strings.
6. Authenticated `GET /wp-json/wc/v3/meister-promotions/health` returns version 1, backendId and health booleans. Anonymous requests must fail. Quote/prepare/bind/event/pending/heartbeat/receipt are server-to-server authenticated POSTs. There is no public newsletter issuance route.

Keep `MEISTER_PROMOTIONS_CHECKOUT_READY` false or undefined in backend private configuration until all payment/runner checks below pass. The plugin remains installed through rollback to settle outstanding payments. Never remove its durable ledger or identity secret during ordinary updates; newsletter eligibility and retry recovery depend on them.

## Storefront activation values

These are server-only settings; do not put them under `NEXT_PUBLIC_`:

| Name | Value / requirement |
| --- | --- |
| `PROMOTIONS_ENABLED` | `false` until backend, sandbox checkout and browser verification complete |
| `PROMOTIONS_BACKEND_ID` | Public ID from the authenticated health response, pinned to this backend |
| `PROMOTIONS_STRIPE_ISOLATED` | `true` only after every receiver is verified isolated/scoped |
| `PROMOTIONS_CRON_SECRET` | New encrypted random secret, 32+ characters; never printed or committed |

Keep existing Woo, session, Stripe and Redis encrypted credentials in their appropriate platform secret settings. Do not transfer managed outbound-proxy placeholders. `STRIPE_CHECKOUT_ORIGIN` must equal the trusted checkout origin and `STRIPE_EXPECTED_MODE` must explicitly be `test` or `live`. This work does not authorize live-mode activation or a production promotion.

The feature flag controls new checkout creation/presentation, not completion of existing new-protocol attempts. Retain backend ID/Stripe ownership configuration and plugin while attempts remain in flight. Pre-change Stripe Sessions continue through the legacy handler.

## Stripe receiver ownership

The older Vercel deployment has historically received events from the same Stripe test account. Do not enable the new flow merely because its metadata has a protocol tag: a legacy receiver does not automatically understand that tag. Inventory the account's actual receivers and either use an isolated sandbox or update their ownership scoping with the appropriate deployment authorization. Do not alter production to make a preview test pass. Preserve fulfillment of old Sessions until terminal.

No independent Stripe promotion-code field is enabled. Woo computes discounts and taxes; Stripe receives the already-approved gross amounts and separate delivery. Do not also enable Stripe automatic tax. Zero-payable orders complete idempotently without a fictional card charge.

## Reconciliation runner

Run authenticated `POST /api/promotions/reconcile` on the storefront at least every five minutes. Authentication is `Authorization: Bearer <PROMOTIONS_CRON_SECRET>` from a private environment/credential file, not a query parameter. Use an already-working host scheduler or a verified backend systemd timer with private credentials; do not assume low-traffic WP-Cron or install a new paid scheduling service.

The runner retrieves actual Stripe state, recovers a lost Session bind, reconciles terminal failures/expiry/success and updates the backend heartbeat. New preparation is refused if the heartbeat is older than 15 minutes. A failed run must alert the operator through their existing monitoring; it returns HTTP 503. No silent fallback to undiscounted payment.

Reservations deliberately do not expire solely on a local clock while an asynchronous payment may still complete. Long native Woo holds are released by verified terminal reconciliation, not blind order cancellation. If the runner stops, restore it and investigate; do not delete coupon-held metadata or stock rows to free capacity. Automatic Woo unpaid-order cancellation is disabled for this protocol. Manual cancellation/failure of an unpaid protocol order is blocked until its payment session is reconciled.

Optional backend private constants `MEISTER_PROMOTIONS_RECONCILE_URL` (exact HTTPS endpoint) and `MEISTER_PROMOTIONS_RECONCILE_SECRET` enable the shop-manager **Reconcile now** action. Use the same protected runner secret, never browser-visible settings. The admin page lists pending/review states and order links. A review state is durable and does not fulfill automatically; investigate the actual payment and order before any manual Woo resolution.

Useful private CLI reads on the correct backend:

```sh
wp --path=VERIFIED_SITE_PATH meister promotions health
wp --path=VERIFIED_SITE_PATH meister promotions pending
```

Use the same authenticated reconciliation endpoint for a bounded manual reconciliation run. Inspect pending orders in Woo using their returned order IDs. An ambiguous payment/amount mismatch requires investigation before fulfillment or a refund; the extension does not issue refunds automatically.

## Merchant workflows

**Ordinary/influencer codes:** Marketing → Coupons. Configure percentage/fixed discounts, expiry, spend/product/category/sale/email restrictions and usage limits. Set campaign/influencer identifiers for tracking. Free-shipping codes are intentionally rejected in this merchandise-only release. Only the actually redeemed promotion receives attribution. Net merchandise reporting accounts for line-item refunds; amount-only partial refunds are allocated using the original gross merchandise/order ratio, while a full refund clears net merchandise. The discount column is explicitly the discount at sale.

**Bundles:** WooCommerce → Meister Promotions. Choose 2–12 required product/variation selectors and quantities, percentage or fixed-euro saving per complete set, optional set cap and dates in the backend timezone. Parent selectors include variations; an explicit variation selector matches only itself. A unit never satisfies two requirements. The best single rule wins, repeated up to its configured limit; different rules do not stack. Start disabled and test the eligible/ineligible combinations before enabling. Native Woo tax settings determine fixed-discount tax treatment.

**Welcome coupons:** Configure the disabled-by-default welcome template, then connect a trusted future confirmed-signup adapter. For an already confirmed subscription only:

```sh
wp --path=VERIFIED_SITE_PATH meister promotions welcome CONFIRMED_EMAIL --confirmed
```

This command outputs a private code for the delivery adapter. Do not publish its output. Retries and unsubscribe/rejoin return the original issuance; prior purchases do not prevent issuance. Import existing newsletter issuance/subscriber identity before connecting a future provider so a migration cannot classify everyone as new. Do not call it from an unauthenticated browser or a raw unconfirmed form submission. No email is sent by this plugin.

**Campaign links:** Add `?coupon=CODE` to a storefront navigation URL. It is captured as code intent, removed from the visible URL and validated at checkout; it is not authorization or a guaranteed discount. Manual apply/removal takes precedence for the current cart, including page reloads. Email-bound codes still require the matching billing email. Never put subscriber emails into campaign URLs.

## Verification commands and evidence boundaries

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm lint
python3 tests/promotions-php-run.py
python3 tests/promotions-package.test.py
python3 wordpress/build-promotions-zip.py
```

`tests/promotions-php-run.py` uses local PHP or Docker `php:8.3-cli` for syntax/engine tests. Real Woo integration tests refuse sites whose title is not `Promotions-Test`; they are destructive disposable fixtures, never production smoke tests. Run them in a dedicated disposable WordPress + Woo + MariaDB installation:

```sh
docker exec meister-promotions-wp wp eval-file /code/tests/promotions-woo.integration.php
docker exec meister-promotions-wp wp eval-file /code/tests/promotions-shipping.integration.php
docker exec meister-promotions-wp wp eval-file /code/tests/promotions-variants.integration.php
docker exec meister-promotions-wp wp eval-file /code/tests/promotions-rounding.integration.php
docker exec meister-promotions-wp wp eval-file /code/tests/promotions-attempts.integration.php
python3 tests/promotions-concurrency.py
```

Browser test `tests/promotions.browser.mjs` consumes a private fixtures JSON (`PROMOTIONS_FIXTURES`) and `TEST_BASE_URL`. It must target a separately launched disposable real-Woo storefront with `PROMOTIONS_ENABLED=true`. No owner catalog mutation or Stripe payment is performed by that browser test. Its rate-limit REST boundary may be stubbed while Woo pricing remains real; record that distinction. Never install `tests/helpers/wordpress-router.php`, test safety overrides or fixtures on the owner's backend.

Run native Next and vinext builds sequentially because they share generated `.next/types`. A native build/typegen restores native route types before standalone TypeScript checking. Local correctness is not proof that the Pi extension is installed, proxies permit its endpoints, a runner is scheduled or Stripe receiver isolation is complete.

## Rollback

Disable `PROMOTIONS_ENABLED` to stop new protocol orders; keep its event handler, plugin, secrets, instance ID and reconciliation runner until outstanding attempts are terminal. Do not uninstall the plugin, delete its tables/options, reset identity secret or change backend URL during in-flight checkout. Preserve orders and newsletter issuance history. Production/DNS changes require a separate deployment decision.
