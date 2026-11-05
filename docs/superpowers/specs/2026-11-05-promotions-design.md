# Coupons, newsletter welcome offers and product bundles

Status: proposed design for owner review; no feature implementation or deployment authorized by this document.
Date: 2026-11-05.

## Intent and agreed scope

Give the existing Cloudflare storefront marketing promotions whose eligibility, prices and redemption records are authoritative in its existing WooCommerce backend. Leave the new empty catalog staging server and the product rebuild unchanged.

The owner has chosen:

- A custom WooCommerce extension, maintained in this repository, rather than a new paid promotions dependency.
- A coupon entry/apply/remove control only on checkout, in English and Greek, usable by guests and account customers. Maximum one entered or campaign-link coupon per order.
- Ordinary discounts cover merchandise, including product extras when those extras are supported. Delivery is added separately and never discounted by these promotions. Taxes follow WooCommerce settings and are recalculated after the merchandise discount.
- A newsletter welcome coupon for each email subscribing to the newsletter for the first time, including previous purchasers. This is NOT a first-purchase offer. Previous purchase history does not affect eligibility.
- Automatic offers for explicitly selected combinations of products already in the cart, available to everyone. No arbitrary mix-and-match or automatic addition of products. Bundle savings and coupon savings do not stack.
- Influencer code attribution and sales tracking, without commissions or payouts.
- Campaign links that remember a coupon for evaluation at checkout.
- Newsletter marketing and signup integration will be set up later. Prepare its promotion contract now without pretending newsletter subscription or email delivery is live.

## Approaches considered

1. WooCommerce native coupons alone: retain native coupon calculation and management, but this does not supply the agreed automatic selected-product offers and newsletter issuance lifecycle by itself. Insufficient for the complete requirement.
2. A third-party promotions plugin: potentially less custom backend work, but entails compatibility verification for Store API, headless checkout, tax and reservations, and possibly a subscription. Not selected.
3. Native WooCommerce coupons plus a focused Meister extension: preserve ordinary coupon administration and calculation; add bundle rules, newsletter issuance, attribution, and an authenticated checkout/order contract. Selected by the owner because it supports the storefront without requiring a paid promotions plugin.

This is a checkout project, not just a coupon input. Pending-order creation and payment reconciliation are part of its scope.

## Current implementation and constraints

- `lib/cart/cookie.ts` and the cart schema persist product/variation identities, options and quantities, not trusted money. Keep that property.
- `lib/woocommerce/queries/get-shipping-rates.ts` reconstructs throwaway Store API carts and reads shipping rates. It does not yet return canonical complete pricing or apply coupons.
- `lib/checkout/actions.ts` independently builds Stripe product and shipping lines. It sends cart metadata, sometimes omitting unpinned variant choices to fit Stripe's metadata limit.
- `app/api/webhooks/stripe/route.ts` creates and reprices the Woo order after payment. `create-order.ts` does not apply coupons. This can produce inconsistent discounts if only a frontend or Stripe discount is added.
- `components/newsletter-section.tsx` is visibly disabled; there is no real subscription endpoint. Keep it honest and disabled until a real newsletter integration exists.
- The existing protected Woo API uses the storefront's server credentials and proxy header. No WordPress.com connector sites may be edited. Confirm the actual configured backend/site before installation; do not switch to the new empty server.
- The Cloudflare preview and an older Vercel handler have historically received events from the same Stripe test account. The older handler is not reliably scoped to the new checkout protocol. This is a rollout dependency, not something a metadata tag alone fixes.
- Product add-ons are not implemented in this storefront. This project must preserve supported product/variation choices and create an extension point for extras, but must not claim missing YITH options now work.

## Shopper experience

Checkout has a compact expandable coupon control with Apply, a loading state, removal, and an explicit result. Show merchandise subtotal, one promotion saving, shipping and the authoritative payable total. Preserve existing layout, fonts, mobile usability and Greek terminology.

Automatic selected-product savings appear in the full cart, popup cart and checkout summaries when a valid quote is available; no coupon entry is added to either cart view. Quotations without full address/email can be provisional and must be labeled accordingly where those facts affect tax or eligibility. Checkout is the authoritative final total. Opening a drawer must not trigger an unbounded sequence of origin calls.

Requote after products, quantities, choices, coupon intent, customer/email, address or shipping selection change. Reject out-of-order responses. Invalidate the quote after a cart edit, and never leave an old discounted total enabled for payment. Keep the shopper's intended code through navigation and a Stripe cancellation; clear it after the corresponding successful order. A validation error or backend outage must not silently remove an expected discount and charge more.

### Proposed builder defaults, not additional owner requirements

