'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getProductById } from '@/lib/woocommerce'
import type { ProductDetail } from '@/lib/mock-data'
import { getCart, setCart } from './cookie'
import { cartItemSchema, type CartItem } from './schema'
import { cartLineKey } from './line-key'

// Same id constraints as `cartItemSchema`, but `quantity` allows `<= 0` — that's
// how a line gets removed (see `removeFromCartAction`) — which `cartItemSchema`
// itself deliberately forbids (a *stored* line is never zero/negative).
const updateQuantityInputSchema = z.object({
  productId: cartItemSchema.shape.productId,
  variationId: cartItemSchema.shape.variationId,
  selectedOptions: cartItemSchema.shape.selectedOptions,
  quantity: z.number().int().max(99),
})

export type CartActionResult = { ok: true } | { ok: false; error: string }

type PurchasableResult =
  | { ok: true; product: ProductDetail }
  | { ok: false; error: string }

/**
 * Confirms a product/variation genuinely exists and is purchasable *before*
 * it's written into the cart cookie — bad ids never even get stored, not
 * just never mispriced. Returns the resolved product so the caller can reuse
 * it (Next dedupes the fetch anyway) to sanitise the chosen options.
 */
async function assertPurchasable(
  productId: string,
  variationId?: string,
): Promise<PurchasableResult> {
  const product = await getProductById(productId)
  if (!product) return { ok: false, error: 'This product is no longer available.' }

  if (variationId) {
    const variant = product.variants.find((candidate) => candidate.id === variationId)
    if (!variant) return { ok: false, error: 'That option is no longer available.' }
    if (variant.stockStatus === 'outofstock') {
      return { ok: false, error: 'That option is out of stock.' }
    }
    return { ok: true, product }
  }

  if (product.stockStatus === 'outofstock') {
    return { ok: false, error: 'This product is out of stock.' }
  }
  return { ok: true, product }
}

/**
 * Keeps only `[name, value]` pairs that name a real variation axis of this
 * product and a value that axis actually offers — a hand-edited cookie or a
 * stale option can't smuggle junk onto the checkout summary or the order.
 */
function sanitizeSelectedOptions(
  product: ProductDetail,
  selectedOptions: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!selectedOptions) return undefined

  const axes = new Map(
    product.attributes
      .filter((attribute) => attribute.isVariationAxis)
      .map((attribute) => [attribute.name, attribute.values]),
  )

  const clean: Record<string, string> = {}
  for (const [name, value] of Object.entries(selectedOptions)) {
    const allowed = axes.get(name)
    if (allowed && allowed.includes(value)) clean[name] = value
  }

  return Object.keys(clean).length > 0 ? clean : undefined
}

export async function addToCartAction(input: {
  productId: string
  variationId?: string
  quantity: number
  selectedOptions?: Record<string, string>
}): Promise<CartActionResult> {
  const parsed = cartItemSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }

  const validation = await assertPurchasable(parsed.data.productId, parsed.data.variationId)
  if (!validation.ok) return validation

  const newItem: CartItem = {
    ...parsed.data,
    selectedOptions: sanitizeSelectedOptions(validation.product, parsed.data.selectedOptions),
  }

  const cart = await getCart()
  const key = cartLineKey(newItem)
  const existingIndex = cart.findIndex((item) => cartLineKey(item) === key)

  const nextCart =
    existingIndex >= 0
      ? cart.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: Math.min(99, item.quantity + newItem.quantity) }
            : item,
        )
      : [...cart, newItem]

  await setCart(nextCart)
  revalidatePath('/cart')
  return { ok: true }
}

export async function updateQuantityAction(input: {
  productId: string
  variationId?: string
  selectedOptions?: Record<string, string>
  quantity: number
}): Promise<CartActionResult> {
  const parsed = updateQuantityInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }

  const cart = await getCart()
  const key = cartLineKey(parsed.data)

  const nextCart =
    parsed.data.quantity <= 0
      ? cart.filter((item) => cartLineKey(item) !== key)
      : cart.map((item) =>
          cartLineKey(item) === key
            ? { ...item, quantity: Math.min(99, parsed.data.quantity) }
            : item,
        )

  await setCart(nextCart)
  revalidatePath('/cart')
  return { ok: true }
}

export async function removeFromCartAction(input: {
  productId: string
  variationId?: string
  selectedOptions?: Record<string, string>
}): Promise<CartActionResult> {
  return updateQuantityAction({ ...input, quantity: 0 })
}

export async function clearCartAction(): Promise<CartActionResult> {
  await setCart([])
  revalidatePath('/cart')
  return { ok: true }
}
