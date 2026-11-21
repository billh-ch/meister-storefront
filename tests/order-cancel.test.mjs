import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { cancelEligibility, cancelWindowMs, cancelOrderForCustomer, finishCustomerCancel, isCancelReason } = await import('../lib/orders/cancel.ts')
const { handleRefundCreated } = await import('../lib/refunds/handle-refund.ts')
const { notifyOrderCancelled } = await import('../lib/email/notify.ts')
const { buildCustomerCancelled } = await import('../lib/email/templates/customer.ts')
const { buildOwnerCancelAlert } = await import('../lib/email/templates/owner.ts')

const HOUR = 3600_000
const CREATED = Date.parse('2026-11-21T10:00:00Z')
const baseOrder = () => ({
  id: 900, number: '900', status: 'processing', customer_id: 42, date_created_gmt: '2026-11-21T10:00:00',
  currency: 'EUR', total: '120.00', transaction_id: 'pi_abc123', refunds: [], meta_data: [{ key: 'meister_locale', value: 'en' }],
  billing: { first_name: 'Maria', email: 'maria@example.com' }, line_items: [{ name: 'Carbon fins', quantity: 1, subtotal: '96.77', subtotal_tax: '23.23' }],
})
const ctx = (over = {}) => ({ customerId: 42, now: CREATED + HOUR, windowMs: 2 * HOUR, ...over })

test('eligibility: owner, processing, EUR, Stripe-paid, unrefunded, inside the window', () => {
  assert.deepEqual(cancelEligibility(baseOrder(), ctx()), { ok: true, deadline: CREATED + 2 * HOUR })
  const no = (order, over) => cancelEligibility({ ...baseOrder(), ...order }, ctx(over)).reason
  assert.equal(no({ customer_id: 7 }), 'not_owner')
  assert.equal(no({ customer_id: undefined }), 'not_owner')
  assert.equal(no({}, { customerId: 0 }), 'not_owner')
  for (const status of ['on-hold', 'completed', 'cancelled', 'refunded', 'pending', 'failed']) assert.equal(no({ status }), 'status')
  assert.equal(no({ currency: 'USD' }), 'currency')
  assert.equal(no({ transaction_id: '' }), 'payment')
  assert.equal(no({ transaction_id: 'ch_123' }), 'payment')
  assert.equal(no({ refunds: [{ id: 1, total: '-5.00' }] }), 'already_refunded')
  assert.equal(no({ meta_data: [{ key: 'meister_customer_cancel', value: 'other' }] }), 'already_refunded')
  assert.equal(no({}, { now: CREATED + 2 * HOUR + 1 }), 'window')
  assert.equal(no({ date_created_gmt: undefined }), 'window')
  assert.equal(no({ date_created_gmt: 'garbage' }), 'window')
  assert.equal(no({}, { windowMs: 0 }), 'disabled')
})

test('window setting: default 2 hours, 0 or junk disables, capped at 14 days', () => {
  assert.equal(cancelWindowMs({}), 2 * HOUR)
  assert.equal(cancelWindowMs({ CUSTOMER_CANCEL_WINDOW_HOURS: '' }), 2 * HOUR)
  assert.equal(cancelWindowMs({ CUSTOMER_CANCEL_WINDOW_HOURS: '0.5' }), HOUR / 2)
  assert.equal(cancelWindowMs({ CUSTOMER_CANCEL_WINDOW_HOURS: '0' }), 0)
  assert.equal(cancelWindowMs({ CUSTOMER_CANCEL_WINDOW_HOURS: 'abc' }), 0)
  assert.equal(cancelWindowMs({ CUSTOMER_CANCEL_WINDOW_HOURS: '-3' }), 0)
  assert.equal(cancelWindowMs({ CUSTOMER_CANCEL_WINDOW_HOURS: '9999' }), 14 * 24 * HOUR)
  assert.ok(isCancelReason('changed_mind')); assert.ok(isCancelReason('none')); assert.ok(!isCancelReason('<script>'))
})

