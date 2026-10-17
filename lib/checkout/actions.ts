'use server'

import { requestLocaleSchema } from '@/lib/i18n/request'
import { translate, localePath } from '@/lib/i18n'
import { getTranslator } from '@/lib/i18n/server'
import { getSession } from '@/lib/auth/session'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { formatVariationLabel } from '@/lib/cart/variation-label'
import { getStripe } from '@/lib/stripe'
import { getBaseUrl } from '@/lib/url'
import { addressSchema, shippingAddressSchema, type AddressInput, type ShippingAddressInput } from '@/lib/address/schema'
import { toWcAddress } from '@/lib/address/map-address'
import { updateWcCustomerAddress } from '@/lib/woocommerce/queries/update-customer-address'
import type { ShippingMethod } from '@/lib/woocommerce'
import { quoteResolvedCart } from './shipping'
import { getShippingQuote } from './get-shipping-quote'
import { checkoutCartSignature } from './model'
import { lockerToStripeMetadata, type BoxNowLocker, type BoxNowLockerSelection } from './box-now'
import { resolveCheckoutLocker } from './get-box-now-locker'

export type CreateCheckoutSessionResult = { url: string } | { error: string; refreshShipping?: boolean }

/** Compatibility entry point for existing callers. New checkout clients use
 *  the stable shipping route; both read the shopper's server-side cart. */
