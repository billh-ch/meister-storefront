# Customer order cancellation

Signed-in customers can cancel their own order from **Account → Your orders** for a short time after ordering. A storefront order only exists once it is paid, so cancelling means **refund in Stripe, then cancel in WooCommerce**.

## Rules (`cancelEligibility` in `lib/orders/cancel.ts`)

All checked live on the server, never from the page:

- the order belongs to the signed-in customer (`customer_id`);
- status is **Processing**;
- it is less than `CUSTOMER_CANCEL_WINDOW_HOURS` old (default **2**, `0` turns the feature off, max 14 days);
- it was paid through Stripe (`transaction_id` is a PaymentIntent), in EUR, and has no refunds yet.

The shop keeps control: moving an order to **On hold**, **Completed** or any other status removes the Cancel button immediately. Guest orders cannot be cancelled online.

## Flow

1. `cancelOrderAction` (`lib/account/cancel-actions.ts`) → `cancelOrderForCustomer`.
2. A Redis lock `order:cancel:{id}` (90 s) stops double clicks. If Redis is unavailable the cancel is refused.
3. **Full Stripe refund** with idempotency key `customer-cancel-{orderId}` and metadata `source=customer_cancel`. If it fails, nothing else happens.
4. `finishCustomerCancel` (idempotent): records the refund on the Woo order (`api_refund:false`, `restock_items:false`), sets status **Cancelled** with meta `meister_customer_cancel=<reason>` (WooCommerce restores stock and coupon usage on Cancelled), adds an order note, then sends one customer email and one shop alert.
5. Stripe's `refund.created` webhook sees `source=customer_cancel` and runs the same `finishCustomerCancel` — the safety net if step 4 stopped halfway. While the account action still holds the lock, the webhook answers 503 so Stripe retries.

The order is never marked cancelled before the money is refunded. If WooCommerce fails after the refund, the customer is still told, and the shop alert says **Action needed / do not ship** (also written as an order note).

## Emails

- Customer: "Your order has been cancelled", refund amount, 5–10 business days.
- Shop (`ORDER_ALERT_EMAIL`): order, amount, Stripe refund id, reason, and any action needed.
- The generic "cancelled" email (WooCommerce webhook) and the generic refund email are skipped for these orders, so the customer gets one email.

## Costs and limits

- Stripe does not return its processing fee on refunds: each cancellation costs that fee.
- Refunds take 5–10 business days to reach the customer.
- Whole orders only; no partial cancellation.