- Evaluate a valid explicit coupon and the best eligible automatic bundle as alternative complete Woo pricing scenarios. Use the lower payable total for the same delivery selection; on ties retain the automatic bundle. Show a clear message if a valid code gives no additional saving. Keep the valid code as intent so it can become applicable after a cart change, but never record it as redeemed when the bundle won. Invalid codes display an error, while separately eligible automatic savings may still apply.
- At most one bundle rule supplies the automatic promotion for an order. A rule may apply to every complete set in the cart up to its administrator-configured application limit. Evaluate rules independently, choose the best outcome, and do not combine them. This avoids overlap and stacking ambiguity in the initial release.
- No offer, welcome discount amount or expiry is invented or enabled automatically. Merchants configure actual campaigns before activation.
- Ordinary native coupons may retain Woo product/category/sale restrictions set by the administrator; general store-wide coupons discount all supported merchandise. No free-shipping coupon functionality, gift cards, store credit, commissions or outbound marketing automation is included in this release.

## Backend extension and management

Create a separate package under `wordpress/meister-promotions/` with versioned schemas, an installable ZIP, tests and an operations guide. Do not fold this into or weaken the existing translations plugin. Use Woo CRUD and support the installed Woo storage mode, including HPOS where enabled. Detect required capabilities/version support during preflight and fail explicitly when unsupported.

Use native Woo coupon records for percent, fixed-cart and fixed-product coupons, their configured restrictions, expiry and usage limits. Require server enforcement of the single-coupon rule, not just a disabled UI control. Never list coupon definitions or private restrictions to anonymous clients. Backend API access uses dedicated authorization and capability checks in addition to the existing network proxy protection; that proxy header alone is not application authorization.

Provide shop-manager administration for:

- Native coupons, optionally linked to a campaign or influencer identifier.
- Bundle rules: name, enabled state, date range, required product or explicit variation selectors and quantity per selector, percentage or fixed-euro merchandise saving per complete set, and optional maximum sets per order. A parent-product selector accepts its valid variations; an explicit variation selector accepts only that variation. Repeated quantities of a line must not satisfy two requirements within the same set. Inactive/unavailable items do not qualify. Percentage savings apply to the qualifying set, and fixed savings cannot exceed that set's eligible value.
- A disabled-by-default newsletter welcome template: native discount type/amount, configured restrictions and optional validity duration, always one use for the bound email.
- Attribution reports with paid order count, discounted merchandise sales and discount amount by campaign/influencer. Reflect full and partial refunds in net metrics and identify currency; no commission balances or payment facilities. Access is restricted to appropriate shop-management capabilities.

Bundle discounts must be represented as positive line-level merchandise discount allocations, with Woo tax calculation and explicit rule/version metadata. Do not fake them as negative fees or adjust shipping. Internal synthetic coupon machinery, if used to integrate Woo's discount engine, must be inaccessible as a shopper code and must not consume the one entered-code slot. Configure caps and dates server-side and preserve prices and unrelated product data.

Existing YITH or other pricing hooks require a compatibility audit on the actual backend. An unknown incompatible adjustment must fail validation, not be applied twice. Future supported extras will enter the same authoritative merchandise model and discount allocation; no separate browser-only extra prices.

## Canonical quote and pending order contract

Add a protected, versioned backend quote endpoint. Input contains bounded product/variation/quantity/choice identities, optional coupon intent, authenticated customer context or guest billing email, address, selected delivery and BOX NOW data. Customer identity comes from verified server session context, not browser claims. No client-supplied unit price, saving or order total is accepted.

Woo reconstructs a scoped cart and computes tax, discounts and eligible shipping together using its actual configuration. Return normalized lines with pre-discount and discounted amounts/taxes, promotion descriptor and allocation, shipping choices and selected rate, currency/minor units, total, quote version and expiry, and an opaque quote reference bound to the cart and shopper session. Do not leak a shared mutable Woo session across shoppers. Use integer minor units for comparisons and a deterministic allocation/remainder policy matching Woo; never duplicate tax arithmetic in JavaScript.

Cart-only quotes do not reserve a coupon or stock. Use bounded requests and no public/CDN caching of personalized responses. Debounce browser requests and deduplicate identical in-flight work; authoritative payment preparation always revalidates fresh.

Payment preparation runs through a protected backend operation: revalidate cart, promotion and delivery; create/reuse an unpaid pending Woo order with the complete immutable checkout snapshot; reserve applicable stock/coupon capacity; return the exact payable breakdown and opaque checkout attempt reference. Verify snapshot/order totals match and the quote has not changed before returning a Stripe URL. Persist all selected options on order lines; Stripe metadata contains short order/attempt, backend/environment and protocol references, not a truncated cart or shopper details dump.

