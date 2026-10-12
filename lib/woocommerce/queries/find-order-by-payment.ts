import { wcFetchWithMeta } from '../client'
import type { CreateOrderInput, WcCreatedOrder } from './create-order'

/** Reconcile WooCommerce's durable transaction record before retrying a write.
 * Search supports billing email; transaction IDs require an exact match here. */
export async function findOrderByPayment(input: CreateOrderInput, sessionCreated: number): Promise<WcCreatedOrder | null> {
  const scope: Record<string, string> = input.customerId
    ? { customer: String(input.customerId) }
    : { search: input.billing.email! }
  for (let page = 1; page <= 10; page++) {
    const result = await wcFetchWithMeta<WcCreatedOrder[]>('/orders', {
      ...scope, after: new Date((sessionCreated - 86400) * 1000).toISOString(),
      per_page: '100', page: String(page), orderby: 'date', order: 'desc',
    })
    const order = result.data.find(order => order.transaction_id === input.transactionId)
    if (order) return order
    if (result.data.length < 100 || (result.total > 0 && page * 100 >= result.total)) return null
  }
  // Never create another order when reconciliation could not be completed.
  throw new Error('Order reconciliation exceeded its page limit')
}