function setup(over = {}) {
  const state = { order: baseOrder(), locks: new Set(), wooRefunds: [], notes: [], emails: [], refunds: [], log: [] }
  const deps = {
    getOrder: async () => structuredClone(state.order),
    lock: async key => { if (state.locks.has(key)) return false; state.locks.add(key); return true },
    unlock: async key => { state.locks.delete(key) },
    refund: async input => { state.log.push('refund'); state.refunds.push(input); return { id: 're_1', amountCents: 12000 } },
    recordedRefundIds: async () => state.wooRefunds.map(r => r.stripeRefundId),
    recordWooRefund: async (id, r) => { state.log.push('record'); state.wooRefunds.push(r); state.order.status = 'refunded'; state.order.refunds = [{ id: 1, total: '-120.00' }] },
    markCancelled: async (id, reason) => { state.log.push('cancel'); state.order.status = 'cancelled'; state.order.meta_data.push({ key: 'meister_customer_cancel', value: reason }) },
    note: async (id, text) => { state.notes.push(text) },
    email: async (order, refund, problems) => { state.log.push('email'); state.emails.push({ status: order.status, refund, problems }) },
    now: () => CREATED + HOUR,
    windowMs: 2 * HOUR,
    ...over,
  }
  return { state, deps }
}

test('a customer cancel refunds first, then records, cancels and emails once', async () => {
  const { state, deps } = setup()
  const result = await cancelOrderForCustomer({ orderId: 900, customerId: 42, reason: 'changed_mind' }, deps)
  assert.deepEqual(result, { ok: true, amountCents: 12000, problems: [] })
  assert.deepEqual(state.log, ['refund', 'record', 'cancel', 'email'])
  assert.deepEqual(state.refunds, [{ orderId: 900, paymentIntentId: 'pi_abc123', reason: 'changed_mind' }])
  assert.equal(state.order.status, 'cancelled')
  assert.equal(state.emails[0].status, 'cancelled')
  assert.equal(state.locks.size, 0, 'lock released')
  assert.match(state.notes[0], /Cancelled by the customer.*changed_mind.*€120\.00.*re_1/)
  // A second click finds a cancelled order and changes nothing.
  assert.deepEqual(await cancelOrderForCustomer({ orderId: 900, customerId: 42, reason: 'changed_mind' }, deps), { ok: false, reason: 'status' })
  assert.equal(state.refunds.length, 1)
})

test('someone else\'s order, an expired window or a missing order is refused before any refund', async () => {
  for (const [input, over, reason] of [
    [{ orderId: 900, customerId: 7 }, {}, 'not_owner'],
    [{ orderId: 900, customerId: 42 }, { now: () => CREATED + 3 * HOUR }, 'window'],
    [{ orderId: 900, customerId: 42 }, { getOrder: async () => null }, 'not_found'],
  ]) {
    const { state, deps } = setup(over)
    assert.deepEqual(await cancelOrderForCustomer({ ...input, reason: 'none' }, deps), { ok: false, reason })
    assert.equal(state.refunds.length, 0); assert.equal(state.locks.size, 0)
  }
})

test('a concurrent click is refused while the first one holds the lock', async () => {
  const { state, deps } = setup()
  state.locks.add('order:cancel:900')
  assert.deepEqual(await cancelOrderForCustomer({ orderId: 900, customerId: 42, reason: 'none' }, deps), { ok: false, reason: 'busy' })
  assert.equal(state.refunds.length, 0)
})

test('a failed Stripe refund leaves the order untouched and releases the lock', async () => {
  const { state, deps } = setup({ refund: async () => { throw new Error('card_declined') } })
  assert.deepEqual(await cancelOrderForCustomer({ orderId: 900, customerId: 42, reason: 'none' }, deps), { ok: false, reason: 'refund_failed' })
  assert.equal(state.order.status, 'processing'); assert.equal(state.emails.length, 0); assert.equal(state.locks.size, 0)
})

test('if WooCommerce fails after the refund, the customer is still told and the shop is told to act', async () => {
  const { state, deps } = setup({
    recordWooRefund: async () => { throw new Error('502') },
    markCancelled: async () => { throw new Error('502') },
  })
  const result = await cancelOrderForCustomer({ orderId: 900, customerId: 42, reason: 'other' }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.problems.length, 2)
  assert.match(result.problems[1], /do not ship/i)
  assert.equal(state.emails.length, 1); assert.equal(state.emails[0].problems.length, 2)
  assert.ok(state.notes.some(n => /Do not ship/.test(n)))
})