An atomic backend attempt/reservation ledger must enforce coupon-wide and per-customer/email limits across simultaneous tabs or buyers. Merely checking current usage and later incrementing it is insufficient. Prefer tested Woo native reservation facilities when the installed version provides the required guarantees; otherwise add transactional unique reservation records and document their relation to normal Woo checkout. Coupon limits must remain correct across every enabled checkout channel, not only the new storefront. If that cannot be guaranteed with current gateways/plugins, activation is blocked until the integration handles those channels.

One stable attempt key reuses the same pending order and Stripe Session on retried preparation; a changed cart or promotion supersedes an older attempt only after its session cannot still complete. Use Stripe's idempotency facilities and backend uniqueness constraints. Reservations have a defined lifetime aligned with the actual payment session. Expire/cancel a superseded session before releasing its reservation. Do not free reservations for an asynchronous payment already processing. Recover ambiguous Stripe/backend writes by lookup, not unconditional creation.

Retain Stripe-hosted Checkout. Represent the order's validated discounted merchandise and separate undiscounted delivery so line rounding, taxes and currency sum exactly to Woo's total. Any Stripe-side discount object is only a projection of that snapshot, not an independent coupon rules engine; do not enable Stripe's separate promotion-code field. Do not turn on Stripe automatic tax alongside Woo calculation. Implementation chooses the exact Checkout line representation after verifying it against the installed SDK/API, including odd-cent and tax-inclusive cases.

Handle an exactly zero-payable order explicitly through a server-validated, idempotent no-payment completion path, since it need not have a PaymentIntent. Never label it a successful card charge. It still consumes the correct promotion usage and records a real order once.

## Payment events, expiry and recovery

Verify Stripe signatures and retrieve/validate the authoritative session when needed. Enforce environment, backend and protocol ownership; verify order/attempt/session binding, EUR currency and exact total before completion. Process normal success, asynchronous success/failure and session expiry. A completion marks the existing Woo order paid through its normal lifecycle, without repricing products or reevaluating changed marketing rules after payment. Stock reduction, usage redemption and attribution happen exactly once. Preserve normal processing versus completed behavior for physical products.

Persist durable order/session/payment bindings and redemption state in Woo, with atomic state transitions and unique constraints. Redis may coordinate work and hold short-lived receipts, but losing or expiring a Redis key must not allow a duplicate order or redemption. Duplicate, delayed or reordered events converge on the same state. Never cancel/refund an already paid order because an older expiry/failure event arrives.

The return/confirmation page is a read/reconciliation surface, not the only completion mechanism. A customer can close the page without losing the order. Scope guest order access to verified session ownership; an order ID or coupon code is not an access credential.

Define a durable cleanup/reconciliation job for expired pending attempts and failed events. The implementation must audit the actual backend's cron/Action Scheduler health and choose a working runner; do not assume low-traffic WP-Cron reliably releases holds. Confirm Stripe state before cancellation/release and retry transient failures safely. Provide a shop-manager-visible failed-attempt/reconciliation view and a bounded replay/reconcile action. Paid total mismatches enter an explicit operational review state, with no automatic fulfillment or unapproved refund.

Legacy sessions created before the change must remain fulfillable exactly once until they expire. Retain a bounded legacy handler route/protocol for those sessions; do not make the new pending-order requirement drop already-paid sessions. The implementation plan must inventory every existing Stripe receiver. New sessions cannot be enabled while an unscoped old handler can create a second order. Use an isolated test sandbox or properly scoped receivers after the necessary authorization; do not silently alter Vercel production to unblock preview tests.

## Newsletter issuance prepared for later integration

The newsletter system remains the source of verified subscription status. Prepare a protected issuance service/CLI contract for a future trusted signup adapter. Do not expose a public `email -> coupon` API and do not issue on merely loading a link or submitting an unconfirmed address. The future provider adapter must authenticate its events and map a first confirmed subscription to the stable newsletter identity.

Maintain a durable unique issuance ledger keyed by newsletter/program and conservatively normalized email (trim/case normalization consistent with Woo; no Gmail-style dot/plus rewriting). On first confirmed signup, issue one unguessable native coupon bound to that email and one redemption. Atomically persist the coupon and issuance mapping; retries return the same issuance, including recovery if creation succeeded but an acknowledgment was lost. Unsubscribe/resubscribe, duplicate events and concurrent requests do not earn another welcome code. Prior purchases are irrelevant.

