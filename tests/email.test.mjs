import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
const { extractTracking } = await import('../lib/email/tracking.ts')
const { buildOrderConfirmation, buildOrderCompleted } = await import('../lib/email/templates/customer.ts')
const { buildOwnerAlert } = await import('../lib/email/templates/owner.ts')
const { sendEmail } = await import('../lib/email/resend.ts')
const { notifyOrderCreated, notifyOrderCompleted } = await import('../lib/email/notify.ts')
const { handleOrderWebhook } = await import('../lib/woocommerce/order-webhook.ts')

const order = (overrides = {}) => ({
  id: 612, number: '612', status: 'processing', currency: 'EUR', date_created_gmt: '2026-11-18T09:30:00', customer_id: 0,
  total: '93.00', total_tax: '18.00', discount_total: '8.06', discount_tax: '1.94', shipping_total: '2.42', shipping_tax: '0.58', payment_method_title: 'Credit Card (Stripe)',
  billing: { first_name: 'Maria', last_name: 'Papadopoulou', email: 'maria@example.com', phone: '+302100000000' },
  shipping: { first_name: 'Maria', last_name: 'Papadopoulou', address_1: 'Leoforos 1', city: 'Athens', postcode: '10558', country: 'GR' },
  line_items: [{ name: 'Carbon <b>Fins</b>', quantity: 1, subtotal: '80.65', subtotal_tax: '19.35', total: '72.59', total_tax: '17.41', meta_data: [{ key: 'Size', value: 'M', display_key: 'Size', display_value: 'M' }, { key: '_internal', value: 'x' }] }],
  shipping_lines: [{ method_id: 'flat_rate', method_title: 'Courier delivery' }],
  coupon_lines: [{ code: 'TESTCOUPON' }],
  meta_data: [{ key: 'meister_locale', value: 'el' }],
  ...overrides,
})

test('tracking is read from custom fields and the shipment-tracking plugin, https links only', () => {
  assert.deepEqual(extractTracking(order()), [])
  const own = order({ meta_data: [{ key: 'meister_tracking_carrier', value: 'BOX NOW' }, { key: 'meister_tracking_number', value: 'BN123' }, { key: 'meister_tracking_url', value: 'https://boxnow.example/track?x=1' }] })
  assert.deepEqual(extractTracking(own), [{ carrier: 'BOX NOW', number: 'BN123', url: 'https://boxnow.example/track?x=1' }])
  const unsafe = order({ meta_data: [{ key: 'meister_tracking_number', value: 'A1' }, { key: 'meister_tracking_url', value: 'javascript:alert(1)' }] })
  assert.equal(extractTracking(unsafe)[0].url, undefined)
  const plugin = order({ meta_data: [{ key: '_wc_shipment_tracking_items', value: [{ tracking_provider: 'acs-courier', tracking_number: 'ACS9', formatted_tracking_link: 'https://acs.example/9' }, { tracking_number: '' }] }] })
  assert.deepEqual(extractTracking(plugin), [{ carrier: 'acs courier', number: 'ACS9', url: 'https://acs.example/9' }])
})

