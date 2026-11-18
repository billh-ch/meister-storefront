# Order emails (Resend)

The storefront sends three emails through [Resend](https://resend.com), from the verified domain `orders.meister.gr` (EU region):

| Email | Trigger | To | Language |
|---|---|---|---|
| Order confirmation | Stripe's paid-session webhook, right after the WooCommerce order is created | Customer | Language the customer checked out in (EN/EL) |
| "Your order is on its way" / "ready for pickup" (with tracking) | WooCommerce reports the order **completed** | Customer | Language stored on the order (`meister_locale` order meta); English for older orders |
| New-order alert | Same moment as the confirmation | Shop owner (`ORDER_ALERT_EMAIL`, default `info@dive-meister.com`) | English |

| "Your order has been cancelled" | WooCommerce reports the order **cancelled** (same webhook as completed) | Customer | Order's stored language |
| "Your refund has been issued" | A refund is created in the **Stripe dashboard** (`refund.created` event), partial or full | Customer | Order's stored language |
| Welcome (with the welcome coupon) | Right after a customer account is created | The new customer | Language of the page they signed up on |

Customers can reply to any customer email; replies go to `info@dive-meister.com` (`EMAIL_REPLY_TO`).

WooCommerce's own customer emails are not in use (the Pi sends none), so there are no duplicates. If you ever enable them, turn off the matching ones.

## One-time setup

1. **Resend API key.** Resend → API Keys → create a key with *Sending access*, restricted to `orders.meister.gr`. Add it in Vercel as `RESEND_API_KEY` (Production, and Preview if you want to test there). Never paste it in chat or commit it.
2. **Sender.** Default sender is `Meister & Meister Dive <orders@orders.meister.gr>`. To use another address on the same domain set `EMAIL_FROM`.
3. **Footer details.** Set `BUSINESS_VAT_NUMBER` (and `BUSINESS_LEGAL_NAME` if the legal entity name differs from "Meister & Meister Dive"). The address, phone and email come from `lib/business-contact.ts`. The VAT line is omitted until the variable is set.
4. **WooCommerce webhook** (for the "completed" email). WooCommerce → Settings → Advanced → Webhooks → Add webhook:
   - Status: Active · Topic: **Order updated** · API version: WP REST API Integration v3
   - Delivery URL: `https://storefront.meister.gr/api/webhooks/woocommerce/orders`
   - Secret: a long random string; set the same value in Vercel as `WC_ORDER_WEBHOOK_SECRET`.
   Redeploy after changing variables.

Without `RESEND_API_KEY` nothing is sent and nothing breaks.

## Refunds, cancellations and the welcome gift

**Refunds are made in the Stripe dashboard only.** Stripe sends `refund.created` to `/api/webhooks/stripe`; the storefront then records the refund on the WooCommerce order (no money moves there: WooCommerce is only a record, and a full refund turns the order to *Refunded*) and emails the customer once per refund, partial or full. Refunding inside WooCommerce moves no money and sends nothing, so don't. One-time setup: in the Stripe dashboard open the webhook endpoint that points at `/api/webhooks/stripe` and add the event **`refund.created`** (same endpoint, same signing secret). The order is found through a payment→order lookup stored when the order was created; older orders are found by searching WooCommerce by the customer's email. If recording in WooCommerce fails, the customer is still emailed and a private note asks you to add the refund by hand.

**Cancellations** are sent when you set an order to *Cancelled* in WooCommerce. The email promises a refund if the customer already paid and says a separate email follows; issue the refund in Stripe to send it.

**Welcome gift.** The welcome email advertises a normal WooCommerce coupon, named by the Vercel variable `WELCOME_COUPON_CODE` (for example `WELCOME5`). Create it under WooCommerce → Marketing → Coupons: discount type *Percentage discount*, amount `5`, *Individual use only*, *Usage limit per user* `1`. The email shows the percentage straight from the coupon, and omits the gift if the coupon is missing, drafted, expired, used up, or not a percentage coupon, so it never promises something checkout would refuse. Sign-up does not verify email ownership, so the welcome email is limited to 5 per client per hour, and a determined person could still make several accounts for several 5% codes.

Turn off WooCommerce's own *Refunded order*, *Cancelled order* and *New account* emails (WooCommerce → Settings → Emails) so customers never get duplicates.

## Entering tracking details

Add the custom fields to the order **before** marking it completed, because the email is sent the moment the status changes. In the order screen enable *Custom Fields* (Screen Options) and add:

| Name | Value |
|---|---|
| `meister_tracking_carrier` | e.g. `BOX NOW`, `ACS Courier` |
| `meister_tracking_number` | the parcel / voucher number |
| `meister_tracking_url` | optional; must start with `https://` |

Orders filled by the *Advanced Shipment Tracking* plugin are read too. Orders with local pickup get a "ready for pickup" email with the store address instead of tracking. If a courier plugin stores its own tracking field, tell us its meta key and we can read it as well.

## Behaviour you should know

- **Never blocks an order.** Email problems cannot fail an order or make Stripe retry. A failure is logged and a private note ("… could not be sent (…)") is added to the WooCommerce order.
- **Once only.** Each email is sent at most once per order (Redis marker plus Resend's idempotency key). A failed send is released so a later retry can send it.
- **Completed email.** Sent once, the first time the order is seen as completed. Moving an order back and forth does not email again. If the send fails, a note is added and the email is not retried automatically.
- **Webhook timing.** WooCommerce delivers webhooks from a background job that depends on WP-Cron. On a quiet server, "completed" emails can arrive late. A real server cron for WP-Cron (or the planned managed hosting) fixes it. The confirmation email is not affected.
- **Not a tax document.** The footer says so. The legal receipt/invoice process is separate.
- Stripe may also send its own receipt (live mode, if enabled in the Stripe dashboard).

## Email images

Email apps cannot draw the logo or the torn receipt edge with CSS, so both are small PNGs served from this site and referenced by absolute URL:

- `public/email/meister-logo.png` — the small yellow Meister logo (made from the brand PDF: render with `pdftocairo -png -r 300`, turn the black artwork into the alpha channel, colour it `#FFD700`, trim and resize to 330px wide; shown at 110px).
- `public/email/receipt-edge.png` — the sawtooth bottom edge, generated by `scripts/generate-email-edge.mjs`.

They load from the production domain, so they appear in real emails once this is deployed. If an app blocks images the logo shows its alt text, the yellow "MEISTER DIVING" headline stays (it is text) and the card ends in a straight edge.

## Previewing the design

```bash
node scripts/render-email-preview.mjs ./email-preview
```
Writes sample HTML files (EN/EL) and sends nothing. Open them in a browser.

## Code map

`lib/email/` — `resend.ts` (client), `templates/` (customer, account, owner), `notify.ts` (once-only sending), `tracking.ts`, `config.ts`, `send-welcome.ts`, `welcome-offer.ts` · `lib/refunds/` (Stripe refund handling) · `lib/woocommerce/order-webhook.ts` and `app/api/webhooks/woocommerce/orders/route.ts` (completed webhook) · `app/api/webhooks/stripe/route.ts` (confirmation) · `lib/i18n/dictionaries/emails.ts` (Greek copy, needs the owner's review).
