import { PRODUCTS, FIN_PRODUCTS } from './reference'
import type { Catalogue, Commerce } from './types'

interface CatalogueProduct {
  id: string; slug: string; name: string; price: number; category: string;
  image: string; stockStatus: string; priceFrom: boolean
}
function decodedSlug(value: string): string {
  try { return decodeURIComponent(value).normalize('NFC') } catch { return '' }
}
function sourceSlug(url: string): string {
  return decodedSlug(new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? '')
}
/** Curated model identity is exact, never a fuzzy name match across translated titles. */
export function connectCatalogue(products: CatalogueProduct[]): Catalogue {
  const bySlug = new Map<string, CatalogueProduct[]>()
  for (const product of products) {
    const slug = decodedSlug(product.slug)
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), product])
  }
  function current(url: string, category: string) {
    const matches = bySlug.get(sourceSlug(url)) ?? []
    if (matches.length !== 1) return null
    const p = matches[0]
    if (!/^\d+$/.test(p.id) || p.category !== category || !Number.isFinite(p.price) || p.price <= 0) return null
    const stock = p.stockStatus === 'instock' ? 'listed' : p.stockStatus === 'onbackorder' ? 'backorder' : 'out'
    const commerce: Commerce = { href: `/products/${p.slug}`, name: p.name, image: p.image, priceFrom: p.priceFrom }
    return { price: [p.price, p.price], stock, commerce }
  }
  return {
    suits: PRODUCTS.flatMap(model => { const live = current(model.url, 'suits'); return live ? [{ ...model, ...live }] : [] }),
    fins: FIN_PRODUCTS.flatMap(model => { const live = current(model.url, 'fins'); return live ? [{ ...model, ...live }] : [] }),
  }
}
