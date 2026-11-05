import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { getCart } from '@/lib/cart/cookie'
import { getStripe } from '@/lib/stripe'
import { getBaseUrl } from '@/lib/url'
import { localePath } from '@/lib/i18n'
import type { AddressInput } from '@/lib/address/schema'
import { lockerOrderMetaData, requiresBoxNowLocker, type BoxNowLockerSelection } from '@/lib/checkout/box-now'
import { resolveCheckoutLocker } from '@/lib/checkout/get-box-now-locker'
import { getPromotionQuoteInput, promotionAddress } from './quote'
import { ensurePromotionSession, promotionCartKey } from './session'
import { preparePromotion, readPromotionQuote, promotionBackend, promotionHealth, promotionsEnabled } from './client'
import { stripePromotionLines } from './stripe-lines'
import { PROMOTION_PROTOCOL, promotionEventFacts } from './events'
import type { PromotionAttempt } from './schema'
import type { Locale } from '@/lib/i18n'

function successUrl(origin: string, locale: Locale, attemptId: string): string { return `${origin}${localePath('/checkout/confirmation', locale)}?attempt=${attemptId}` }
async function checkoutSession(attempt: PromotionAttempt, owner: string) {
  const stripe = getStripe()
  if (attempt.sessionId) return stripe.checkout.sessions.retrieve(attempt.sessionId)
  // After Stripe's idempotency retention, an ambiguous creation needs reconciliation, never another session.
  if (Date.now() / 1000 - attempt.createdAt > 23 * 60 * 60 || attempt.expiresAt < Date.now() / 1000 + 1805) throw new Error('Previous checkout needs reconciliation. Please try again shortly.')
  const session = await stripe.checkout.sessions.create({
    integration_identifier: 'meister_promotions_prmtnsv1', mode: 'payment', locale: attempt.locale,
    customer_email: attempt.email, line_items: stripePromotionLines(attempt.quote), expires_at: attempt.expiresAt,
    success_url: successUrl(attempt.origin, attempt.locale, attempt.attemptId), cancel_url: `${attempt.origin}${localePath('/checkout', attempt.locale)}`,
    metadata: { protocol: PROMOTION_PROTOCOL, backendId: attempt.quote.backendId, attemptId: attempt.attemptId, orderId: String(attempt.orderId), storefrontOrigin: attempt.origin },
  }, { idempotencyKey: `meister:promotions:${attempt.attemptId}` })
  await promotionBackend('bind', { attemptId: attempt.attemptId, owner, sessionId: session.id, expiresAt: session.expires_at })
  return session
}
export async function createPromotionsCheckout(input: { address: AddressInput; reference: string; expectedTotal: number; deliveryMethodId: string; locale: Locale; locker?: BoxNowLockerSelection }): Promise<{ url: string }> {
  if (!promotionsEnabled() || process.env.CHECKOUT_PAYMENTS_ENABLED === 'false' || process.env.PROMOTIONS_STRIPE_ISOLATED !== 'true') throw new Error('Promotion checkout is not activated')
  const health = await promotionHealth()
  if (!health.health.activated || !health.health.transactionalTables || health.health.reconciledAt < Date.now() / 1000 - 900) throw new Error('Checkout is temporarily unavailable')
  const session = await ensurePromotionSession()
  if (!session.checkoutNonce) { session.checkoutNonce = randomUUID(); await session.save() }
  const cart = await getCart()
  const cartKey = promotionCartKey(cart)
  const context = await getPromotionQuoteInput({ owner: session.owner!, code: session.code ?? '', email: input.address.email, address: input.address, locale: input.locale })
  const origin = getBaseUrl()
  const mode = process.env.STRIPE_EXPECTED_MODE
  if (!['test', 'live'].includes(mode ?? '') || origin !== process.env.STRIPE_CHECKOUT_ORIGIN) throw new Error('Payment environment is not verified')
  const sourceQuote = await readPromotionQuote({ owner: session.owner!, reference: input.reference })
  if (sourceQuote.backendId !== health.backendId || sourceQuote.shippingId !== (input.deliveryMethodId === 'no_shipping' ? '' : input.deliveryMethodId)) throw new Error('Delivery changed. Refresh checkout.')
  const canonicalMethod = sourceQuote.methods.find(method => method.id === sourceQuote.shippingId)
  const keyForGeneration = () => createHash('sha256').update(JSON.stringify([session.checkoutNonce, cartKey, input.address, context.email, session.code ?? '', input.expectedTotal, input.deliveryMethodId, input.locker?.id ?? '', input.locale])).digest('hex')
  const locker = requiresBoxNowLocker(input.address.country, canonicalMethod?.wcMethodId) ? await resolveCheckoutLocker(input.address.country, canonicalMethod!.wcMethodId, input.locker) : undefined
  const request = { locker: locker ? lockerOrderMetaData(locker) : undefined, owner: session.owner!, reference: input.reference, attemptKey: keyForGeneration(), currentShippingId: sourceQuote.shippingId, address: { ...promotionAddress(input.address), first_name: input.address.firstName, last_name: input.address.lastName, phone: input.address.phone }, currentItems: context.items, currentEmail: context.email, currentCustomerId: context.customerId, currentCoupon: context.coupon, origin, mode, locale: input.locale }
  let attempt = await preparePromotion(request)
  if (['expired', 'failed'].includes(attempt.state)) {
    session.checkoutNonce = randomUUID(); await session.save(); request.attemptKey = keyForGeneration(); attempt = await preparePromotion(request)
  }
  if (attempt.supersede) {
    const oldSession = await checkoutSession(attempt, session.owner!)
    if (oldSession.payment_status === 'paid' || oldSession.payment_status === 'no_payment_required') return { url: successUrl(attempt.origin, attempt.locale, attempt.attemptId) }
    if (oldSession.status === 'complete') throw new Error('Your previous payment is still processing')
    const terminal = oldSession.status === 'expired' ? oldSession : await getStripe().checkout.sessions.expire(oldSession.id)
    const facts = promotionEventFacts('checkout.session.expired', terminal, { backendId: health.backendId, origin: attempt.origin, mode: attempt.mode })
    await promotionBackend('event', facts)
    attempt = await preparePromotion(request)
    if (attempt.supersede) throw new Error('Previous checkout is still processing')
  }
  if (attempt.quote.total !== input.expectedTotal) throw new Error('Your order total has changed. Please refresh checkout.')
  session.pending = { attemptId: attempt.attemptId, cartKey }
  await session.save()
  if (attempt.quote.total === 0) {
    await promotionBackend('event', { attemptId: attempt.attemptId, sessionId: `zero_${attempt.attemptId}`, amount: 0, currency: 'eur', paymentStatus: 'no_payment_required', paymentIntent: '', state: 'paid', mode: attempt.mode })
    return { url: successUrl(origin, input.locale, attempt.attemptId) }
  }
  if (attempt.state === 'paid') return { url: successUrl(origin, input.locale, attempt.attemptId) }
  const hosted = await checkoutSession(attempt, session.owner!)
  if (!hosted.url) throw new Error('Could not open payment')
  return { url: hosted.url }
}
