import { cookies } from 'next/headers'
import { cartSchema, type CartItem } from './schema'

export const CART_COOKIE = 'mm_cart'

/** 30 days — long enough that a returning shopper's cart survives, short
 *  enough that an abandoned cart doesn't linger against stale product ids. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Reads the cart cookie. A missing, corrupted, or hand-tampered cookie
 * decodes to `[]` rather than throwing — id *validity* is re-checked live
 * against WooCommerce everywhere the cart is used, never trusted from here.
 */
export async function getCart(): Promise<CartItem[]> {
  const store = await cookies()
  const raw = store.get(CART_COOKIE)?.value
  if (!raw) return []

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf-8')
    const parsed = cartSchema.safeParse(JSON.parse(decoded))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

/** Only callable from a Server Action or Route Handler — Server Components
 *  can read cookies but never write them. */
export async function setCart(cart: CartItem[]): Promise<void> {
  const store = await cookies()
  const encoded = Buffer.from(JSON.stringify(cart), 'utf-8').toString('base64url')

  store.set(CART_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}
