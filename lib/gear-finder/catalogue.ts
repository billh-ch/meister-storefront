import { PRODUCTS, FIN_PRODUCTS } from './reference'
import { CATALOGUE_IDS } from './identity'
import type { Catalogue, Commerce } from './types'

interface CatalogueProduct {
  id: string; slug: string; name: string; price: number; category: string;
  image: string; stockStatus: string; priceFrom: boolean
}
function decodedSlug(value: string): string {
  try { return decodeURIComponent(value).normalize('NFC') } catch { return '' }
}
/** Stable numeric identity survives translated/renamed slugs; ambiguous IDs or URLs fail closed. */
export function connectCatalogue(products: CatalogueProduct[]): Catalogue {
  const bySlug = new Map<string, CatalogueProduct[]>()
  for (const product of products) {
    const slug = decodedSlug(product.slug)
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), product])
  }
  function current(id: string, category: string) {
    const matches = products.filter(product => product.id === id)
    if (matches.length !== 1) return null
    const p = matches[0]
    const slug = decodedSlug(p.slug)
    if (!slug || (bySlug.get(slug)?.length ?? 0) !== 1 || !/^\d+$/.test(p.id) || p.category !== category || !Number.isFinite(p.price) || p.price <= 0) return null
    const stock = p.stockStatus === 'instock' ? 'listed' : p.stockStatus === 'onbackorder' ? 'backorder' : 'out'
    const commerce: Commerce = { href: `/products/${p.slug}`, name: p.name, image: p.image, priceFrom: p.priceFrom }
    return { price: [p.price, p.price], stock, commerce }
  }
  return {
    suits: PRODUCTS.flatMap(model => { const live = current(CATALOGUE_IDS.wetsuits[model.id], 'suits'); return live ? [{ ...model, ...live }] : [] }),
    fins: FIN_PRODUCTS.flatMap(model => { const live = current(CATALOGUE_IDS.fins[model.id], 'fins'); return live ? [{ ...model, ...live }] : [] }),
  }
}
