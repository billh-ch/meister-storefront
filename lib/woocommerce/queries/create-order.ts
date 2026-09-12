import { wcMutate } from '../client'

export interface WcAddress {
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  postcode: string
  country: string
  phone?: string
  /** Guest orders need the email on the billing address — a logged-in order
   *  gets it from the WooCommerce customer record instead. */
  email?: string
}

export interface CreateOrderLineItem {
  productId: number
  variationId?: number
  quantity: number
  /** Extra choices the variation doesn't already carry (e.g. an "Any …" skin
   *  colour the shopper picked) — surfaced on the order so the shop can pick
   *  and pack the right item. `key`/`value` is WooCommerce's line-item meta
   *  shape; `key` shows as the label in the admin. */
  metaData?: { key: string; value: string }[]
}

export interface CreateOrderShippingLine {
  /** WooCommerce's shipping method *type* (`flat_rate`, `local_pickup`, a
   *  plugin's own slug, …) — from `ShippingMethod.wcMethodId`
   *  (`lib/woocommerce/index.ts`), not the app's own zone-scoped selection id. */
  methodId: string
  methodTitle: string
  /** Decimal string, e.g. `'3'` or `'0'` — same format WooCommerce itself
   *  uses for `shipping_lines[].total`. */
  total: string
}

export interface CreateOrderInput {
  /** Omitted / undefined for a guest checkout — sent to WooCommerce as
   *  `customer_id: 0`, which creates a real guest order keyed off
   *  `billing.email`. */
  customerId?: number
  lineItems: CreateOrderLineItem[]
  billing: WcAddress
  shipping: WcAddress
  transactionId: string
  /** Omitted only if checkout somehow completed with no resolvable method —
   *  the order then simply has no shipping_lines, same as before this field
   *  existed. */
  shippingLine?: CreateOrderShippingLine
}

export interface WcCreatedOrder {
  id: number
  number: string
  status: string
  total: string
  transaction_id: string
}

/**
 * Creates the real WooCommerce order. Deliberately **no price field** on any
 * line item — WooCommerce prices `line_items` itself from its own live
 * product data when only `product_id`/`variation_id`/`quantity` are given,
 * so nothing here can dictate a price, only reference a product/variation id.
 *
 * Deliberately **no mock fallback and no try/catch-to-mock** — a failed
 * order creation must throw and surface as a real failure, never silently
 * succeed against fake data.
 */
export async function createOrder(input: CreateOrderInput): Promise<WcCreatedOrder> {
  return wcMutate<WcCreatedOrder>('/orders', 'POST', {
    customer_id: input.customerId ?? 0,
    line_items: input.lineItems.map((item) => ({
      product_id: item.productId,
      variation_id: item.variationId,
      quantity: item.quantity,
      ...(item.metaData && item.metaData.length > 0 ? { meta_data: item.metaData } : {}),
    })),
    ...(input.shippingLine
      ? {
          shipping_lines: [
            {
              method_id: input.shippingLine.methodId,
              method_title: input.shippingLine.methodTitle,
              total: input.shippingLine.total,
            },
          ],
        }
      : {}),
    billing: input.billing,
    shipping: input.shipping,
    payment_method: 'stripe',
    payment_method_title: 'Credit Card (Stripe)',
    set_paid: true,
    transaction_id: input.transactionId,
    status: 'processing',
  })
}