Return the existing issuance to an authenticated delivery adapter for safe retry rather than regenerate a coupon after a send failure. Apply the template/expiry from issuance, not a later template edit. Never issue against an incomplete or disabled template. The future newsletter migration must import existing subscriber/issuance identity before going live so existing subscribers cannot all masquerade as new. No provider, email sending or live signup is selected or connected by this project.

Keep subscriber PII and coupon issuance records in protected Woo storage, not publicly cached data. Customer/email data and private single-use codes must not enter logs or analytics. Define administrative retention/deletion treatment without erasing redemption or paid accounting history through a frontend unsubscribe request. Rate limit public quote/apply endpoints, and never reveal whether another address is subscribed or has redeemed a code.

## Campaign links and attribution

Accept a bounded code parameter on storefront links, including `/el` URLs. Capture intent into server-controlled session state, clean it from the visible address where possible, and evaluate it only with the real checkout cart/customer context. Do not copy it into external navigation, analytics or arbitrary redirect targets. Email-bound welcome links remain unusable for a different billing email. Codes are not authentication tokens.

A link may replace previous intent only through an actual permitted navigation; third-party passive resources must not mutate coupon state. A manually applied/replaced/removed code takes precedence for the current cart. A dismissed link must not silently reapply on every checkout render. Only one active code exists; switching locale retains it. Validate codes as data, not as redirects or HTML.

Store promotion/campaign/influencer identifiers and rule version on the pending order and successful order. Track only the promotion actually used. If the automatic bundle wins, do not credit a coupon influencer as a redeemed discount. Further multi-touch marketing attribution is outside scope.

## Rollout, access and rollback

Implementation order: backend contract and tests; authoritative quote adapter and pending-order payment lifecycle; checkout/cart presentation and links; management and issuance preparation; integration verification and packaging. Exact coding tasks belong to the implementation plan after design approval.

Confirm the current Cloudflare backend and safe installation path, back up the actual target plugin/database, and package the extension before requesting any access that is genuinely missing. The managed workspace has no assumed private Tailscale/SSH access. If remote administration is unavailable, provide a concrete local-Codex installation/verification handoff. Do not claim the backend is installed or tested from a ZIP build alone.

Use preview and Stripe sandbox payments; mark test records clearly and audit mail, shipment, stock and other Woo side effects before creating them. Keep rules scoped/disabled by default so installing on a shared Woo backend does not alter unrelated sales. Do not change the new staging server, DNS, paid services, live payment mode or Vercel production in this planning phase.

Enable the new protocol behind a feature flag only after its backend contract, event ownership and reconciliation runner are verified. Rollback disables new preparation while continuing to complete existing pending attempts; do not deactivate the extension while paid/in-flight attempts still require it. Preserve ledger/orders and refund visibility. Existing non-promotion checkout must keep working during a controlled migration.

## Acceptance evidence

- One code enforced server-side; no code fields in full cart or popup; accessible responsive checkout in both languages.
- Percent/fixed native discounts, expiry, spend/product/category/sale/email restrictions and total/per-email limits checked by Woo; rejected codes never cause an undisclosed higher charge.
- Existing purchaser/new newsletter subscriber qualifies; unknown/unconfirmed signup cannot mint; duplicate/rejoin/concurrent issuance returns the same code; wrong email cannot redeem.
- Automatic rules match only configured products/variations/quantities; partial sets, repeated sets, overlapping rules, sold-out choices and caps behave deterministically. Best automatic promotion and code do not stack.
- Supported merchandise/extras discount allocations and Woo taxes reconcile to cents; delivery is unchanged by direct discounting, although Woo shipping-threshold eligibility may legitimately recalculate after merchandise changes. Test GR courier, pickup, BOX NOW and another country.
- Cart edits/email/address/locale changes, campaign-link replacement/removal, expired quotes and stale network responses preserve correct state and privacy.
- Pending order, Stripe display/charge, Woo order, confirmation and attribution agree, including odd cents, 100% merchandise savings, zero payable, asynchronous payments and refunds in reports.
- Concurrent final-use redemption, duplicate prepare/events, network failures between every write, abandoned sessions, delayed success, legacy sessions and reconciliation after Redis loss cannot duplicate orders/redemptions or release active holds.
- No personalized CDN cache, public coupon enumeration, arbitrary price/customer claims, subscriber leakage, unsafe redirects or unrelated WordPress changes.
- Local tests plus actual installed-Woo/Stripe sandbox verification are required. Record untested access/infrastructure dependencies plainly; do not call production ready from unit tests alone.

## References

- Native coupon management and restrictions: https://woocommerce.com/document/coupon-management/
- Woo Store API cart coupon application/removal and canonical responses: https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart/
- Stripe Checkout fulfillment and asynchronous payment events: https://docs.stripe.com/checkout/fulfillment
