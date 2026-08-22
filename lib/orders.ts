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
  lineItems: OrderLineItem[]
}