test('confirmation email shows items, discount, VAT-inclusive totals and escapes shopper and catalog text', () => {
  const mail = buildOrderConfirmation(order({ billing: { first_name: '<script>x</script>', email: 'a@b.co' } }), 'en')
  assert.equal(mail.subject, 'Order 612 confirmed — Meister & Meister Dive')
  assert.ok(!mail.html.includes('<script>') && !mail.html.includes('<b>Fins'), 'markup must be escaped')
  assert.ok(mail.html.includes('&lt;script&gt;'))
  assert.match(mail.html, /Discount \(TESTCOUPON\)/)
  assert.match(mail.html, /€100\.00/, 'gross items subtotal 80.65 + 19.35')
  assert.match(mail.html, /€93\.00/)
  assert.match(mail.html, /Includes VAT of €18\.00/)
  assert.match(mail.html, /Size: M/)
  assert.ok(!mail.html.includes('_internal'))
  assert.match(mail.text, /Total: €93\.00/)
  assert.match(mail.html, /not a tax invoice/)
})
test('confirmation email is Greek for Greek orders and states the BOX NOW pickup point', () => {
  const mail = buildOrderConfirmation(order({ meta_data: [{ key: '_boxnow_locker_name', value: 'BOX NOW Aigaleo' }, { key: '_boxnow_locker_address', value: 'Test 1' }] }), 'el')
  assert.equal(mail.subject, 'Επιβεβαίωση παραγγελίας 612 — Meister & Meister Dive')
  assert.match(mail.html, /Ευχαριστούμε για την παραγγελία σας/)
  assert.match(mail.html, /Σημείο παραλαβής/)
  assert.match(mail.html, /BOX NOW Aigaleo/)
  assert.match(mail.html, /lang="el"/)
  assert.match(mail.html, /93,00/)
})
test('completed email carries tracking and transit details, or says ready for pickup for store pickup', () => {
  const shipped = order({ status: 'completed', meta_data: [{ key: 'meister_tracking_carrier', value: 'ACS' }, { key: 'meister_tracking_number', value: 'ACS42' }, { key: 'meister_tracking_url', value: 'https://acs.example/42' }] })
  const mail = buildOrderCompleted(shipped, 'en')
  assert.equal(mail.subject, 'Your order 612 is on its way')
  assert.match(mail.html, /ACS/); assert.match(mail.html, /Tracking number: ACS42/); assert.match(mail.html, /href="https:\/\/acs\.example\/42"/)
  assert.match(mail.text, /https:\/\/acs\.example\/42/)
  assert.equal(buildOrderCompleted(order(), 'en').html.includes('Tracking number'), false, 'no tracking section when none exists')
  const pickup = buildOrderCompleted(order({ shipping_lines: [{ method_id: 'local_pickup', method_title: 'Store pickup' }] }), 'en')
  assert.equal(pickup.subject, 'Your order 612 is ready for pickup')
  assert.match(pickup.html, /Leoforos Athinon 387/)
  assert.equal(buildOrderCompleted(shipped, 'el').subject, 'Η παραγγελία σας 612 είναι καθ’ οδόν')
})
test('owner alert summarises the order', () => {
  const mail = buildOwnerAlert(order())
  assert.equal(mail.subject, 'New order 612 — €93.00')
  assert.match(mail.html, /maria@example\.com/); assert.match(mail.html, /TESTCOUPON/)
})
test('templates survive a sparse order payload', () => {
  for (const sparse of [{ id: 7 }, { id: 7, line_items: [{}], billing: {} }]) {
    assert.doesNotThrow(() => { buildOrderConfirmation(sparse, 'en'); buildOrderCompleted(sparse, 'el'); buildOwnerAlert(sparse) })
  }
})

test('Resend client sends the documented request and never throws', async () => {
  const original = globalThis.fetch
  const sent = []
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    globalThis.fetch = async (url, init) => { sent.push({ url: String(url), init }); return Response.json({ id: 'em_1' }) }
    const ok = await sendEmail({ to: 'a@b.co', subject: 'S', html: '<p>h</p>', text: 't', idempotencyKey: 'order-created-1' })
    assert.deepEqual(ok, { ok: true, id: 'em_1' })
    const body = JSON.parse(sent[0].init.body)
    assert.equal(sent[0].url, 'https://api.resend.com/emails')
    assert.equal(sent[0].init.headers.Authorization, 'Bearer re_fixture')
    assert.equal(sent[0].init.headers['Idempotency-Key'], 'order-created-1')
    assert.deepEqual(body.to, ['a@b.co']); assert.deepEqual(body.reply_to, ['info@dive-meister.com'])
    assert.match(body.from, /@orders\.meister\.gr>$/)
    globalThis.fetch = async () => new Response('{}', { status: 422 })
    assert.deepEqual(await sendEmail({ to: 'a@b.co', subject: 'S', html: 'h', text: 't' }), { ok: false, error: 'Resend responded 422' })
    globalThis.fetch = async () => { throw new TypeError('network') }
    assert.deepEqual(await sendEmail({ to: 'a@b.co', subject: 'S', html: 'h', text: 't' }), { ok: false, error: 'TypeError' })
    delete process.env.RESEND_API_KEY
    assert.equal((await sendEmail({ to: 'a@b.co', subject: 'S', html: 'h', text: 't' })).skipped, true)
  } finally { globalThis.fetch = original; delete process.env.RESEND_API_KEY }
})

