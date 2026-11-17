# Discount codes (native WooCommerce coupons)

Shop managers create codes in **WooCommerce → Marketing → Coupons**. There is
no separate plugin. Shoppers enter one code in the checkout summary; the
storefront checks it live against WooCommerce.

Coupons must be enabled once: WooCommerce → Settings → General → *Enable the use of coupon codes*.

## What the storefront supports

| WooCommerce setting | Behaviour |
|---|---|
| Discount type **Percentage discount** / **Fixed cart discount** | Supported. Applied to products only, never to delivery. |
| Coupon amount | Percentage of, or fixed euro amount off, the eligible products. A fixed discount never exceeds the eligible products. |
| Coupon expiry date | Enforced. |
| Usage limit per coupon / per user | Enforced (per user = account ID or billing email). |
| Minimum / maximum spend | Checked against the whole purchasable cart. |
| Products / Exclude products | Enforced. |
| Exclude sale items | Enforced. |
| **Fixed product discount**, **Free shipping**, **Product categories**, **Exclude categories**, **Allowed emails** | **Not supported.** The code is refused with "can't be used online" rather than silently ignoring the restriction. |

Codes are matched case-insensitively. Keep them to letters, numbers, `-`, `_`, `.` and spaces (max 50 characters).

## How it works

1. Checkout calls `POST /api/checkout/coupon`, which reads the shopper's server-side cart and `lib/coupons/validate.ts` (WooCommerce lookup) + `lib/coupons/evaluate.ts` (pure rules) decide the discount. Rate limited to 20 attempts per 10 minutes per client (Redis, fails open).
2. At payment, `createCheckoutSessionAction` **recomputes** the discount (the figure the browser showed is only a consistency check), creates a single-use Stripe coupon for exactly that amount and attaches `couponCode`/`couponDiscount` to the session metadata.
3. The paid-session webhook creates the WooCommerce order with `coupon_lines`, so WooCommerce records the usage. It then compares the order total with what Stripe charged; a difference adds a private order note ("Total check …") instead of blocking the order.
4. If WooCommerce refuses the coupon *after* the customer paid (e.g. its last use was just taken), the order is still created at the paid price using a discount fee line, flagged by the `meister_coupon_fallback` order meta. VAT lines are not reduced in that fallback — review those orders.

## Known limits

- Two shoppers paying at the same moment can both pass a "1 use left" check; the loser is handled by the fallback in step 4.
- VAT-inclusive prices: WooCommerce computes the order discount on net amounts, so a one-cent difference from the Stripe charge is possible and is flagged by the order note.
- Stripe creates one coupon object per discounted checkout attempt; they are harmless and can be archived in the Stripe dashboard.

## Bundles

Core WooCommerce has no discounted bundle product (the official *Product Bundles* is a paid extension and is not supported by the storefront). For a fixed bundle, create a normal **Simple product** (e.g. "Fins + Booties Set") at the deal price and manage its stock by hand.

## Testing a code

Use Stripe test cards only. After a test payment check the WooCommerce order: the coupon appears on the order, totals match the Stripe payment, there is no "Total check" note, and the coupon's usage count went up.
