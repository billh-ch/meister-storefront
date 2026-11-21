import { isLocale, type Locale } from '@/lib/i18n'
import { getRedis } from '@/lib/redis'
import { addOrderNote } from '@/lib/woocommerce/queries/create-order'
import { fetchWcCustomerById } from '@/lib/woocommerce/queries/get-customer-by-id'
import { orderAlertRecipient } from './config'
import { metaValue, orderNumber, refundedCents, type EmailOrder } from './order'
import { sendEmail } from './resend'
import { buildCustomerCancelled, buildOrderCancelled, buildOrderCompleted, buildOrderConfirmation, buildOrderRefunded } from './templates/customer'
import { buildWelcome, type WelcomeOffer } from './templates/account'
import { buildOwnerAlert, buildOwnerCancelAlert } from './templates/owner'

export type Outcome = 'sent' | 'duplicate' | 'skipped' | 'failed'
export interface NotifyDeps {
  send: typeof sendEmail
  /** true only for the first caller with this key. Must fail open. */
  claim: (key: string, ttlSeconds: number) => Promise<boolean>
  release: (key: string) => Promise<void>
  note: (orderId: number, text: string) => Promise<void>
  customerEmail: (customerId: number) => Promise<string | undefined>
}

const NINETY_DAYS = 60 * 60 * 24 * 90
const looksLikeEmail = (value: unknown): value is string => typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim())

export const realDeps: NotifyDeps = {
  send: sendEmail,
  // A Redis outage must never block an email; Resend's idempotency key still
  // protects against duplicates for 24 hours.
  claim: async (key, ttl) => { try { return Boolean(await getRedis().set(key, '1', { nx: true, ex: ttl })) } catch { return true } },
  release: async key => { try { await getRedis().del(key) } catch { /* best effort */ } },
  note: async (orderId, text) => { try { await addOrderNote(orderId, text) } catch { /* best effort */ } },
  customerEmail: async id => { try { return (await fetchWcCustomerById(id))?.email } catch { return undefined } },
}

async function recipientFor(order: EmailOrder, fallback: string | undefined, deps: NotifyDeps) {
  if (looksLikeEmail(order.billing?.email)) return order.billing!.email!.trim()
  if (looksLikeEmail(fallback)) return fallback.trim()
  const fromCustomer = order.customer_id ? await deps.customerEmail(order.customer_id) : undefined
  return looksLikeEmail(fromCustomer) ? fromCustomer.trim() : undefined
}

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : 'en')

/** Sends one email at most once per order. Never throws: an email problem must
 *  never affect an order. Failures leave a private note on the WooCommerce order. */
async function sendOnce(args: {
  order: EmailOrder; claimKey: string; idempotencyKey: string; label: string
  to: () => Promise<string | undefined>; build: () => { subject: string; html: string; text: string }; deps: NotifyDeps
}): Promise<Outcome> {
  const { order, deps } = args
  try {
    if (!(await deps.claim(args.claimKey, NINETY_DAYS))) return 'duplicate'
    const to = await args.to()
    if (!to) {
      await deps.release(args.claimKey)
      await deps.note(order.id, `${args.label} was not sent: no valid email address on this order.`)
      return 'skipped'
    }
    const message = args.build()
    const result = await deps.send({ to, ...message, idempotencyKey: args.idempotencyKey })
    if (result.ok) return 'sent'
    await deps.release(args.claimKey)
    await deps.note(order.id, `${args.label} could not be sent (${result.error}).`)
    console.error('[email]', { orderId: order.id, label: args.label, error: result.error })
    return 'failed'
  } catch (error) {
    console.error('[email]', { orderId: order.id, label: args.label, error: error instanceof Error ? error.name : 'UnknownError' })
    return 'failed'
  }
}

/** Customer confirmation + owner alert, once each, when an order is created. */
export async function notifyOrderCreated(
  order: EmailOrder,
  options: { locale?: unknown; fallbackEmail?: string },
  deps: NotifyDeps = realDeps,
): Promise<{ customer: Outcome; owner: Outcome }> {
  if (!process.env.RESEND_API_KEY) return { customer: 'skipped', owner: 'skipped' }
  const locale = localeOf(options.locale)
  const [customer, owner] = await Promise.all([
    sendOnce({
      order, deps, label: 'The order confirmation email', claimKey: `email:order-created:${order.id}`, idempotencyKey: `order-created-${order.id}`,
      to: () => recipientFor(order, options.fallbackEmail, deps), build: () => buildOrderConfirmation(order, locale),
    }),
    sendOnce({
      order, deps, label: 'The new-order alert email', claimKey: `email:order-alert:${order.id}`, idempotencyKey: `order-alert-${order.id}`,
      to: async () => orderAlertRecipient(), build: () => buildOwnerAlert(order),
    }),
  ])
  return { customer, owner }
}

