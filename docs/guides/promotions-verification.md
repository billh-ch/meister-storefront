# Promotions verification — 2026-11-05

Implementation: `d6b596a` on `feat/cloudflare-preview`, following the approved 2026-11-05 promotions design. This records local evidence, not a production activation.

## Verified

- Full Node suite: **199 passed, 0 failed** (baseline 180). The 19 new tests cover backend monetary validation, exact Stripe line projection, event ownership/state, ambiguous session creation, terminal checkout renewal, canonical delivery binding, zero payments and reconciliation recovery/isolation. Stripe calls in these new tests use controlled external-boundary fixtures; no new Stripe Session or payment was created.
- PHP syntax for every plugin PHP file and pure bundle/cent/refund allocation assertions passed under PHP 8.3.
- Actual disposable WordPress **7.1.4**, WooCommerce **11.2.2** and MariaDB **11.4** integration tests passed for native coupon restrictions, best bundle versus coupon, email-bound welcome issuance, interrupted coupon-save recovery, VAT and undiscounted delivery, taxonomy/Any-axis variation choices, localized display labels, native coupon rounding, durable pending orders, completion failure/retry, durable review, delayed-event ordering and zero-payment orders.
- Concurrent **separate PHP processes** contended for coupon-wide capacity, per-email capacity, stock alone and combined capacity. Every case produced one successful order; repeating the winning request reused it.
- Actual browser → storefront → local Woo quote flow passed in English and Greek at **390px and 1440px**: apply/remove, invalid-code blocking, best-offer/no-stacking, cart savings and checkout-only coupon input. Campaign capture/dismissal, manual recovery after a capture failure and a first-visit cart/session race also passed. Only the external Redis rate-limit REST boundary was stubbed for these browser tests; Woo pricing was real. No payment was submitted.
- TypeScript passed. ESLint had **0 errors** and the existing unused-disable warning at `components/navbar.tsx:63`.
- Native Next and Cloudflare/vinext builds passed sequentially with fixture data, promotions disabled and product prerendering off. A final native build restores native generated route types after vinext.
- The plugin ZIP is allowlisted and byte-reproducible. It contains no test fixtures, credentials or environment files. SHA256: `0d5e03d51ac4f9f52bc67bfea2f8e39e5c7b559afff7bd41ff27268e77f6167f`.
- An independent code review reported 8 Important and 4 Minor findings. The fix pass addressed all 12; the same reviewer verified those changes and reran all 19 focused Node tests with no unresolved material finding. Variation/localized-display and native-rounding checks were added during final integration verification.

## Target and remaining installation evidence

A read-only Cloudflare settings request confirmed the preview still targets `https://rpiwordpress.kudu-ulmer.ts.net:8443`, in Stripe test mode. The managed environment reports no private VPN/Tailscale/TCP grant; its injected Woo URL points at an obsolete tunnel. The owner's Pi was not changed or installed from this workspace.

The extension still needs installation on that verified backend, compatible pricing/BOX NOW/HPOS and authentication checks there, a working authenticated reconciliation runner, isolated/scoped Stripe receivers, and a complete sandbox purchase before activation. The actual installed backend's version/storage mode is not inferred from the disposable test environment. `PROMOTIONS_ENABLED` remains disabled by default; no live payments, production promotion, DNS changes or paid services were enabled.

Use `pi-promotions-install-handoff.md` and `promotions-operations.md` for the concrete local-Codex installation and activation sequence. Newsletter provider signup, subscriber migration and email delivery remain explicitly deferred; the homepage signup is still disabled.
