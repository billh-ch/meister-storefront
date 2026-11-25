'use server'

import { requestLocaleSchema } from '@/lib/i18n/request'
import { translate, localePath } from '@/lib/i18n'
import { getTranslator } from '@/lib/i18n/server'
import { getSession } from '@/lib/auth/session'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'
import { cartLinesMetadata, stripeProductLineItems } from './stripe-lines'
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
import { validateCoupon } from '@/lib/coupons/validate'

export type CreateCheckoutSessionResult = { url: string } | { error: string; refreshShipping?: boolean; refreshCoupon?: boolean }

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
 * live WooCommerce data (variation + chosen add-ons), never from anything
 * the client posts; WooCommerce re-prices the order itself again at webhook
 * time from the same ids, so a tampered metadata value can reference a bad
 * id but never dictate what gets charged in either system.
 */
export async function createCheckoutSessionAction(
  input: AddressInput,
  deliveryMethodId: string,
  expected?: { cartSignature: string; shippingCost: number; discount?: number },
  boxNowLocker?: BoxNowLockerSelection,
  localeInput?: unknown,
  couponCode?: string,
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

  // Recomputed here from WooCommerce's live coupon and the live cart — the
  // amount the shopper saw is only a consistency check, never the charge.
  let discountCents = 0
  let appliedCouponCode: string | undefined
  if (couponCode) {
    const coupon = await validateCoupon(couponCode, resolved, { email: parsed.data.email, customerId: wcCustomerId })
    if (!coupon.ok) return { error: translate(locale, coupon.error, coupon.values), refreshCoupon: true }
    discountCents = coupon.discountCents
    appliedCouponCode = coupon.code
  }
  if (expected?.discount !== undefined && Math.round(expected.discount * 100) !== discountCents) {
    return { error: t('The discount has changed. Please review the updated total and continue.'), refreshCoupon: true }
  }

  let locker: BoxNowLocker | undefined
  try { locker = await resolveCheckoutLocker(parsed.data.country, method.wcMethodId, boxNowLocker) }
  catch (error) { return { error: t(error instanceof Error ? error.message : 'Could not verify your BOX NOW locker. Please try again.') } }

  // Metadata carries only *identity* — product/variation ids, quantities,
  // the shopper's axis picks and add-on ids, and the shipping address —
  // never a price. WooCommerce prices every line item itself from live
  // product data at order-creation time (the meister-product-addons plugin
  // adds the add-on prices there), so a stale metadata value can reference a
  // bad id but can never dictate what gets charged.
  const safeCartLinesJson = cartLinesMetadata(resolved.lines)
  if (!safeCartLinesJson) {
    return { error: t('Your cart is too large to pay for in one order. Please remove some items and try again.') }
  }

  const lineItems = stripeProductLineItems(resolved.lines, t)

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

    // A one-off Stripe discount for exactly the amount WooCommerce's coupon
    // grants, so the hosted page and receipt show it. Single use.
    const stripeCoupon = discountCents > 0
      ? await stripe.coupons.create({
          name: `${t('Discount code')} ${appliedCouponCode}`.slice(0, 40),
          amount_off: discountCents,
          currency: 'eur',
          duration: 'once',
          max_redemptions: 1,
        })
      : undefined

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale,
      line_items: lineItems,
      ...(stripeCoupon ? { discounts: [{ coupon: stripeCoupon.id }] } : {}),
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
        ...(appliedCouponCode ? { couponCode: appliedCouponCode, couponDiscount: String(discountCents / 100) } : {}),
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
