import type { ProductDetail, ProductVariant, StockStatus } from '@/lib/mock-data'
import { plainTextDescription } from './metadata'

const AVAILABILITY: Record<StockStatus, string> = {
  instock: 'https://schema.org/InStock',
  outofstock: 'https://schema.org/OutOfStock',
  onbackorder: 'https://schema.org/BackOrder',
}
// The mapper uses zero for missing prices; do not turn that into a free offer.
const validPrice = (price: number) => Number.isFinite(price) && price > 0

/** Mirror the buy box's complete-selection matching: empty/missing axes are
 * wildcards, specific records win, and conflicting tied prices are unresolved.
 * Bound enumeration so malformed/huge option sets cannot exhaust rendering. */
function reachableVariants(product: ProductDetail): ProductVariant[] {
  const axes = product.attributes.filter(attribute => attribute.isVariationAxis)
  const combinations = axes.reduce((count, axis) => count * axis.values.length, 1)
  if (!axes.length || !combinations || combinations > 1000) return []
  const reachable = new Set<ProductVariant>()
  const visit = (index: number, selected: Record<string, string>) => {
    if (index < axes.length) {
      for (const value of axes[index].values) visit(index + 1, { ...selected, [axes[index].name]: value })
      return
    }
    const candidates = product.variants.filter(variant => Object.keys(variant.attributes).length &&
      axes.every(axis => !variant.attributes[axis.name] || variant.attributes[axis.name] === selected[axis.name]))
    const specificity = (variant: ProductVariant) => axes.filter(axis => Boolean(variant.attributes[axis.name])).length
    const best = Math.max(...candidates.map(specificity))
    const tied = candidates.filter(variant => specificity(variant) === best)
    if (tied.length && tied.every(variant => variant.price === tied[0].price) && validPrice(tied[0].price)) reachable.add(tied[0])
  }
  visit(0, {})
  return [...reachable]
}

export function buildProductStructuredData(product: ProductDetail, canonicalUrl: string): Record<string, unknown> {
  const offer = (price: number, stock: StockStatus) => ({
    '@type': 'Offer', price, priceCurrency: 'EUR', url: canonicalUrl,
    availability: AVAILABILITY[stock],
  })
  const axes = product.attributes.filter(attribute => attribute.isVariationAxis).map(attribute => attribute.name)
  const variants = product.type === 'variable' ? reachableVariants(product) : []
  let offers: Record<string, unknown> | undefined
  if (variants.length) {
    offers = {
      '@type': 'AggregateOffer', priceCurrency: 'EUR', url: canonicalUrl,
      lowPrice: Math.min(...variants.map(variant => variant.price)),
      highPrice: Math.max(...variants.map(variant => variant.price)),
      offerCount: variants.length,
      offers: variants.map(variant => {
        const name = axes.filter(axis => variant.attributes[axis]).map(axis => `${axis}: ${variant.attributes[axis]}`).join(', ')
        return { ...offer(variant.price, variant.stockStatus), ...(name && { name }) }
      }),
    }
  } else if (validPrice(product.price) && !product.priceFrom) {
    offers = offer(product.price, product.stockStatus)
  }
  const images = [...new Set(product.gallery.map(image => image.src).filter(Boolean))]
  if (!images.length && product.image) images.push(product.image)
  const description = plainTextDescription(product.descriptionHtml || product.shortDescriptionHtml, 500)
  return {
    '@context': 'https://schema.org', '@type': 'Product', url: canonicalUrl, name: product.name,
    ...(description && { description }), ...(images.length && { image: images }),
    ...(product.sku.trim() && { sku: product.sku }),
    ...(product.brand?.trim() && { brand: { '@type': 'Brand', name: product.brand } }),
    ...(offers && { offers }),
  }
}

export function buildBreadcrumbStructuredData(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: item.url,
    })),
  }
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
