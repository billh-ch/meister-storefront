# Local Codex handoff: install the Meister Promotions extension

Repository: https://github.com/billh-ch/meister-storefront, branch `feat/cloudflare-preview`. Fetch into an isolated local checkout and preserve any existing uncommitted work.

The owner approved implementing this feature. Continue the concrete installation and verification described here; do not redo product/catalog migration work. Read the repository's `docs/guides/promotions-operations.md` and approved `docs/superpowers/specs/2026-11-05-promotions-design.md` first.

## Exact target

The Cloudflare `meister-storefront-test` Worker was read on 2026-11-05 and points to **https://rpiwordpress.kudu-ulmer.ts.net:8443**. Install only on the actual Woo instance that serves that endpoint. Use Tailscale for local administration. Discover its matching nginx/PHP/site/database configuration before writing anything. Do **not** install on the newly empty `meister_catalog_stage` database or `/var/www/meister-catalog-stage`, and do not modify WordPress connector sites. The managed ChatGPT workspace has no private Tailscale/SSH grant, so this local step could not be executed there.

## Artifact and authorized work

Use this repository's feature branch `feat/cloudflare-preview` and plugin archive `wordpress/dist/meister-promotions-1.0.0.zip`. Rebuild with `python3 wordpress/build-promotions-zip.py` and inspect/hash the archive. The package contains only the allowlisted production PHP/readme files. Never copy the repository's `.env`, test router, fake HTTPS/Redis test setup or any fixtures to the Pi.

1. Read local agent instructions, verify the target, and create a private database/config/plugin backup outside the web root, with restrictive permissions. Record paths and hashes without secret contents. Do not print passwords, Woo keys, proxy tokens or private coupon codes.
2. Verify PHP >=8.1, Woo >=9.5.2, transactional storage, native coupon/stock hold methods and existing pricing/shipping plugins. Check ordinary Woo coupon use is enabled; enable that feature if needed for the authorized coupon support. Do not change other business/tax/shipping settings.
3. Install/activate this separate plugin on that verified backend using the proper filesystem/site identity. Preserve the translations plugin and all products/orders. Campaigns stay disabled by default.
4. Preserve existing Funnel/proxy authentication. If necessary, narrowly allow the new authenticated `/wp-json/wc/v3/meister-promotions/` route family under the existing API proxy. Require both the existing proxy protection and Woo application authorization. Exposing wp-admin, public issuance, or broad unauthenticated REST routes is out of scope.
5. Test authenticated health/quote access through the exact public backend endpoint and verify anonymous access fails. Record version, backendId, Woo/PHP/storage mode and safe health flags. Do not create production purchases or shipments.
6. Leave `MEISTER_PROMOTIONS_CHECKOUT_READY` false/undefined. Do not enable Cloudflare `PROMOTIONS_ENABLED`, change Stripe mode/webhooks or promote production until receiver isolation, a working reconciliation timer and a full sandbox purchase have been verified. If the current Stripe receivers are unscoped, report the blocker; do not disable production endpoints casually.
7. The next integration phase uses the health backendId as storefront `PROMOTIONS_BACKEND_ID`, a new private `PROMOTIONS_CRON_SECRET`, and a verified five-minute authenticated POST runner to `/api/promotions/reconcile`. Use an existing scheduler and private credential storage. Obtain any missing platform access through the owner's normal secure flow; never ask for secrets in chat.
8. Produce `MEISTER-PROMOTIONS-INSTALL-REPORT.md`: verified site/path/database (no credentials), backups, installed hash/version, health/backendId, authorized proxy edits, authentication checks, compatibility findings, scheduler/Stripe blockers and exact remaining steps. Explicitly distinguish installed, tested, and not enabled.

Newsletter eligibility means a first confirmed subscription for each email, regardless of purchase history. Real newsletter signup/email integration is later; do not enable the disabled homepage form or send campaigns now. Existing purchasers remain eligible for a first newsletter welcome coupon. Automatic offers use explicitly selected product combinations and do not stack with coupons. Shipping stays outside the discount.
