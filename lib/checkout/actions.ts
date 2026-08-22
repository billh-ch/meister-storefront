'use server'

import { getSession } from '@/lib/auth/session'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { getStripe } from '@/lib/stripe'
import { FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD } from '@/lib/mock-data'
import { checkoutAddressSchema, type CheckoutAddressInput } from './schema'

export type CreatePaymentIntentResult = { clientSecret: string } | { error: string }

/**
 * Re-checks everything server-side rather than trusting the client — the
 * page render already gates on sign-in/cart-availability, but a Server
 * Action can be invoked independent of the page (see `proxy.ts`'s own note
 * on this), and the client can't be trusted for the cart contents or total.
 */
export async function createPaymentIntentAction(
  input: CheckoutAddressInput,
): Promise<CreatePaymentIntentResult> {
  const session = await getSession()
  const wcCustomerId = session.wcCustomerId
  if (!wcCustomerId) {
    return { error: 'Please sign in to continue.' }
  }

  const parsed = checkoutAddressSchema.safeParse(input)
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

  const shipping = resolved.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE
  const totalCents = Math.round((resolved.subtotal + shipping) * 100)

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

  try {
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
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

    if (!paymentIntent.client_secret) {
      return { error: 'Could not start checkout. Please try again.' }
    }

    return { clientSecret: paymentIntent.client_secret }
  } catch {
    return { error: 'Could not reach the payment processor. Please try again.' }
  }
}
