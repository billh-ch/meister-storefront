/**
 * Customer self-service cancellation. A storefront order only exists once it
 * is paid, so cancelling means: refund in Stripe, then cancel in WooCommerce.
 *
 * Ordering rule: the order is never marked cancelled before the money is
 * refunded. Everything after the Stripe refund lives in `finishCustomerCancel`,
 * which is idempotent and is also called from the Stripe `refund.created`
 * webhook, so a crash halfway is completed by Stripe's retry.
 */

export const CANCEL_REASONS = ['ordered_by_mistake', 'changed_mind', 'found_cheaper', 'delivery_too_slow', 'other', 'none'] as const
export type CancelReason = (typeof CANCEL_REASONS)[number]
export const CANCEL_MARKER_KEY = 'meister_customer_cancel'
export const CANCEL_REFUND_SOURCE = 'customer_cancel'

export const isCancelReason = (value: unknown): value is CancelReason =>
  typeof value === 'string' && (CANCEL_REASONS as readonly string[]).includes(value)

/** The fields of a WooCommerce REST v3 order this module reads. */
export interface CancelOrder {
  id: number
  number?: string
  status?: string
  customer_id?: number
  date_created_gmt?: string
  currency?: string
  total?: string
  transaction_id?: string
  refunds?: { id?: number; total?: string }[]
  meta_data?: { key: string; value: unknown }[]
}

/** Hours after ordering that a customer may cancel. `CUSTOMER_CANCEL_WINDOW_HOURS`, default 2; 0 turns the feature off. */
export function cancelWindowMs(env: Record<string, string | undefined> = process.env): number {
  const raw = env.CUSTOMER_CANCEL_WINDOW_HOURS
  const hours = raw === undefined || raw.trim() === '' ? 2 : Number(raw)
  if (!Number.isFinite(hours) || hours <= 0) return 0
  return Math.min(hours, 24 * 14) * 60 * 60 * 1000
}

export type Ineligible = 'not_owner' | 'status' | 'window' | 'payment' | 'already_refunded' | 'currency' | 'disabled'
export type Eligibility = { ok: true; deadline: number } | { ok: false; reason: Ineligible }

