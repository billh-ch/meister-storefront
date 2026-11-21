import { wcFetch } from '../client'

export interface WcOrderLineItem {
  name: string
  quantity: number
  total: string
}

export interface WcOrder {
  id: number
  number: string
  status: string
  date_created: string
  date_created_gmt?: string
  customer_id?: number
  currency?: string
  refunds?: { id?: number; total?: string }[]
  meta_data?: { key: string; value: unknown }[]
  total: string
  transaction_id: string
  line_items: WcOrderLineItem[]
}

/** Never cached — a shopper who just checked out expects to see the new
 *  order immediately, not after some ISR window elapses. */
export async function fetchOrdersByCustomer(customerId: number): Promise<WcOrder[]> {
  return wcFetch<WcOrder[]>('/orders', {
    customer: String(customerId),
    per_page: '50',
    orderby: 'date',
    order: 'desc',
  })
}