/** Dispatch email when WooCommerce reports the order completed. */
export async function notifyOrderCompleted(order: EmailOrder, deps: NotifyDeps = realDeps): Promise<Outcome> {
  if (!process.env.RESEND_API_KEY) return 'skipped'
  const locale = localeOf(metaValue(order, 'meister_locale'))
  return sendOnce({
    order, deps, label: `The "completed" email for order ${orderNumber(order)}`, claimKey: `email:order-completed:${order.id}`, idempotencyKey: `order-completed-${order.id}`,
    to: () => recipientFor(order, undefined, deps), build: () => buildOrderCompleted(order, locale),
  })
}

/** Cancellation email, once per order, when WooCommerce reports it cancelled. */
export async function notifyOrderCancelled(order: EmailOrder, deps: NotifyDeps = realDeps): Promise<Outcome> {
  if (!process.env.RESEND_API_KEY) return 'skipped'
  // Cancelled by the customer from their account: that flow sends its own, more specific email.
  if (metaValue(order, 'meister_customer_cancel')) return 'skipped'
  const locale = localeOf(metaValue(order, 'meister_locale'))
  return sendOnce({
    order, deps, label: `The "cancelled" email for order ${orderNumber(order)}`, claimKey: `email:order-cancelled:${order.id}`, idempotencyKey: `order-cancelled-${order.id}`,
    to: () => recipientFor(order, undefined, deps), build: () => buildOrderCancelled(order, locale),
  })
}

/** Refund email, once per Stripe refund. `order` must already include this refund. */
export async function notifyOrderRefunded(
  order: EmailOrder,
  refund: { id: string; amountCents: number },
  deps: NotifyDeps = realDeps,
): Promise<Outcome> {
  if (!process.env.RESEND_API_KEY) return 'skipped'
  const locale = localeOf(metaValue(order, 'meister_locale'))
  const total = Math.round((Number.parseFloat(order.total ?? '') || 0) * 100)
  const full = total > 0 && Math.max(refundedCents(order), refund.amountCents) >= total
  return sendOnce({
    order, deps, label: `The refund email (${refund.id})`, claimKey: `email:refund:${refund.id}`, idempotencyKey: `refund-${refund.id}`,
    to: () => recipientFor(order, undefined, deps), build: () => buildOrderRefunded(order, locale, { amountCents: refund.amountCents, full }),
  })
}

/** Welcome email, once per customer. Not tied to an order, so failures are only logged. */
export async function notifyWelcome(
  input: { customerId: number; email: string; firstName?: string; locale?: unknown; offer?: WelcomeOffer | null },
  deps: NotifyDeps = realDeps,
): Promise<Outcome> {
  if (!process.env.RESEND_API_KEY) return 'skipped'
  if (!looksLikeEmail(input.email)) return 'skipped'
  const claimKey = `email:welcome:${input.customerId}`
  try {
    if (!(await deps.claim(claimKey, NINETY_DAYS))) return 'duplicate'
    const message = buildWelcome({ firstName: input.firstName, locale: localeOf(input.locale), offer: input.offer })
    const result = await deps.send({ to: input.email.trim(), ...message, idempotencyKey: `welcome-${input.customerId}` })
    if (result.ok) return 'sent'
    await deps.release(claimKey)
    console.error('[email]', { customerId: input.customerId, label: 'welcome', error: result.error })
    return 'failed'
  } catch (error) {
    console.error('[email]', { customerId: input.customerId, label: 'welcome', error: error instanceof Error ? error.name : 'UnknownError' })
    return 'failed'
  }
}

/** Customer cancelled from their account: one confirmation to them, one alert to the shop. */
export async function notifyCustomerCancelled(
  order: EmailOrder,
  cancel: { refundId: string; amountCents: number; reason: string; problems: string[] },
  deps: NotifyDeps = realDeps,
): Promise<{ customer: Outcome; owner: Outcome }> {
  if (!process.env.RESEND_API_KEY) return { customer: 'skipped', owner: 'skipped' }
  const locale = localeOf(metaValue(order, 'meister_locale'))
  const [customer, owner] = await Promise.all([
    sendOnce({
      order, deps, label: `The cancellation email for order ${orderNumber(order)}`, claimKey: `email:customer-cancel:${order.id}`, idempotencyKey: `customer-cancel-${order.id}`,
      to: () => recipientFor(order, undefined, deps), build: () => buildCustomerCancelled(order, locale, { amountCents: cancel.amountCents }),
    }),
    sendOnce({
      order, deps, label: 'The cancellation alert email', claimKey: `email:customer-cancel-alert:${order.id}`, idempotencyKey: `customer-cancel-alert-${order.id}`,
      to: async () => orderAlertRecipient(), build: () => buildOwnerCancelAlert(order, cancel),
    }),
  ])
  return { customer, owner }
}
