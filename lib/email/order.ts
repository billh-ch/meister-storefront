/** The part of a WooCommerce REST v3 order payload the emails read. Every
 *  field is optional on purpose: email must degrade, never throw. */
export interface EmailAddress {
  first_name?: string; last_name?: string; company?: string
  address_1?: string; address_2?: string; city?: string; postcode?: string; country?: string
  email?: string; phone?: string
}
export interface EmailOrderMeta { key: string; value: unknown; display_key?: string; display_value?: unknown }
export interface EmailOrder {
  id: number
  number?: string
  status?: string
  customer_id?: number
  date_created_gmt?: string; date_created?: string
  currency?: string
  total?: string; total_tax?: string; discount_total?: string; discount_tax?: string; shipping_total?: string; shipping_tax?: string
  payment_method_title?: string
  billing?: EmailAddress
  shipping?: EmailAddress
  line_items?: { name?: string; quantity?: number; subtotal?: string; subtotal_tax?: string; total?: string; total_tax?: string; meta_data?: EmailOrderMeta[] }[]
  shipping_lines?: { method_id?: string; method_title?: string }[]
  coupon_lines?: { code?: string }[]
  fee_lines?: { name?: string; total?: string }[]
  meta_data?: EmailOrderMeta[]
}

export const orderNumber = (order: EmailOrder) => String(order.number || order.id)
export const metaValue = (order: EmailOrder, key: string): string => {
  const entry = order.meta_data?.find(item => item.key === key)
  return typeof entry?.value === 'string' ? entry.value : ''
}

const cents = (value: string | number | undefined) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value ?? '')
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** Gross (VAT-inclusive) figures in cents, the way the shop's prices are shown. */
export function orderTotals(order: EmailOrder) {
  const lines = (order.line_items ?? []).map(item => ({
    name: item.name || 'Item',
    quantity: Math.max(1, Number(item.quantity) || 1),
    gross: cents(item.subtotal) + cents(item.subtotal_tax),
    options: (item.meta_data ?? [])
      .filter(meta => !String(meta.key).startsWith('_') && (typeof (meta.display_value ?? meta.value) === 'string' || typeof (meta.display_value ?? meta.value) === 'number'))
      .map(meta => `${stripTags(String(meta.display_key ?? meta.key))}: ${stripTags(String(meta.display_value ?? meta.value))}`),
  }))
  const itemsCents = lines.reduce((sum, line) => sum + line.gross, 0)
  return {
    lines,
    itemsCents,
    discountCents: cents(order.discount_total) + cents(order.discount_tax),
    shippingCents: cents(order.shipping_total) + cents(order.shipping_tax),
    vatCents: cents(order.total_tax),
    totalCents: cents(order.total),
  }
}
/** WooCommerce display values can contain markup; emails show plain text. */
export const stripTags = (value: string) => value.replace(/<[^>]*>/g, '').trim()
