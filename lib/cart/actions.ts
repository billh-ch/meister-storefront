'use server'

import { revalidatePath } from 'next/cache'
import { getProductById } from '@/lib/woocommerce'
import { getCart, setCart } from './cookie'
import { cartItemSchema, type CartItem } from './schema'

export type CartActionResult = { ok: true } | { ok: false; error: string }

function lineKey(item: Pick<CartItem, 'productId' | 'variationId'>): string {
  return `${item.productId}:${item.variationId ?? ''}`
}

/**
 * Confirms a product/variation genuinely exists and is purchasable *before*
 * it's written into the cart cookie — bad ids never even get stored, not
 * just never mispriced.
 */
async function assertPurchasable(
  productId: string,
  variationId?: string,
): Promise<CartActionResult> {
  const product = await getProductById(productId)
  if (!product) return { ok: false, error: 'This product is no longer available.' }

  if (variationId) {
    const variant = product.variants.find((candidate) => candidate.id === variationId)
    if (!variant) return { ok: false, error: 'That option is no longer available.' }
    if (variant.stockStatus === 'outofstock') {
      return { ok: false, error: 'That option is out of stock.' }
    }
    return { ok: true }
  }

  if (product.stockStatus === 'outofstock') {
    return { ok: false, error: 'This product is out of stock.' }
  }
  return { ok: true }
}

export async function addToCartAction(input: {
  productId: string
  variationId?: string
  quantity: number
}): Promise<CartActionResult> {
  const parsed = cartItemSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }

  const validation = await assertPurchasable(parsed.data.productId, parsed.data.variationId)
  if (!validation.ok) return validation

  const cart = await getCart()
  const key = lineKey(parsed.data)
  const existingIndex = cart.findIndex((item) => lineKey(item) === key)

  const nextCart =
    existingIndex >= 0
      ? cart.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: Math.min(99, item.quantity + parsed.data.quantity) }
            : item,
        )
      : [...cart, parsed.data]

  await setCart(nextCart)
  revalidatePath('/cart')
  return { ok: true }
}

export async function updateQuantityAction(input: {
  productId: string
  variationId?: string
  quantity: number
}): Promise<CartActionResult> {
  const cart = await getCart()
  const key = lineKey(input)

  const nextCart =
    input.quantity <= 0
      ? cart.filter((item) => lineKey(item) !== key)
      : cart.map((item) =>
          lineKey(item) === key ? { ...item, quantity: Math.min(99, input.quantity) } : item,
        )

  await setCart(nextCart)
  revalidatePath('/cart')
  return { ok: true }
}

export async function removeFromCartAction(input: {
  productId: string
  variationId?: string
}): Promise<CartActionResult> {
  return updateQuantityAction({ ...input, quantity: 0 })
}

export async function clearCartAction(): Promise<CartActionResult> {
  await setCart([])
  revalidatePath('/cart')
  return { ok: true }
}
