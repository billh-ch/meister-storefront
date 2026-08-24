'use server'

import { getSession } from '@/lib/auth/session'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { getStripe } from '@/lib/stripe'
import { getBaseUrl } from '@/lib/url'
import { FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD } from '@/lib/mock-data'
import { addressSchema, type AddressInput } from '@/lib/address/schema'
import { toWcAddress } from '@/lib/address/map-address'
import { updateWcCustomerAddress } from '@/lib/woocommerce/queries/update-customer-address'

export type CreateCheckoutSessionResult = { url: string } | { error: string }

/**
 * Re-checks everything server-side rather than trusting the client — the
 * page render already gates on sign-in/cart-availability, but a Server
 * Action can be invoked independent of the page (see `proxy.ts`'s own note
 * on this), and the client can't be trusted for the cart contents or total.
 *
 * Uses Stripe's hosted Checkout page (the default `ui_mode`, "Checkout
 * Sessions" with no custom payment UI on our side) — the customer is
 * redirected to `checkoutSession.url` to pay on Stripe's own page, then
 * back to `success_url`. Line items are priced from `resolveCartItems`'
 * live WooCommerce data, never from anything the client posts; WooCommerce
 * re-prices the order itself again at webhook time from the same product
 * ids, so a tampered metadata value can reference a bad id but never
 * dictate what gets charged in either system.
 */
export async function createCheckoutSessionAction(
  input: AddressInput,
): Promise<CreateCheckoutSessionResult> {
  const session = await getSession()
  const wcCustomerId = session.wcCustomerId
  if (!wcCustomerId) {
    return { error: 'Please sign in to continue.' }
  }

  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Please fill in every required field.' }
  }

  const cart = await getCart()
  const resolved = await resolveCartItems(cart)

  if (resolved.lines.length === 0) {
    return { error: 'Your cart is empty.' }
  }
  if (resolved.unavailableCount > 0 || resolved.lines.some((line) => !line.purchasable)) {
    return { error: 'Your cart has changed — please review it before checking out.' }
  }

  // Best-effort — remembers the address for next time, but must never block
  // or fail checkout if the write itself fails.
  updateWcCustomerAddress(wcCustomerId, toWcAddress(parsed.data)).catch((error) => {
    console.error('[account] Failed to save address at checkout:', error)
  })

  const shipping = resolved.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE

  // Metadata carries only *identity* — product/variation ids, quantities,
  // and the shipping address — never a price. WooCommerce prices every
  // line item itself from live product data at order-creation time, so a
  // stale/tampered metadata value can reference a bad id but can never
  // dictate what gets charged.
  const cartLines = resolved.lines.map((line) => ({
    p: line.productId,
    v: line.variationId,
    q: line.quantity,
  }))

  const lineItems = resolved.lines.map((line) => ({
    price_data: {
      currency: 'eur',
      product_data: { name: line.name },
      unit_amount: Math.round(line.unitPrice * 100),
    },
    quantity: line.quantity,
  }))

  if (shipping > 0) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Shipping' },
        unit_amount: Math.round(shipping * 100),
      },
      quantity: 1,
    })
  }

  try {
    const stripe = getStripe()
    const baseUrl = getBaseUrl()

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${baseUrl}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      metadata: {
        wcCustomerId: String(wcCustomerId),
        cartLines: JSON.stringify(cartLines),
        ship_first_name: parsed.data.firstName,
        ship_last_name: parsed.data.lastName,
        ship_address1: parsed.data.address1,
        ship_address2: parsed.data.address2 ?? '',
        ship_city: parsed.data.city,
        ship_postcode: parsed.data.postcode,
        ship_country: parsed.data.country,
        ship_phone: parsed.data.phone,
      },
    })

    if (!checkoutSession.url) {
      return { error: 'Could not start checkout. Please try again.' }
    }

    return { url: checkoutSession.url }
  } catch {
    return { error: 'Could not reach the payment processor. Please try again.' }
  }
}
