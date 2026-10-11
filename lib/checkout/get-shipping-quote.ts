import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import type { ShippingAddressInput } from '@/lib/address/schema'
import type { ShippingQuote } from './model'
import { quoteResolvedCart } from './shipping'

export async function getShippingQuote(address: ShippingAddressInput): Promise<ShippingQuote> {
  try { return await quoteResolvedCart(await resolveCartItems(await getCart()), address) }
  catch { return { status: 'error', error: 'Could not verify your cart. Please try again.' } }
}
