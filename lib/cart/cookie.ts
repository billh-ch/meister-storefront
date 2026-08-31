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
 *  can read cookies but never write them.
 *
 *  Validates before writing (not just on read): every caller is expected to
 *  hand this already-valid items, but `getCart`'s `cartSchema.safeParse`
 *  fails the *entire* array on a single malformed item, so a caller that
 *  regresses this — and skips its own validation — would otherwise silently
 *  wipe the shopper's whole cart on the very next read. Throwing here turns
 *  that into a loud, immediate error instead. */
export async function setCart(cart: CartItem[]): Promise<void> {
  const parsed = cartSchema.safeParse(cart)
  if (!parsed.success) {
    throw new Error('Attempted to write an invalid cart.')
  }

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