export async function getShippingMethodsAction(input: ShippingAddressInput): Promise<ShippingMethod[]> {
  const t = await getTranslator()
  const parsed = shippingAddressSchema.safeParse(input)
  if (!parsed.success) throw new Error(t('Please check your delivery country and address.'))
  const quote = await getShippingQuote(parsed.data)
  if (quote.status !== 'ready') throw new Error(t(quote.error))
  return quote.methods
}

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
  deliveryMethodId: string,
  expected?: { cartSignature: string; shippingCost: number },
  boxNowLocker?: BoxNowLockerSelection,
  localeInput?: unknown,
): Promise<CreateCheckoutSessionResult> {
  const parsedLocale = requestLocaleSchema.safeParse(localeInput)
  if (!parsedLocale.success) return { error: 'Invalid language selection.' }
  const locale = parsedLocale.data
  const t = (source: string) => translate(locale, source)
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
    return { error: t('Payments are unavailable in mock-data mode. Connect WooCommerce to continue.') }
  }
  const session = await getSession()
  const wcCustomerId = session.wcCustomerId
  const isGuest = !wcCustomerId

  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) {
    return { error: t('Please fill in every required field.') }
  }

  // A logged-in order takes its email from the WooCommerce customer record;
  // a guest order has nowhere else to get it.
  if (isGuest && !parsed.data.email) {
    return { error: t('Please enter your email address.') }
  }

  const cart = await getCart()
  const resolved = await resolveCartItems(cart, locale)

  if (resolved.lines.length === 0) {
    return { error: t('Your cart is empty.') }
  }
  if (resolved.unavailableCount > 0 || resolved.lines.some((line) => !line.purchasable)) {
    return { error: t('Your cart has changed — please review it before checking out.') }
  }
  if (expected && expected.cartSignature !== checkoutCartSignature(resolved.lines)) {
    return { error: t('Your cart or product prices have changed. Please review your cart before paying.'), refreshShipping: true }
  }

  // Best-effort — remembers the address for next time, but must never block
  // or fail checkout if the write itself fails. Guests have no customer
  // record to save it to, so this is skipped for them.
  if (wcCustomerId) {
    updateWcCustomerAddress(wcCustomerId, toWcAddress(parsed.data)).catch((error) => {
      console.error('[account] Failed to save address at checkout:', error)
    })
  }

  // Re-validated against the shopper's real cart and full validated address
  // — never trust the client's own idea of which method (or price) applies,
  // same principle already used for cart line pricing below. A WooCommerce
  // Store API failure here (the store unreachable, a plugin erroring) must
  // fail checkout cleanly rather than let a stale/tampered method through.
  const quote = await quoteResolvedCart(resolved, {
      country: parsed.data.country,
      city: parsed.data.city,
      postcode: parsed.data.postcode,
      address1: parsed.data.address1,
  })
  if (quote.status !== 'ready') return { error: t(quote.error), refreshShipping: true }
  const method = quote.methods.find((candidate) => candidate.id === deliveryMethodId)
  if (!method) {
    return { error: t('Please choose a delivery method.'), refreshShipping: true }
  }
  const shipping = method.cost
  if (expected && Math.round(expected.shippingCost * 100) !== Math.round(shipping * 100)) {
    return { error: t('The delivery price has changed. Please review the updated total and continue.'), refreshShipping: true }
  }

  let locker: BoxNowLocker | undefined
  try { locker = await resolveCheckoutLocker(parsed.data.country, method.wcMethodId, boxNowLocker) }
  catch (error) { return { error: t(error instanceof Error ? error.message : 'Could not verify your BOX NOW locker. Please try again.') } }

  // Metadata carries only *identity* — product/variation ids, quantities,
  // the shopper's axis picks, and the shipping address — never a price.
  // WooCommerce prices every line item itself from live product data at
  // order-creation time, so a stale/tampered metadata value can reference a
  // bad id but can never dictate what gets charged.
  //
  // `a` is only the axes the variation does NOT pin ("Any …" axes like skin
  // colour / hardness) — WooCommerce already records the pinned ones on the
  // order from `variation_id`, so this is the minimum the shop needs to
  // fulfil the right item.
  const cartLines = resolved.lines.map((line) => {
    const extraOptions = Object.fromEntries(
      Object.entries(line.attributes).filter(([name]) => !(name in line.variantAttributes)),
    )
    return {
      p: line.productId,
      v: line.resolvedVariationId ?? line.variationId,
      q: line.quantity,
      ...(Object.keys(extraOptions).length > 0 ? { a: extraOptions } : {}),
    }
  })

  // Stripe caps a metadata value at 500 chars. If a big multi-axis cart
  // would blow that, drop the `a` fields rather than the order — our own
  // checkout summary still shows everything from the cookie.
  const cartLinesJson = JSON.stringify(cartLines)
  const safeCartLinesJson =
    cartLinesJson.length <= 480
      ? cartLinesJson
      : JSON.stringify(cartLines.map((line) => ({ p: line.p, v: line.v, q: line.q })))

  const lineItems = resolved.lines.map((line) => {
    // Show the chosen variation on Stripe's hosted page and the receipt too,
    // so the last screen before payment matches our own checkout summary.
    const variation = formatVariationLabel(line.attributes, ', ', t)
    return {
      price_data: {
        currency: 'eur',
        product_data: { name: variation ? `${line.name} (${variation})` : line.name },
        unit_amount: Math.round(line.unitPrice * 100),
      },
      quantity: line.quantity,
    }
  })

  // Always shown, even when free (€0 pickup) — so the customer sees exactly
  // which delivery method they're getting on Stripe's hosted page and the
  // receipt, not just a silent absence of a shipping line.
  lineItems.push({
    price_data: {
      currency: 'eur',
      product_data: { name: t(method.title) },
      unit_amount: Math.round(shipping * 100),
    },
    quantity: 1,
  })

  try {
    const stripe = getStripe()
    const baseUrl = getBaseUrl()

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale,
      line_items: lineItems,
      // Guests give Stripe their email so it can send them a receipt and so
      // the confirmation page can recover it; logged-in shoppers already
      // have an account email on file.
      ...(parsed.data.email ? { customer_email: parsed.data.email } : {}),
      success_url: `${baseUrl}${localePath('/checkout/confirmation', locale)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${localePath('/checkout', locale)}`,
      metadata: {
        locale,
        // Empty string for a guest — the webhook reads this back and treats
        // a blank/zero value as "guest order" (customer_id 0 in WooCommerce).
        wcCustomerId: wcCustomerId ? String(wcCustomerId) : '',
        cartLines: safeCartLinesJson,
        shippingMethodId: method.wcMethodId,
        shippingMethodTitle: method.title,
        shippingCost: String(shipping),
        ship_email: parsed.data.email ?? '',
        ship_first_name: parsed.data.firstName,
        ship_last_name: parsed.data.lastName,
        ship_address1: parsed.data.address1,
        ship_address2: parsed.data.address2 ?? '',
        ship_city: parsed.data.city,
        ship_postcode: parsed.data.postcode,
        ship_country: parsed.data.country,
        ship_phone: parsed.data.phone,
        ...(locker ? lockerToStripeMetadata(locker) : {}),
      },
    })

    if (!checkoutSession.url) {
      return { error: t('Could not start checkout. Please try again.') }
    }

    return { url: checkoutSession.url }
  } catch {
    return { error: t('Could not reach the payment processor. Please try again.') }
  }
}
