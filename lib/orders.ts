/**
 * Kept separate from `lib/mock-data.ts` on purpose: there's no mock story
 * for a real signed-in shopper's order history — orders only ever come
 * from a live WooCommerce customer id, never a fallback dataset.
 */
export interface OrderLineItem {
  name: string
  quantity: number
  total: number
}

export interface Order {
  id: number
  number: string
  status: string
  dateCreated: string
  total: number
  /** The Stripe PaymentIntent id, once an order has been paid through
   *  checkout — used to look an order up right after payment (see
   *  `app/api/orders/by-payment-intent/route.ts`). Empty for any order not
   *  created through this app's Stripe checkout. */
  transactionId: string
  lineItems: OrderLineItem[]
}