function fakeDeps(overrides = {}) {
  const state = { sent: [], claimed: new Set(), notes: [], released: [] }
  return { state, deps: {
    send: async message => { state.sent.push(message); return { ok: true, id: 'em' } },
    claim: async key => { if (state.claimed.has(key)) return false; state.claimed.add(key); return true },
    release: async key => { state.claimed.delete(key); state.released.push(key) },
    note: async (id, text) => { state.notes.push({ id, text }) },
    customerEmail: async () => 'account@example.com',
    ...overrides,
  } }
}
test('order creation emails the customer and the owner exactly once, in the order language', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const { state, deps } = fakeDeps()
    assert.deepEqual(await notifyOrderCreated(order(), { locale: 'el' }, deps), { customer: 'sent', owner: 'sent' })
    const customer = state.sent.find(m => m.to === 'maria@example.com'); const owner = state.sent.find(m => m.to === 'info@dive-meister.com')
    assert.match(customer.subject, /Επιβεβαίωση παραγγελίας 612/); assert.equal(customer.idempotencyKey, 'order-created-612')
    assert.match(owner.subject, /New order 612/)
    assert.deepEqual(await notifyOrderCreated(order(), { locale: 'el' }, deps), { customer: 'duplicate', owner: 'duplicate' })
    assert.equal(state.sent.length, 2)
  } finally { delete process.env.RESEND_API_KEY }
})
test('a logged-in order without a billing email uses Stripe, then the WooCommerce account email', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const noEmail = order({ billing: { first_name: 'Maria' }, customer_id: 9 })
    let { state, deps } = fakeDeps()
    await notifyOrderCreated(noEmail, { fallbackEmail: 'stripe@example.com' }, deps)
    assert.ok(state.sent.some(m => m.to === 'stripe@example.com'))
    ;({ state, deps } = fakeDeps())
    await notifyOrderCreated(noEmail, {}, deps)
    assert.ok(state.sent.some(m => m.to === 'account@example.com'))
    ;({ state, deps } = fakeDeps({ customerEmail: async () => undefined }))
    assert.equal((await notifyOrderCreated(noEmail, {}, deps)).customer, 'skipped')
    assert.match(state.notes[0].text, /no valid email address/)
  } finally { delete process.env.RESEND_API_KEY }
})
test('a failed send leaves a note, frees the claim for retry, and never throws', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const { state, deps } = fakeDeps({ send: async () => ({ ok: false, error: 'Resend responded 500' }) })
    const result = await notifyOrderCreated(order(), {}, deps)
    assert.deepEqual(result, { customer: 'failed', owner: 'failed' })
    assert.equal(state.notes.length, 2); assert.match(state.notes[0].text, /Resend responded 500/)
    assert.equal(state.claimed.size, 0)
    const thrown = fakeDeps({ send: async () => { throw new Error('boom') } })
    assert.equal((await notifyOrderCompleted(order({ status: 'completed' }), thrown.deps)), 'failed')
  } finally { delete process.env.RESEND_API_KEY }
})
test('nothing is sent or claimed without an API key', async () => {
  delete process.env.RESEND_API_KEY
  const { state, deps } = fakeDeps()
  assert.deepEqual(await notifyOrderCreated(order(), {}, deps), { customer: 'skipped', owner: 'skipped' })
  assert.equal(await notifyOrderCompleted(order(), deps), 'skipped')
  assert.equal(state.sent.length + state.claimed.size, 0)
})
test('completed email is sent once, using the language stored on the order', async () => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    const { state, deps } = fakeDeps()
    assert.equal(await notifyOrderCompleted(order({ status: 'completed' }), deps), 'sent')
    assert.match(state.sent[0].subject, /Η παραγγελία σας 612/)
    assert.equal(await notifyOrderCompleted(order({ status: 'completed' }), deps), 'duplicate')
  } finally { delete process.env.RESEND_API_KEY }
})

const secret = 'whsec_order_fixture'
const delivery = (body, { signature, resource = 'order', event = 'updated' } = {}) => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  return new Request('https://store.example/api/webhooks/woocommerce/orders', { method: 'POST', body: raw, headers: {
    'content-type': 'application/json', 'x-wc-webhook-resource': resource, 'x-wc-webhook-event': event,
    'x-wc-webhook-signature': signature ?? createHmac('sha256', secret).update(raw).digest('base64'),
  } })
}
test('order webhook verifies the signature and emails only completed orders', async () => {
  const completed = []
  const deps = { secret, onCompleted: async o => { completed.push(o.id) } }
  assert.equal((await handleOrderWebhook(delivery({ id: 5, status: 'completed' }, { signature: 'x'.repeat(43) + '=' }), deps)).status, 401)
  assert.equal((await handleOrderWebhook(delivery({ id: 5, status: 'processing' }), deps)).status, 200)
  assert.equal(completed.length, 0)
  assert.equal((await handleOrderWebhook(delivery({ id: 5, status: 'completed' }), deps)).status, 200)
  assert.deepEqual(completed, [5])
  assert.equal((await handleOrderWebhook(delivery({ id: 5, status: 'completed' }, { resource: 'product' }), deps)).status, 400)
  assert.equal((await handleOrderWebhook(delivery({ id: 'x', status: 'completed' }), deps)).status, 400)
  assert.equal((await handleOrderWebhook(delivery('not json'), deps)).status, 400)
  assert.equal((await handleOrderWebhook(delivery({ id: 5, status: 'completed' }), { ...deps, secret: '' })).status, 503)
})
test('order webhook acknowledges a delivery even when the email step fails, and accepts the activation ping', async () => {
  const deps = { secret, onCompleted: async () => { throw new Error('boom') } }
  assert.equal((await handleOrderWebhook(delivery({ id: 5, status: 'completed' }), deps)).status, 200)
  const ping = new Request('https://store.example/x', { method: 'POST', body: 'webhook_id=12', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  assert.equal((await handleOrderWebhook(ping, deps)).status, 200)
})
