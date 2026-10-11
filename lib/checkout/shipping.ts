import type { ResolvedCart } from '@/lib/cart/resolve'
import { getShippingMethods } from '@/lib/woocommerce'
import { ShippingRateError } from '@/lib/woocommerce/queries/get-shipping-rates'
import type { ShippingAddressInput } from '@/lib/address/schema'
import { checkoutCartSignature, checkoutCartIssues, type ShippingQuote } from './model'

export async function quoteResolvedCart(cart: ResolvedCart, address: ShippingAddressInput): Promise<ShippingQuote> {
  const issues = checkoutCartIssues(cart)
  if (!cart.lines.length || cart.unavailableCount || issues.length) {
    return { status: 'cart', error: 'Your saved cart needs attention before delivery can be calculated.', issues }
  }
  try {
    const methods = await getShippingMethods(cart.lines.map(line => ({
      productId: line.resolvedVariationId ?? line.productId,
      quantity: line.quantity, attributes: line.attributes,
    })), address)
    return { status: 'ready', methods, cartSignature: checkoutCartSignature(cart.lines) }
  } catch (error) {
    // Keep diagnostics useful without logging addresses, session tokens, or
    // raw plugin responses. Upstream rejects a cart line separately from an
    // unavailable delivery service or an invalid destination.
    if (error instanceof ShippingRateError) {
      console.error('[shipping]', { status: error.status, code: error.code, productId: error.productId })
      if ((error.status === 400 || error.status === 409) && error.productId) {
        const line = cart.lines.find(line => Number(line.productId) === error.productId || Number(line.resolvedVariationId) === error.productId)
        return { status: 'cart', error: 'An item in your saved cart could not be verified. Please review its options and quantity.', issues: line ? [{ name: line.name, slug: line.slug, message: 'Please review this item’s options and quantity in your cart.' }] : [] }
      }
      if (error.status === 400 && !error.productId) {
        return { status: 'address', error: 'Please check your delivery country and postcode, then try again.' }
      }
    } else {
      console.error('[shipping]', { error: error instanceof Error ? error.name : 'UnknownError' })
    }
    return { status: 'error', error: 'Could not calculate delivery. Please try again.' }
  }
}

