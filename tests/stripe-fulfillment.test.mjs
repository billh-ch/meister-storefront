import { registerHooks } from 'node:module'
registerHooks({ resolve(specifier, context, next) {
  return next(specifier === 'next/server' ? 'next/server.js' : specifier, context)
} })
import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'

process.env.STRIPE_SECRET_KEY = 'sk_test_fixture'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture'
process.env.KV_REST_API_URL = 'https://redis.fixture.example'
process.env.KV_REST_API_TOKEN = 'fixture-token'
process.env.NEXT_PUBLIC_WC_URL = 'https://woo.fixture.example'
process.env.WC_CONSUMER_KEY = 'fixture-key'
process.env.WC_CONSUMER_SECRET = 'fixture-secret'
process.env.WC_PROXY_TOKEN = 'fixture-proxy'
const { POST } = await import('../app/api/webhooks/stripe/route.ts')
const stripe = new Stripe('sk_test_fixture')
let sequence = 0
function paidRequest(pi, overrides = {}) {
  const session = { id: `cs_test_${sequence++}`, object: 'checkout.session', mode: 'payment', created: 1780000000, payment_status: 'paid', payment_intent: pi, metadata: {
    wcCustomerId: '', cartLines: JSON.stringify([{ p: '501', q: 1, a: { Size: 'M' } }]),
    ship_first_name: 'Fixture', ship_last_name: 'Customer', ship_address1: 'Test 1', ship_city: 'Athens', ship_postcode: '10558', ship_country: 'GR', ship_email: 'fixture@example.com',
    shippingMethodId: 'flat_rate', shippingMethodTitle: 'Delivery', shippingCost: '3',
  }, ...overrides }
  const body = JSON.stringify({ id: `evt_fixture_${sequence}`, object: 'event', type: 'checkout.session.completed', livemode: false, data: { object: session } })
  return new Request('https://store.fixture.example/api/webhooks/stripe', { method: 'POST', body, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fixture' }) } })
}
async function withBackend(run) {
  const originalFetch = globalThis.fetch
  const db = { emails: [], resendFails: false, notes: [], rejectCoupon: false, orderTotal: '323.00', redis: new Map(), orders: [], redisDown: false, failMapping: false, ambiguousWrite: false, pendingOrder: null, writes: 0, omitPaginationHeaders: false }
  function command([name, key, value, ...flags]) {
    switch (String(name).toLowerCase()) {
      case 'get': return db.redis.get(key) ?? null
      case 'set':
        if (db.failMapping && key.startsWith('stripe:order:')) throw new Error('Redis write interrupted')
        if (flags.map(String).some(f => f.toLowerCase() === 'nx') && db.redis.has(key)) return null
        db.redis.set(key, value); return 'OK'
      case 'del': return db.redis.delete(key) ? 1 : 0
      case 'eval': {
        // Compare-and-delete/expire scripts must only affect their owner's lock.
        const [lockKey, owner] = flags
        if (db.redis.get(lockKey) === owner) {
          if (key.includes("'SET'")) { db.redis.set(lockKey, 'done'); return 'OK' }
          return db.redis.delete(lockKey) ? 1 : 0
        }
        return 0
      }
      default: throw new Error(`Unexpected Redis command ${name}`)
    }
  }
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    if (url.hostname === 'redis.fixture.example') {
      if (db.redisDown) return Response.json({ error: 'unavailable' }, { status: 503 })
      const body = JSON.parse(init.body)
      const execute = cmd => { try {
        const result = command(cmd)
        const encoded = String(cmd[0]).toLowerCase() === 'get' && typeof result === 'string' && new Headers(init.headers).get('upstash-encoding') === 'base64'
        return { result: encoded ? Buffer.from(result).toString('base64') : result }
      } catch { return { error: 'interrupted' } } }
      return Response.json(Array.isArray(body[0]) ? body.map(execute) : execute(body))
    }
    if (url.hostname === 'api.resend.com') {
      if (db.resendFails) return new Response('{}', { status: 500 })
      db.emails.push({ headers: init.headers, body: JSON.parse(init.body) })
      return Response.json({ id: `em_fixture_${db.emails.length}` })
    }
    assert.equal(url.hostname, 'woo.fixture.example')
    assert.equal(new Headers(init.headers).get('X-Meister-API-Key'), 'fixture-proxy')
    assert.equal(init.cache, 'no-store')
    if (init.method === 'POST' && url.pathname.endsWith('/notes')) {
      db.notes.push(JSON.parse(init.body))
      return Response.json({ id: 1 }, { status: 201 })
    }
    if (init.method === 'POST') {
      const input = JSON.parse(init.body)
      if (db.rejectCoupon && input.coupon_lines) return Response.json({ code: 'woocommerce_rest_invalid_coupon' }, { status: 400, statusText: 'Bad Request' })
      db.writes++
      const order = { ...input, id: 440 + db.writes, number: String(440 + db.writes), total: db.orderTotal }
      if (db.ambiguousWrite) { db.pendingOrder = order; throw new DOMException('Timed out', 'TimeoutError') }
      db.orders.push(order)
      return Response.json(order, { status: 201 })
    }
    const page = Number(url.searchParams.get('page') ?? 1)
    const rows = db.orders.slice((page - 1) * 100, page * 100)
    return Response.json(rows, { headers: db.omitPaginationHeaders === 'pages'
      ? { 'X-WP-Total': String(db.orders.length) }
      : db.omitPaginationHeaders ? {} : { 'X-WP-TotalPages': String(Math.ceil(db.orders.length / 100) || 1) } })
  }
  try { await run(db) } finally { globalThis.fetch = originalFetch }
}

test('an overlapping paid webhook remains retryable until an order is confirmed', async () => withBackend(async db => {
  db.redis.set('stripe:pi:pi_fixture_overlap', 'processing')
  const response = await POST(paidRequest('pi_fixture_overlap'))
  assert.equal(response.status, 503)
  assert.equal(db.orders.length, 0)
}))
test('Redis failure returns a retryable response instead of escaping the handler', async () => withBackend(async db => {
  db.redisDown = true
  const response = await POST(paidRequest('pi_fixture_redis'))
  assert.equal(response.status, 503)
  assert.equal((await response.json()).stage, 'lock')
  assert.equal(db.orders.length, 0)
}))
test('a retry after Woo success and Redis failure reuses the original order', async () => withBackend(async db => {
  db.failMapping = true
  const first = await POST(paidRequest('pi_fixture_recovery'))
  assert.equal(first.status, 503)
  assert.equal(db.orders.length, 1)
  db.failMapping = false
  const second = await POST(paidRequest('pi_fixture_recovery'))
  assert.equal(second.status, 200)
  assert.equal(db.orders.length, 1, 'One paid payment must create only one WooCommerce order')
  const result = await second.json()
  assert.equal(result.orderId, db.orders[0].id)
}))
test('a verified paid webhook creates a paid guest order with delivery and all choices', async () => withBackend(async db => {
  const response = await POST(paidRequest('pi_fixture_success'))
  assert.equal(response.status, 200)
  assert.equal(db.orders.length, 1)
  const order = db.orders[0]
  assert.equal(order.set_paid, true)
  assert.equal(order.customer_id, 0)
  assert.equal(order.transaction_id, 'pi_fixture_success')
  assert.deepEqual(order.line_items[0].meta_data, [{ key: 'Size', value: 'M' }])
  assert.equal(order.shipping_lines[0].total, '3')
  assert.equal(order.billing.email, 'fixture@example.com')
  assert.equal((await POST(paidRequest('pi_fixture_success'))).status, 200)
  assert.equal(db.orders.length, 1)
}))
test('a paid BOX NOW session saves the selected locker on its WooCommerce order', async () => withBackend(async db => {
  const { lockerToStripeMetadata } = await import('../lib/checkout/box-now.ts')
  const locker = { id: '3', name: 'BOX NOW Test locker', address: 'Test Street 144', postcode: '18545', country: 'GR' }
  const request = paidRequest('pi_fixture_boxnow')
  const event = await request.json()
  Object.assign(event.data.object.metadata, { shippingMethodId: 'box_now_delivery', shippingMethodTitle: 'BOX NOW', ...lockerToStripeMetadata(locker) })
  const body = JSON.stringify(event)
  const response = await POST(new Request(request.url, { method: 'POST', body, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fixture' }) } }))
  assert.equal(response.status, 200)
  const order = db.orders[0]
  assert.equal(order.shipping_lines[0].method_id, 'box_now_delivery')
  assert.deepEqual(order.meta_data, [
    { key: '_boxnow_locker_id', value: '3' },
    { key: '_boxnow_locker_name', value: locker.name },
    { key: '_boxnow_locker_address', value: locker.address },
    { key: '_boxnow_locker_postal_code', value: locker.postcode },
  ])
  assert.equal(order.billing.address_1, 'Test 1', 'Locker selection keeps customer billing details')
}))
test('an ambiguous Woo write keeps retries waiting until the original order can be reconciled', async () => withBackend(async db => {
  db.ambiguousWrite = true
  assert.equal((await POST(paidRequest('pi_fixture_timeout'))).status, 503)
  assert.equal((await POST(paidRequest('pi_fixture_timeout'))).status, 503)
  assert.equal(db.writes, 1, 'A timed-out Woo POST may still be committing')
  db.orders.push(db.pendingOrder)
  db.ambiguousWrite = false
  db.redis.delete('stripe:pi:pi_fixture_timeout') // Ten-minute lease expires after the delayed commit.
  assert.equal((await POST(paidRequest('pi_fixture_timeout'))).status, 200)
  assert.equal(db.writes, 1)
}))
for (const headerMode of ['all', 'pages']) test(`reconciliation continues across a full page when a proxy omits ${headerMode} pagination headers`, async () => withBackend(async db => {
  db.omitPaginationHeaders = headerMode
  db.orders = Array.from({length: 100}, (_, i) => ({id: i + 1, number: String(i + 1), transaction_id: 'pi_other_' + i}))
  db.orders.push({id: 777, number: '777', transaction_id: 'pi_fixture_page'})
  const response = await POST(paidRequest('pi_fixture_page'))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).orderId, 777)
  assert.equal(db.writes, 0)
}))
test('unpaid sessions never create orders and invalid signatures are rejected', async () => withBackend(async db => {
  assert.equal((await POST(paidRequest('pi_fixture_unpaid', {payment_status: 'unpaid'}))).status, 200)
  const request = paidRequest('pi_fixture_invalid')
  request.headers.set('stripe-signature', 't=0,v1=invalid')
  assert.equal((await POST(request)).status, 400)
  assert.equal(db.writes, 0)
}))
test('paid signed-in sessions attach the WooCommerce order to the customer account', async () => withBackend(async db => {
  const response = await POST(paidRequest('pi_fixture_customer', {metadata: {wcCustomerId: '6', cartLines: '[{"p":"2698","q":1,"a":{"Μέγεθος":"M"}}]', ship_country: 'GR'}}))
  assert.equal(response.status, 200)
  assert.equal(db.orders[0].customer_id, 6)
  assert.deepEqual(db.orders[0].line_items[0].meta_data, [{key: 'Μέγεθος', value: 'M'}])
}))

function couponRequest(pi, amountTotal) {
  const request = paidRequest(pi)
  return request.json().then(event => {
    Object.assign(event.data.object, { amount_total: amountTotal })
    Object.assign(event.data.object.metadata, { couponCode: 'TESTCOUPON', couponDiscount: '10' })
    const body = JSON.stringify(event)
    return new Request(request.url, { method: 'POST', body, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fixture' }) } })
  })
}
test('a discounted paid session sends the native coupon to WooCommerce and stays quiet when totals agree', async () => withBackend(async db => {
  assert.equal((await POST(await couponRequest('pi_fixture_coupon', 32300))).status, 200)
  assert.deepEqual(db.orders[0].coupon_lines, [{ code: 'TESTCOUPON' }])
  assert.equal(db.orders[0].fee_lines, undefined)
  assert.equal(db.notes.length, 0)
}))
test('a discounted order whose Woo total differs from the Stripe charge is flagged for review, not blocked', async () => withBackend(async db => {
  db.orderTotal = '322.99'
  assert.equal((await POST(await couponRequest('pi_fixture_coupon_mismatch', 32300))).status, 200)
  assert.equal(db.orders.length, 1)
  assert.equal(db.notes.length, 1)
  assert.match(db.notes[0].note, /TESTCOUPON/)
  assert.equal(db.notes[0].customer_note, false)
}))
test('if Woo refuses the coupon after payment the order is still created at the paid price', async () => withBackend(async db => {
  db.rejectCoupon = true
  assert.equal((await POST(await couponRequest('pi_fixture_coupon_rejected', 32300))).status, 200)
  assert.equal(db.orders.length, 1)
  assert.equal(db.orders[0].coupon_lines, undefined)
  assert.deepEqual(db.orders[0].fee_lines, [{ name: 'Discount code TESTCOUPON', total: '-10.00', tax_status: 'none' }])
  assert.match(db.orders[0].meta_data.find(entry => entry.key === 'meister_coupon_fallback').value, /TESTCOUPON/)
}))
test('an undiscounted paid session is unchanged by the coupon feature', async () => withBackend(async db => {
  assert.equal((await POST(paidRequest('pi_fixture_no_coupon'))).status, 200)
  assert.equal(db.orders[0].coupon_lines, undefined)
  assert.equal(db.notes.length, 0)
}))

function addonRequest(pi, amountTotal, { coupon = false, o = 'camo:full,extras:knee-pads' } = {}) {
  const request = paidRequest(pi)
  return request.json().then(event => {
    Object.assign(event.data.object, { amount_total: amountTotal })
    event.data.object.metadata.cartLines = JSON.stringify([{ p: '501', v: '502', q: 1, a: { Size: 'M' }, o }])
    if (coupon) Object.assign(event.data.object.metadata, { couponCode: 'TESTCOUPON', couponDiscount: '10' })
    const body = JSON.stringify(event)
    return new Request(request.url, { method: 'POST', body, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fixture' }) } })
  })
}
test('a paid add-on line sends only the add-on ids to WooCommerce, never a price', async () => withBackend(async db => {
  assert.equal((await POST(await addonRequest('pi_fixture_addons', 32300))).status, 200)
  const item = db.orders[0].line_items[0]
  assert.deepEqual(item.meta_data, [{ key: 'Size', value: 'M' }, { key: '_meister_addons', value: 'camo:full,extras:knee-pads' }])
  for (const field of ['price', 'subtotal', 'total']) assert.equal(item[field], undefined, field)
  assert.equal(db.notes.length, 0, 'WooCommerce total agrees with the Stripe charge')
}))
test('an add-on order whose Woo total differs from the Stripe charge is flagged even without a coupon', async () => withBackend(async db => {
  db.orderTotal = '258.00'
  assert.equal((await POST(await addonRequest('pi_fixture_addons_mismatch', 32300))).status, 200)
  assert.equal(db.orders.length, 1, 'never blocked: the customer has paid')
  assert.equal(db.notes.length, 1)
  assert.match(db.notes[0].note, /Stripe charged €323\.00 but WooCommerce computed €258\.00 .*product add-ons/)
  assert.equal(db.notes[0].customer_note, false)
}))
test('add-ons with a coupon are checked once against the discounted Stripe charge', async () => withBackend(async db => {
  assert.equal((await POST(await addonRequest('pi_fixture_addons_coupon', 32300, { coupon: true }))).status, 200)
  assert.deepEqual(db.orders[0].coupon_lines, [{ code: 'TESTCOUPON' }])
  assert.equal(db.notes.length, 0)
  db.orderTotal = '333.00'
  assert.equal((await POST(await addonRequest('pi_fixture_addons_coupon_2', 32300, { coupon: true }))).status, 200)
  assert.match(db.notes[0].note, /discount code TESTCOUPON and product add-ons/)
}))
test('malformed add-on metadata is refused before any order is written', async () => withBackend(async db => {
  for (const o of ['camo:full,camo:full', 'CAMO:full', '']) {
    const response = await POST(await addonRequest(`pi_fixture_addons_bad_${o.length}`, 32300, { o }))
    assert.equal(response.status, 503, o)
  }
  assert.equal(db.orders.length, 0)
}))

function localizedRequest(pi, locale) {
  const request = paidRequest(pi)
  return request.json().then(event => {
    event.data.object.metadata.locale = locale
    const body = JSON.stringify(event)
    return new Request(request.url, { method: 'POST', body, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fixture' }) } })
  })
}
test('a paid order emails the customer and the owner, remembers the language, and a retry does not email again', async () => withBackend(async db => {
  process.env.RESEND_API_KEY = 're_fixture'
  try {
    assert.equal((await POST(await localizedRequest('pi_fixture_email', 'el'))).status, 200)
    assert.deepEqual(db.emails.map(email => email.body.to[0]).sort(), ['fixture@example.com', 'info@dive-meister.com'])
    assert.match(db.emails.find(email => email.body.to[0] === 'fixture@example.com').body.subject, /Επιβεβαίωση παραγγελίας/)
    assert.deepEqual(db.orders[0].meta_data, [{ key: 'meister_locale', value: 'el' }])
    assert.equal((await POST(await localizedRequest('pi_fixture_email', 'el'))).status, 200)
    assert.equal(db.emails.length, 2, 'A webhook retry must not send another email')
  } finally { delete process.env.RESEND_API_KEY }
}))
test('an email outage never blocks or fails the order, and is noted on it', async () => withBackend(async db => {
  process.env.RESEND_API_KEY = 're_fixture'
  db.resendFails = true
  try {
    assert.equal((await POST(paidRequest('pi_fixture_email_down'))).status, 200)
    assert.equal(db.orders.length, 1)
    assert.ok(db.notes.some(entry => /could not be sent/.test(entry.note)))
  } finally { delete process.env.RESEND_API_KEY }
}))

test('the paid-order webhook remembers which WooCommerce order a payment belongs to, for later refunds', async () => withBackend(async db => {
  const response = await POST(paidRequest('pi_fixture_lookup'))
  assert.equal(response.status, 200)
  assert.equal(db.redis.get('stripe:order-by-pi:pi_fixture_lookup'), String(db.orders[0].id))
}))
test('unrelated Stripe event types are acknowledged without touching WooCommerce', async () => withBackend(async db => {
  const body = JSON.stringify({ id: 'evt_other', object: 'event', type: 'charge.succeeded', livemode: false, data: { object: { id: 'ch_1' } } })
  const response = await POST(new Request('https://store.fixture.example/api/webhooks/stripe', { method: 'POST', body, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fixture' }) } }))
  assert.equal(response.status, 200); assert.equal(db.orders.length, 0)
}))
