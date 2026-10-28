import './helpers/typescript-imports.mjs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'

// Execute the real session route/action while replacing only the session,
// cart/backend and payment provider boundaries. Locker validation and metadata
// construction remain real. Nothing contacts Stripe or creates an order.
const modules = {
  "@/lib/i18n/server": "export const getTranslator = async () => source => source",
  '@/lib/auth/session': 'export const getSession = async () => globalThis.boxNowSessionFixture.session ?? {}',
  '@/lib/cart/cookie': 'export const getCart = async () => []',
  '@/lib/cart/resolve': 'export const resolveCartItems = async () => globalThis.boxNowSessionFixture.cart',
  '@/lib/stripe': 'export const getStripe = () => globalThis.boxNowSessionFixture.stripe',
  '@/lib/url': 'export const getBaseUrl = () => "https://store.fixture.example"',
  '@/lib/woocommerce/queries/update-customer-address': 'export const updateWcCustomerAddress = async () => {}',
}
registerHooks({ resolve(specifier, context, next) {
  let source = modules[specifier]
  if (context.parentURL?.endsWith('/lib/checkout/actions.ts') && specifier === './shipping') source = 'export const quoteResolvedCart = async () => globalThis.boxNowSessionFixture.quote'
  if (context.parentURL?.endsWith('/lib/checkout/actions.ts') && specifier === './get-shipping-quote') source = 'export const getShippingQuote = async () => globalThis.boxNowSessionFixture.quote'
  return source ? { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true } : next(specifier, context)
} })
process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'false'
const { createCheckoutSessionAction, getShippingMethodsAction } = await import('../lib/checkout/actions.ts')
const { POST } = await import('../app/api/checkout/session/route.ts')
const { checkoutCartSignature } = await import('../lib/checkout/model.ts')
const line = { productId: '501', quantity: 1, unitPrice: 80, name: 'Fixture fins', attributes: {}, variantAttributes: {}, purchasable: true }
const address = { email: 'qa@fixture.invalid', firstName: 'Test', lastName: 'Customer', address1: 'Billing Street 1', city: 'Athens', postcode: '10558', phone: '+302100000000', country: 'GR' }
async function fixture(methodId, run) {
  const original = globalThis.fetch
  const state = { sessions: [], lookups: 0 }
  const id = `${methodId}:3`
  globalThis.boxNowSessionFixture = {
    cart: { lines: [line], unavailableCount: 0, subtotal: 80 },
    quote: { status: 'ready', methods: [{ id, wcMethodId: methodId, title: methodId === 'box_now_delivery' ? 'BOX NOW' : 'Courier', cost: 2, isPickup: false }], cartSignature: checkoutCartSignature([line]) },
    stripe: { checkout: { sessions: { create: async input => { state.sessions.push(input); return { url: 'https://checkout.stripe.com/fixture' } } } } },
  }
  globalThis.fetch = async url => {
    state.lookups++
    assert.equal(String(url), 'https://globallockersprod.z28.web.core.windows.net/PROD/greece/lockers/3.json')
    return Response.json({ id: '3', name: 'Canonical locker', addressLine1: 'Canonical Street 144', postalCode: '18545', country: 'GR' })
  }
  const request = (locker, locale) => new Request('https://store.fixture.example/api/checkout/session', { method: 'POST', headers: { Origin: 'https://store.fixture.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(locale !== undefined ? { locale } : {}), address, deliveryMethodId: id, expected: { cartSignature: checkoutCartSignature([line]), shippingCost: 2 }, ...(locker ? { boxNowLocker: locker } : {}) }) })
  try { await run(state, request) }
  finally { globalThis.fetch = original; delete globalThis.boxNowSessionFixture }
}
test('the real session route verifies BOX NOW and passes canonical details into Stripe', async () => fixture('box_now_delivery', async (state, request) => {
  const response = await POST(request({ id: '3', name: 'Forged name', address: 'Forged address' }))
  assert.deepEqual(await response.json(), { url: 'https://checkout.stripe.com/fixture' })
  assert.equal(state.lookups, 1)
  assert.equal(state.sessions.length, 1)
  const session = state.sessions[0]
  assert.equal(session.metadata.boxnow_locker_id, '3')
  assert.equal(session.metadata.boxnow_locker_name, 'Canonical locker')
  assert.equal(session.metadata.boxnow_locker_address, 'Canonical Street 144')
  assert.equal(session.metadata.boxnow_locker_postcode, '18545')
  assert.equal(session.metadata.boxnow_locker_country, 'GR')
  assert.equal(session.metadata.ship_address1, address.address1, 'Billing/customer address is retained')
  assert.equal(session.metadata.shippingMethodId, 'box_now_delivery')
  assert.equal(session.line_items.at(-1).price_data.unit_amount, 200, 'WooCommerce supplies the shipping price')
}))
test('missing selection and public-directory outages cannot create a payment session', async () => fixture('box_now_delivery', async (state, request) => {
  assert.match((await (await POST(request())).json()).error, /select.*locker/i)
  globalThis.fetch = async () => { throw new Error('Directory offline') }
  assert.match((await (await POST(request({ id: '3' }))).json()).error, /verify.*locker/i)
  assert.equal(state.sessions.length, 0)
}))
test('courier checkout ignores old locker data and never depends on BOX NOW', async () => fixture('flat_rate', async (state, request) => {
  assert.deepEqual(await (await POST(request({ id: '3' }))).json(), { url: 'https://checkout.stripe.com/fixture' })
  assert.equal(state.lookups, 0)
  assert.equal(state.sessions.length, 1)
  assert.equal(state.sessions[0].metadata.boxnow_locker_id, undefined)
}))

for (const locale of ['en', 'el']) for (const signedIn of [false, true]) {
  test(`checkout locale ${locale} preserves identity/pricing for ${signedIn ? 'account' : 'guest'}`, async () => fixture('box_now_delivery', async (state, request) => {
    globalThis.boxNowSessionFixture.session = signedIn ? { wcCustomerId: 901 } : {}
    const original = structuredClone(line)
    line.attributes = { Options: 'S', Colour: 'Carbon Black' }
    line.variantAttributes = { Options: 'S' }
    try {
      const response = await POST(request({ id: '3' }, locale))
      assert.equal(response.status, 200)
      const session = state.sessions[0]
      const prefix = locale === 'el' ? '/el' : ''
      assert.equal(session.locale, locale)
      assert.equal(session.metadata.locale, locale)
      assert.equal(session.success_url, `https://store.fixture.example${prefix}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`)
      assert.equal(session.cancel_url, `https://store.fixture.example${prefix}/checkout`)
      assert.equal(session.metadata.wcCustomerId, signedIn ? '901' : '')
      assert.deepEqual(JSON.parse(session.metadata.cartLines), [{ p: '501', q: 1, a: { Colour: 'Carbon Black' } }])
      assert.equal(session.line_items[0].price_data.unit_amount, 8000)
      assert.equal(session.line_items[0].quantity, 1)
      assert.equal(session.line_items[0].price_data.product_data.name, locale === 'el' ? 'Fixture fins (Χαρακτηριστικά: S, Χρώμα: Carbon Black)' : 'Fixture fins (Options: S, Colour: Carbon Black)')
      assert.equal(session.line_items.at(-1).price_data.unit_amount, 200)
      assert.equal(session.metadata.boxnow_locker_address, 'Canonical Street 144')
      assert.deepEqual(line.attributes, { Options: 'S', Colour: 'Carbon Black' })
    } finally { Object.assign(line, original) }
  }))
}
test('legacy checkout defaults to English and explicit malformed locales cannot create sessions', async () => fixture('flat_rate', async (state, request) => {
  await POST(request())
  assert.equal(state.sessions[0].locale, 'en')
  for (const value of ['gr', 'EL', '', null, 123, ['el']]) {
    const response = await POST(request(undefined, value))
    assert.equal(response.status, 400)
  }
  assert.equal(state.sessions.length, 1)
}))
test('Greek checkout failures are localized before they reach the browser', async () => fixture('box_now_delivery', async (state, request) => {
  const response = await POST(request(undefined, 'el'))
  assert.equal((await response.json()).error, 'Επιλέξτε θυρίδα BOX NOW πριν συνεχίσετε στην πληρωμή.')
  assert.equal(state.sessions.length, 0)
}))

test('direct checkout action retains the legacy argument positions and rejects malformed locale', async () => fixture('flat_rate', async (state) => {
  const expected = { cartSignature: checkoutCartSignature([line]), shippingCost: 2 }
  assert.deepEqual(await createCheckoutSessionAction(address, 'flat_rate:3', expected), { url: 'https://checkout.stripe.com/fixture' })
  assert.equal(state.sessions[0].locale, 'en')
  assert.deepEqual(await createCheckoutSessionAction(address, 'flat_rate:3', expected, undefined, 'gr'), { error: 'Invalid language selection.' })
  assert.equal(state.sessions.length, 1)
}))
test('legacy delivery action reports invalid address using customer validation copy', async () => fixture('flat_rate', async () => {
  await assert.rejects(getShippingMethodsAction({ country: 'ZZ' }), { message: 'Please check your delivery country and address.' })
}))

for (const [locale, message] of [
  ['en', 'Payments are currently unavailable. Please try again later.'],
  ['el', 'Οι πληρωμές δεν είναι διαθέσιμες αυτήν τη στιγμή. Δοκιμάστε ξανά αργότερα.'],
]) {
  test(`disabled payments block both checkout entry points before customer/backend access (${locale})`, async () => fixture('flat_rate', async (state, request) => {
    const previous = process.env.CHECKOUT_PAYMENTS_ENABLED
    process.env.CHECKOUT_PAYMENTS_ENABLED = 'false'
    let sessionReads = 0
    Object.defineProperty(globalThis.boxNowSessionFixture, 'session', { get() { sessionReads++; return { wcCustomerId: 901 } } })
    try {
      assert.deepEqual(await createCheckoutSessionAction(address, 'flat_rate:3', undefined, undefined, locale), { error: message })
      const response = await POST(request(undefined, locale))
      assert.deepEqual(await response.json(), { error: message })
      assert.equal(sessionReads, 0, 'Do not read or modify customer data when payments are disabled')
      assert.equal(state.sessions.length, 0, 'Do not create any Stripe session')
      assert.equal(state.lookups, 0, 'Do not request any backend data')
    } finally {
      if (previous === undefined) delete process.env.CHECKOUT_PAYMENTS_ENABLED
      else process.env.CHECKOUT_PAYMENTS_ENABLED = previous
    }
  }))
}
