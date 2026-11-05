import 'server-only'
import { translate, type Locale } from '@/lib/i18n'
import { getSession } from '@/lib/auth/session'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { getWcCustomerById } from '@/lib/woocommerce'
import { quotePromotion } from './client'
import type { AddressInput } from '@/lib/address/schema'

export function promotionAddress(address: Partial<AddressInput>) {
  return { country: address.country ?? 'GR', state: '', city: address.city ?? '', postcode: address.postcode ?? '', address_1: address.address1 ?? '', address_2: address.address2 ?? '' }
}
export async function getPromotionQuoteInput(input: { owner: string; code: string; email?: string; address: Partial<AddressInput>; shippingId?: string; locale: Locale }) {
  const [cart, auth] = await Promise.all([getCart(), getSession()])
  const resolved = await resolveCartItems(cart, input.locale)
  if (!resolved.lines.length || resolved.unavailableCount || resolved.lines.some(line => !line.purchasable)) throw new Error('Review your cart before checkout')
  const customer = auth.wcCustomerId ? await getWcCustomerById(auth.wcCustomerId) : undefined
  const email = customer ? customer.billing?.email || customer.email : input.email ?? ''
  return {
    owner: input.owner, customerId: auth.wcCustomerId ?? 0, email,
    items: resolved.lines.map(line => ({ productId: Number(line.productId), ...(line.resolvedVariationId || line.variationId ? { variationId: Number(line.resolvedVariationId ?? line.variationId) } : {}), quantity: line.quantity, attributes: line.attributes })),
    labels: resolved.lines.map(line => ({ name: line.name, attributes: Object.fromEntries(Object.entries(line.attributes).map(([key, value]) => [translate(input.locale, key), translate(input.locale, value)])) })),
    address: promotionAddress(input.address), coupon: input.code, shippingId: input.shippingId ?? '',
  }
}
export async function getPromotionQuote(input: Parameters<typeof getPromotionQuoteInput>[0]) { return quotePromotion(await getPromotionQuoteInput(input)) }
