import type { Order } from '@/lib/orders'
import type { WcOrder } from '../queries/get-orders-by-customer'

function toNumber(raw: string): number {
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function mapOrder(wc: WcOrder): Order {
  return {
    id: wc.id,
    number: wc.number,
    status: wc.status,
    dateCreated: wc.date_created,
    total: toNumber(wc.total),
    lineItems: wc.line_items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      total: toNumber(item.total),
    })),
  }
}
