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
}

export interface CreateOrderInput {
  customerId: number
  lineItems: { productId: number; variationId?: number; quantity: number }[]
  billing: WcAddress
  shipping: WcAddress
  transactionId: string
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
    customer_id: input.customerId,
    line_items: input.lineItems.map((item) => ({
      product_id: item.productId,
      variation_id: item.variationId,
      quantity: item.quantity,
    })),
    billing: input.billing,
    shipping: input.shipping,
    payment_method: 'stripe',
    payment_method_title: 'Credit Card (Stripe)',
    set_paid: true,
    transaction_id: input.transactionId,
    status: 'processing',
  })
}
