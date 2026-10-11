import { getProductById } from '@/lib/woocommerce'
import type { StockStatus } from '@/lib/mock-data'
import type { CartItem } from './schema'
import { cartLineKey } from './line-key'
import { resolveCartSelection } from './selection'

export interface ResolvedCartLine {
  productId: string
  variationId?: string
  /** Current catalog variation; stored variationId remains the mutation key. */
  resolvedVariationId?: string
  checkoutIssue?: string
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
  /** Cart lines whose product no longer exists — shown as
   *  a banner rather than silently vanishing from the shopper's view. */
  unavailableCount: number
  /** Purchasable lines only. */
  subtotal: number
}

/**
 * Re-resolves every cart line against live WooCommerce data. Price, stock,
 * name, and image always come from here — never from the cookie, which only
 * ever stores identity, selections, and quantity. A missing product is
 * counted in `unavailableCount`; outdated options and out-of-stock items
 * stay visible and removable, with `purchasable: false`.
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

    const { variant, attributes, issue } = resolveCartSelection(product, item.variationId, item.selectedOptions)
    const stockStatus = variant?.stockStatus ?? product.stockStatus
    lines.push({
      productId: item.productId,
      variationId: item.variationId,
      resolvedVariationId: variant?.id,
      selectedOptions: item.selectedOptions,
      quantity: item.quantity,
      name: product.name,
      slug: product.slug,
      image: variant?.image ?? product.image,
      unitPrice: variant?.price ?? product.price,
      attributes,
      variantAttributes: Object.fromEntries(Object.entries(variant?.attributes ?? {}).filter(([, value]) => value)),
      stockStatus,
      checkoutIssue: issue,
      purchasable: !issue && stockStatus !== 'outofstock',
    })
  }

  const subtotal = lines
    .filter((line) => line.purchasable)
    .reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

  return { lines, unavailableCount, subtotal }
}
