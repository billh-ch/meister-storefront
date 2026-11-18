import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { handleRefundCreated } = await import('../lib/refunds/handle-refund.ts')

const refund = (overrides = {}) => ({ id: 're_100', object: 'refund', amount: 2500, currency: 'eur', status: 'succeeded', payment_intent: 'pi_100', ...overrides })
const baseOrder = { id: 612, number: '612', status: 'processing', total: '93.00', currency: 'EUR', billing: { email: 'maria@example.com' }, meta_data: [{ key: 'meister_locale', value: 'en' }], refunds: [] }

function setup(overrides = {}) {
  const log = { sent: [], notes: [], created: [], claimed: new Set(), mapLookups: [], scans: [] }
  const deps = {
    orderIdForPayment: async pi => { log.mapLookups.push(pi); return 612 },
    orderIdByScan: async pi => { log.scans.push(pi); return null },
    getOrder: async () => ({ ...baseOrder, refunds: log.created.map((c, i) => ({ id: i + 1, total: `-${(c.amountCents / 100).toFixed(2)}` })) }),
    recordedRefundIds: async () => log.created.map(c => c.stripeRefundId),
    createWooRefund: async (orderId, r) => { log.created.push({ orderId, ...r }) },
    notify: {
      send: async m => { log.sent.push(m); return { ok: true, id: 'em' } },
      claim: async key => { if (log.claimed.has(key)) return false; log.claimed.add(key); return true },
      release: async key => { log.claimed.delete(key) },
      note: async (id, text) => { log.notes.push({ id, text }) },
      customerEmail: async () => undefined,
    },
    ...overrides,
  }
  return { log, deps }
}

test('a Stripe refund is recorded in WooCommerce and emailed once, as a partial refund', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const { log, deps } = setup()
    const result = await handleRefundCreated(refund(), deps)
    assert.deepEqual(result, { status: 'processed', orderId: 612, wooSynced: true, email: 'sent' })
    assert.deepEqual(log.created, [{ orderId: 612, stripeRefundId: 're_100', amountCents: 2500 }])
    assert.equal(log.sent.length, 1); assert.match(log.sent[0].html, /partial refund/); assert.match(log.sent[0].html, /€25\.00/)
    assert.deepEqual(await handleRefundCreated(refund(), deps), { status: 'duplicate' })
    assert.equal(log.created.length, 1); assert.equal(log.sent.length, 1)
  } finally { delete process.env.RESEND_API_KEY }
})
test('a full refund is announced as complete', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const { log, deps } = setup()
    await handleRefundCreated(refund({ amount: 9300 }), deps)
    assert.ok(!log.sent[0].html.includes('partial refund'))
  } finally { delete process.env.RESEND_API_KEY }
})
test('a redelivered event does not record or email the refund twice, even after the claim expired', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const { log, deps } = setup()
    await handleRefundCreated(refund(), deps)
    log.claimed.delete('refund:handled:re_100') // the handler claim expired; the email claim is still held
    const again = await handleRefundCreated(refund(), deps)
    assert.equal(again.status, 'processed'); assert.equal(log.created.length, 1, 'recorded refund ids prevent a second WooCommerce refund')
    assert.equal(log.sent.length, 1, 'the email claim and idempotency key prevent a second email')
  } finally { delete process.env.RESEND_API_KEY }
})
test('orders without a stored lookup are found by the slower search', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const { log, deps } = setup({ orderIdForPayment: async () => null, orderIdByScan: async () => 612 })
    assert.equal((await handleRefundCreated(refund(), deps)).status, 'processed')
    assert.equal(log.created.length, 1)
    const none = setup({ orderIdForPayment: async () => null })
    assert.deepEqual(await handleRefundCreated(refund(), none.deps), { status: 'order_not_found' })
  } finally { delete process.env.RESEND_API_KEY }
})
test('a WooCommerce sync failure still emails the customer and leaves a note', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const { log, deps } = setup({ createWooRefund: async () => { throw new Error('WooCommerce request failed: 400') } })
    const result = await handleRefundCreated(refund(), deps)
    assert.equal(result.wooSynced, false); assert.equal(log.sent.length, 1)
    assert.match(log.notes[0].text, /could not be recorded in WooCommerce/)
  } finally { delete process.env.RESEND_API_KEY }
})
test('an unreachable order lookup asks Stripe to retry and releases the claim', async () => {
  const { log, deps } = setup({ getOrder: async () => null })
  await assert.rejects(handleRefundCreated(refund(), deps))
  assert.equal(log.claimed.has('refund:handled:re_100'), false)
})
test('failed, foreign-currency and payment-less refunds are ignored', async () => {
  const { deps } = setup()
  for (const bad of [refund({ status: 'failed' }), refund({ status: 'canceled' }), refund({ currency: 'usd' }), refund({ payment_intent: null }), refund({ amount: 0 })]) {
    assert.equal((await handleRefundCreated(bad, deps)).status, 'ignored')
  }
})
