# Delivery prices and VAT

WooCommerce stores **delivery rates without VAT**, unlike product prices, which include VAT. The Store API reports each rate's `price` and its `taxes` separately.

- The storefront shows and charges the customer **`price + taxes`** (`lib/woocommerce/mappers/map-shipping-rate.ts`).
- The paid webhook sends WooCommerce the **net** rate as the order's shipping line (`shippingNet` in the Stripe session metadata). WooCommerce adds the same VAT back, so its total equals what Stripe charged.
- Every new order is compared with the Stripe charge in whole cents (`lib/checkout/total-check.ts`). A difference adds a private order note.

Before this fix, the storefront charged only the net rate. A "€3" rate cost the customer €3.00 while WooCommerce recorded €3.72.

## Setting a rate (WooCommerce → Settings → Shipping)

Enter the rate **before VAT**. With 24% VAT and 2-decimal rounding:

| Customer pays | Enter in WooCommerce |
|---|---|
| €3.00 | 2.42 |
| €5.00 | 4.03 |
| €10.00 | Not possible exactly: 8.06 gives €9.99, 8.07 gives €10.01 |
| €15.00 | 12.10 |

The same applies to BOX NOW's own price setting. Check the delivery price on the storefront checkout after any change.
