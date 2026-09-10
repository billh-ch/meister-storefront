import { getProductById } from '@/lib/woocommerce'
import type { ProductDetail, ProductVariant, StockStatus } from '@/lib/mock-data'
import type { CartItem } from './schema'
import { cartLineKey } from './line-key'

export interface ResolvedCartLine {
  productId: string
  variationId?: string
  /** The shopper's raw axis picks, carried through so the cart controls can
   *  address this exact line for quantity / remove. */
  selectedOptions?: Record<string, string>
  quantity: number
  name: string
  slug: string
  image: string
  unitPrice: number
  /** Every variation axis the shopper chose, in the product's own order —
   *  the variation's pinned values plus the "Any …" axes recovered from
   *  `selectedOptions`. Shown on the cart and checkout summary. */
  attributes: Record<string, string>
  /** Just the axes WooCommerce pins on the variation itself. The order it
   *  creates already records these, so only `attributes` minus these need to
   *  travel as order line meta. */
  variantAttributes: Record<string, string>
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

/**
 * The variation axes the shopper chose, ordered the way the product lists
 * them. Each axis takes the variation's own pinned value when it has one,
 * otherwise the shopper's pick from `selectedOptions` (WooCommerce omits
 * "Any …" axes from the variation). Falls back to the raw union when the
 * product has no attribute list at all (mock / incomplete data).
 */
function lineAttributes(
  product: ProductDetail,
  variant: ProductVariant,
  selectedOptions: Record<string, string> | undefined,
): Record<string, string> {
  const axisNames = product.attributes
    .filter((attribute) => attribute.isVariationAxis)
    .map((attribute) => attribute.name)

  if (axisNames.length === 0) {
    return { ...selectedOptions, ...variant.attributes }
  }

  const attributes: Record<string, string> = {}
  for (const name of axisNames) {
    const value = variant.attributes[name] ?? selectedOptions?.[name]
    if (value) attributes[name] = value
  }
  return attributes
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
    const key = cartLineKey(item)
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
        selectedOptions: item.selectedOptions,
        quantity: item.quantity,
        name: product.name,
        slug: product.slug,
        image: variant.image ?? product.image,
        unitPrice: variant.price,
        attributes: lineAttributes(product, variant, item.selectedOptions),
        variantAttributes: variant.attributes,
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
        variantAttributes: {},
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
