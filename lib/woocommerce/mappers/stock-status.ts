import type { StockStatus } from '@/lib/mock-data'

const STOCK_STATUSES: readonly string[] = ['instock', 'outofstock', 'onbackorder']

/**
 * Unrecognised values become `instock` deliberately: WooCommerce plugins can
 * introduce their own statuses, and hiding a sellable product because of an
 * unfamiliar string is worse than showing it.
 */
export function toStockStatus(raw: string): StockStatus {
  return STOCK_STATUSES.includes(raw) ? (raw as StockStatus) : 'instock'
}
