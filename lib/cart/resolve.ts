import { getProductById } from '@/lib/woocommerce'
import type { StockStatus } from '@/lib/mock-data'
import type { CartItem } from './schema'

export interface ResolvedCartLine {
  productId: string
  variationId?: string
  quantity: number
  name: string
  slug: string
  image: string
  unitPrice: number
  attributes: Record<string, string>
  stockStatus: StockStatus
  purchasable: boolean
}

export interface ResolvedCart {
  lines: ResolvedCartLine[]
  /** Cart lines whose product/variation no longer exists at all — shown as
   *  a banner rather than silently vanishing from the shopper's view. */
  unavailableCount: number
  /** Purchasable lines only. */
  subtotal: number
}

function lineKey(item: Pick<CartItem, 'productId' | 'variationId'>): string {
  return `${item.productId}:${item.variationId ?? ''}`
}

/**
 * Re-resolves every cart line against live WooCommerce data. Price, stock,
 * name, and image always come from here — never from the cookie, which only
 * ever stores an id and a quantity. A line whose product/variation no
 * longer resolves is dropped and counted in `unavailableCount`; a line
 * that's merely out of stock is kept and flagged `purchasable: false` so the
 * shopper sees it rather than having it disappear.
 */
export async function resolveCartItems(cart: CartItem[]): Promise<ResolvedCart> {
  const deduped = new Map<string, CartItem>()
  for (const item of cart) {
    const key = lineKey(item)
    const existing = deduped.get(key)
    deduped.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item)
  }

  const productIds = Array.from(new Set(Array.from(deduped.values(), (item) => item.productId)))
  const products = await Promise.all(productIds.map((id) => getProductById(id)))
  const productById = new Map(productIds.map((id, i) => [id, products[i]]))

  const lines: ResolvedCartLine[] = []
  let unavailableCount = 0

  for (const item of deduped.values()) {
    const product = productById.get(item.productId)
    if (!product) {
      unavailableCount++
      continue
    }

    if (item.variationId) {
      const variant = product.variants.find((candidate) => candidate.id === item.variationId)
      if (!variant) {
        unavailableCount++
        continue
      }
      lines.push({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        name: product.name,
        slug: product.slug,
        image: variant.image ?? product.image,
        unitPrice: variant.price,
        attributes: variant.attributes,
        stockStatus: variant.stockStatus,
        purchasable: variant.stockStatus !== 'outofstock',
      })
    } else {
      lines.push({
        productId: item.productId,
        quantity: item.quantity,
        name: product.name,
        slug: product.slug,
        image: product.image,
        unitPrice: product.price,
        attributes: {},
        stockStatus: product.stockStatus,
        purchasable: product.stockStatus !== 'outofstock',
      })
    }
  }

  const subtotal = lines
    .filter((line) => line.purchasable)
    .reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

  return { lines, unavailableCount, subtotal }
}
