import type { EmailOrder } from './order'

export interface TrackingEntry { carrier: string; number: string; url?: string }

/** Only absolute https links are ever put in an email. */
function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try { const url = new URL(value.trim()); return url.protocol === 'https:' ? url.toString() : undefined } catch { return undefined }
}
const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '')

/**
 * Tracking comes from the order's custom fields, so the shop team can enter it
 * in WooCommerce without any plugin:
 *   meister_tracking_carrier, meister_tracking_number, meister_tracking_url (https, optional)
 * Orders filled by the free "Advanced Shipment Tracking" plugin
 * (`_wc_shipment_tracking_items`) are read too.
 */
export function extractTracking(order: EmailOrder): TrackingEntry[] {
  const meta = new Map((order.meta_data ?? []).map(item => [item.key, item.value]))
  const entries: TrackingEntry[] = []
  const number = text(meta.get('meister_tracking_number'))
  if (number) entries.push({ carrier: text(meta.get('meister_tracking_carrier')), number, url: safeUrl(meta.get('meister_tracking_url')) })
  const items = meta.get('_wc_shipment_tracking_items')
  if (Array.isArray(items)) {
    for (const item of items as Record<string, unknown>[]) {
      const n = text(item?.tracking_number)
      if (!n) continue
      entries.push({
        carrier: text(item.custom_tracking_provider) || text(item.tracking_provider).replace(/[-_]+/g, ' '),
        number: n,
        url: safeUrl(item.formatted_tracking_link) ?? safeUrl(item.custom_tracking_link),
      })
    }
  }
  return entries.slice(0, 5)
}