test('finishing again (Stripe webhook retry) does not record or cancel twice', async () => {
  const { state, deps } = setup()
  await cancelOrderForCustomer({ orderId: 900, customerId: 42, reason: 'none' }, deps)
  await finishCustomerCancel(900, { id: 're_1', amountCents: 12000, reason: 'none' }, deps)
  assert.equal(state.wooRefunds.length, 1)
  assert.equal(state.log.filter(s => s === 'cancel').length, 1)
})

test('the webhook path waits (throws) while the account action is still running', async () => {
  const { state, deps } = setup()
  state.locks.add('order:cancel:900')
  await assert.rejects(finishCustomerCancel(900, { id: 're_1', amountCents: 12000, reason: 'none' }, deps), /in progress/)
  assert.equal(state.wooRefunds.length, 0)
})

test('the webhook completes a cancel that stopped right after the refund', async () => {
  const { state, deps } = setup()
  await finishCustomerCancel(900, { id: 're_1', amountCents: 12000, reason: 'found_cheaper' }, deps)
  assert.deepEqual(state.log, ['record', 'cancel', 'email'])
  assert.equal(state.order.status, 'cancelled'); assert.equal(state.locks.size, 0)
})

test('Stripe refund.created for a customer cancel goes to the cancel flow, never the generic refund email', async () => {
  const calls = []; const sent = []
  const deps = {
    orderIdForPayment: async () => 900, orderIdByScan: async () => null,
    getOrder: async () => baseOrder(), recordedRefundIds: async () => [], createWooRefund: async () => { calls.push('generic-record') },
    notify: { send: async m => { sent.push(m); return { ok: true, id: 'x' } }, claim: async () => true, release: async () => {}, note: async () => {}, customerEmail: async () => undefined },
    finishCustomerCancel: async (orderId, refund) => { calls.push({ orderId, refund }) },
  }
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const result = await handleRefundCreated({ id: 're_9', object: 'refund', amount: 12000, currency: 'eur', status: 'succeeded', payment_intent: 'pi_abc123', metadata: { source: 'customer_cancel', cancel_reason: 'changed_mind' } }, deps)
    assert.equal(result.status, 'processed')
    assert.deepEqual(calls, [{ orderId: 900, refund: { id: 're_9', amountCents: 12000, reason: 'changed_mind' } }])
    assert.equal(sent.length, 0)
    // a dashboard refund still takes the normal path
    await handleRefundCreated({ id: 're_10', object: 'refund', amount: 500, currency: 'eur', status: 'succeeded', payment_intent: 'pi_abc123', metadata: {} }, deps)
    assert.ok(calls.includes('generic-record'))
  } finally { delete process.env.RESEND_API_KEY }
})

test('the generic "cancelled" email is skipped for customer cancellations', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const sent = []
    const deps = { send: async m => { sent.push(m); return { ok: true, id: 'x' } }, claim: async () => true, release: async () => {}, note: async () => {}, customerEmail: async () => undefined }
    const order = { ...baseOrder(), status: 'cancelled', meta_data: [{ key: 'meister_customer_cancel', value: 'none' }] }
    assert.equal(await notifyOrderCancelled(order, deps), 'skipped')
    assert.equal(await notifyOrderCancelled({ ...baseOrder(), status: 'cancelled' }, deps), 'sent')
    assert.equal(sent.length, 1)
  } finally { delete process.env.RESEND_API_KEY }
})

test('cancellation emails: customer (EN/EL) and shop alert with action items', () => {
  const en = buildCustomerCancelled(baseOrder(), 'en', { amountCents: 12000 })
  assert.match(en.subject, /900 has been cancelled/); assert.match(en.text, /refunded €120\.00/); assert.match(en.text, /5–10 business days/)
  const el = buildCustomerCancelled(baseOrder(), 'el', { amountCents: 12000 })
  assert.match(el.html, /ακυρώθηκε/)
  const ok = buildOwnerCancelAlert(baseOrder(), { amountCents: 12000, refundId: 're_1', reason: 'found_cheaper', problems: [] })
  assert.match(ok.subject, /No action needed/); assert.match(ok.text, /Found a better price/); assert.match(ok.text, /Do not ship/)
  const bad = buildOwnerCancelAlert(baseOrder(), { amountCents: 12000, refundId: 're_1', reason: 'none', problems: ['Set it to Cancelled manually.'] })
  assert.match(bad.subject, /Action needed/); assert.match(bad.text, /ACTION NEEDED/)
})
