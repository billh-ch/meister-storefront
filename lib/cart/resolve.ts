import { getProductById } from '@/lib/woocommerce'
import type { StockStatus } from '@/lib/mock-data'
import type { CartItem } from './schema'
import { cartLineKey } from './line-key'
import { resolveCartSelection } from './selection'
import { resolveAddonSelection, toCents, type ChosenAddon } from '@/lib/addons/contract'

/** Shown on a line whose saved add-ons no longer match the product. */
export const ADDON_UNAVAILABLE_ISSUE = 'An add-on you chose is no longer available. Please remove this item and add it again.'
export const ADDON_INVALID_ISSUE = 'The add-ons on this item are not valid. Please remove this item and add it again.'

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
  /** Live variation (or product) price plus every chosen add-on, in euros. */
  unitPrice: number
  /** The variation (or product) price alone, before add-ons. */
  baseUnitPrice: number
  /** The add-on references stored on the cookie line, carried back so the
   *  cart controls (and `cartLineKey`) can address this exact line. */
  addons?: string[]
  /** Those add-ons resolved against the live product, localized, with their
   *  current prices; empty when none (or when they no longer resolve). */
  chosenAddons: ChosenAddon[]
  /** Every variation axis the shopper chose, in the product's own order —
   *  the variation's pinned values plus the "Any …" axes recovered from
   *  `selectedOptions`. Shown on the cart and checkout summary. */
  attributes: Record<string, string>
  /** Just the axes WooCommerce pins on the variation itself. The order it
   *  creates already records these, so only `attributes` minus these need to
   *  travel as order line meta. */
  variantAttributes: Record<string, string>
  stockStatus: StockStatus
  /** Currently discounted by WooCommerce — lets coupons honour "exclude sale items". */
  onSale: boolean
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
export async function resolveCartItems(cart: CartItem[], locale: string = 'en'): Promise<ResolvedCart> {
  const deduped = new Map<string, CartItem>()
  for (const item of cart) {
    const key = cartLineKey(item)
    const existing = deduped.get(key)
    deduped.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item)
  }

  const productIds = Array.from(new Set(Array.from(deduped.values(), (item) => item.productId)))
  const products = await Promise.all(productIds.map((id) => getProductById(id, locale)))
  const productById = new Map(productIds.map((id, i) => [id, products[i]]))

  const lines: ResolvedCartLine[] = []
  let unavailableCount = 0

  for (const item of deduped.values()) {
    const product = productById.get(item.productId)
    if (!product) {
      unavailableCount++
      continue
    }

    const { variant, attributes, issue: selectionIssue } = resolveCartSelection(product, item.variationId, item.selectedOptions)
    const stockStatus = variant?.stockStatus ?? product.stockStatus
    // Prices come only from the live product: the cookie holds add-on ids.
    // Anything that no longer matches makes the line unpurchasable rather
    // than charging for, or quietly dropping, something the shopper chose.
    const addonResult = resolveAddonSelection(product.addons ?? [], item.addons)
    const addonIssue = addonResult.ok ? undefined : addonResult.reason === 'invalid' ? ADDON_INVALID_ISSUE : ADDON_UNAVAILABLE_ISSUE
    const issue = selectionIssue ?? addonIssue
    const baseUnitPrice = variant?.price ?? product.price
    const chosenAddons = addonResult.ok ? addonResult.chosen : []
    const unitPrice = (toCents(baseUnitPrice) + (addonResult.ok ? addonResult.totalCents : 0)) / 100
    lines.push({
      productId: item.productId,
      variationId: item.variationId,
      resolvedVariationId: variant?.id,
      selectedOptions: item.selectedOptions,
      quantity: item.quantity,
      name: product.name,
      slug: product.slug,
      image: variant?.image ?? product.image,
      unitPrice,
      baseUnitPrice,
      ...(item.addons?.length ? { addons: item.addons } : {}),
      chosenAddons,
      attributes,
      variantAttributes: Object.fromEntries(Object.entries(variant?.attributes ?? {}).filter(([, value]) => value)),
      stockStatus,
      onSale: variant?.onSale ?? product.onSale,
      checkoutIssue: issue,
      purchasable: !issue && stockStatus !== 'outofstock',
    })
  }

  // Summed in whole cents, the same way Stripe is charged.
  const subtotal = lines
    .filter((line) => line.purchasable)
    .reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0) / 100

  return { lines, unavailableCount, subtotal }
}
