import 'server-only'
import { fetchProducts } from '@/lib/woocommerce/queries/get-products'
import { mapProduct } from '@/lib/woocommerce/mappers/map-product'
import { connectCatalogue } from './catalogue'
import type { Locale } from '@/lib/i18n'
import type { Catalogue } from './types'

/** Strict read: do not turn snapshot/demo products into orderable recommendations during an outage. */
export async function loadGearCatalogue(locale: Locale): Promise<Catalogue | null> {
  try {
    const raw = await fetchProducts({ requireComplete: true, fresh: true })
    return connectCatalogue(raw.filter(p => p.status === 'publish').map(p => ({ ...mapProduct(p, locale), stockStatus: p.stock_status })))
  } catch {
    console.error('[Gear Finder] Published catalogue is temporarily unavailable')
    return null
  }
}