const createdAt = (order: CancelOrder): number => {
  const raw = order.date_created_gmt
  if (!raw) return Number.NaN
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`)
}

export function cancelEligibility(order: CancelOrder, context: { customerId: number; now: number; windowMs: number }): Eligibility {
  if (context.windowMs <= 0) return { ok: false, reason: 'disabled' }
  if (!context.customerId || order.customer_id !== context.customerId) return { ok: false, reason: 'not_owner' }
  if (order.status !== 'processing') return { ok: false, reason: 'status' }
  if ((order.currency ?? '').toUpperCase() !== 'EUR') return { ok: false, reason: 'currency' }
  if (!/^pi_[A-Za-z0-9]+$/.test(order.transaction_id ?? '')) return { ok: false, reason: 'payment' }
  if ((order.refunds?.length ?? 0) > 0 || order.meta_data?.some(m => m.key === CANCEL_MARKER_KEY && m.value)) {
    return { ok: false, reason: 'already_refunded' }
  }
  const created = createdAt(order)
  const deadline = created + context.windowMs
  if (!Number.isFinite(created) || context.now < created - 5 * 60 * 1000 || context.now > deadline) return { ok: false, reason: 'window' }
  return { ok: true, deadline }
}

export interface StripeRefundInfo { id: string; amountCents: number; reason: CancelReason }

export interface CancelDeps {
  getOrder(orderId: number): Promise<CancelOrder | null>
  /** Short exclusive lock per order. Must fail CLOSED (false) when unsure. */
  lock(key: string, ttlSeconds: number): Promise<boolean>
  unlock(key: string): Promise<void>
  /** Full refund of the payment. Idempotent per order. */
  refund(input: { orderId: number; paymentIntentId: string; reason: CancelReason }): Promise<{ id: string; amountCents: number }>
  recordedRefundIds(orderId: number): Promise<string[]>
  recordWooRefund(orderId: number, refund: { stripeRefundId: string; amountCents: number }): Promise<void>
  /** Sets status cancelled and the cancel marker in one update. */
  markCancelled(orderId: number, reason: CancelReason): Promise<void>
  note(orderId: number, text: string): Promise<void>
  /** Customer confirmation + shop alert, each at most once per order. */
  email(order: CancelOrder, refund: StripeRefundInfo, problems: string[]): Promise<unknown>
  now(): number
  windowMs: number
}

export const cancelLockKey = (orderId: number) => `order:cancel:${orderId}`
const LOCK_SECONDS = 90

export type CancelOutcome =
  | { ok: true; amountCents: number; problems: string[] }
  | { ok: false; reason: Ineligible | 'not_found' | 'busy' | 'refund_failed' }

/** Called from the signed-in customer's account page. */
export async function cancelOrderForCustomer(
  input: { orderId: number; customerId: number; reason: CancelReason },
  deps: CancelDeps,
): Promise<CancelOutcome> {
  const key = cancelLockKey(input.orderId)
  if (!(await deps.lock(key, LOCK_SECONDS))) return { ok: false, reason: 'busy' }
  try {
    // Re-read live: the account page may be minutes old.
    const order = await deps.getOrder(input.orderId)
    if (!order) return { ok: false, reason: 'not_found' }
    const eligible = cancelEligibility(order, { customerId: input.customerId, now: deps.now(), windowMs: deps.windowMs })
    if (!eligible.ok) return eligible

    let refund: { id: string; amountCents: number }
    try {
      refund = await deps.refund({ orderId: order.id, paymentIntentId: order.transaction_id!, reason: input.reason })
    } catch (error) {
      console.error('[cancel] Stripe refund failed', { orderId: order.id, error: error instanceof Error ? error.name : 'UnknownError' })
      return { ok: false, reason: 'refund_failed' }
    }
    const { problems } = await finishCustomerCancel(order.id, { ...refund, reason: input.reason }, deps, { locked: true })
    return { ok: true, amountCents: refund.amountCents, problems }
  } finally {
    await deps.unlock(key).catch(() => undefined)
  }
}

/**
 * Everything after the money is back. Safe to run any number of times, from
 * the account action or from Stripe's `refund.created` webhook. Throws only
 * when the caller should retry later (another run holds the lock, or the order
 * cannot be read).
 */
export async function finishCustomerCancel(
  orderId: number,
  refund: StripeRefundInfo,
  deps: CancelDeps,
  options: { locked?: boolean } = {},
): Promise<{ problems: string[] }> {
  const key = cancelLockKey(orderId)
  if (!options.locked && !(await deps.lock(key, LOCK_SECONDS))) throw new Error('Cancellation in progress')
  try {
    const problems: string[] = []
    const amount = `€${(refund.amountCents / 100).toFixed(2)}`
    try {
      if (!(await deps.recordedRefundIds(orderId)).includes(refund.id)) {
        await deps.recordWooRefund(orderId, { stripeRefundId: refund.id, amountCents: refund.amountCents })
      }
    } catch {
      problems.push(`The Stripe refund ${refund.id} (${amount}) could not be recorded in WooCommerce. Please add it manually.`)
    }

    const before = await deps.getOrder(orderId)
    if (!before) throw new Error('Order could not be read')
    if (before.status !== 'cancelled') {
      try {
        await deps.markCancelled(orderId, refund.reason)
        await deps.note(orderId, `Cancelled by the customer from their account (reason: ${refund.reason}). Refunded ${amount} in Stripe (${refund.id}).`).catch(() => undefined)
      } catch {
        problems.push(`The order could not be set to Cancelled. The customer has already been refunded ${amount}: set it to Cancelled manually and do not ship it.`)
        await deps.note(orderId, `Customer cancelled and was refunded ${amount} in Stripe (${refund.id}), but the status could not be updated. Do not ship.`).catch(() => undefined)
      }
    }

    const order = (await deps.getOrder(orderId).catch(() => null)) ?? before
    await deps.email(order, refund, problems).catch(() => undefined)
    return { problems }
  } finally {
    if (!options.locked) await deps.unlock(key).catch(() => undefined)
  }
}
