import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { wcFetch } = await import('../lib/woocommerce/client.ts')
const { fetchShippingRates } = await import('../lib/woocommerce/queries/get-shipping-rates.ts')

test('shipping Store API requests carry proxy authentication and preserve cart tokens', async () => {
  const originalFetch = globalThis.fetch
  const savedUrl = process.env.NEXT_PUBLIC_WC_URL
  const savedToken = process.env.WC_PROXY_TOKEN
  try {
    process.env.NEXT_PUBLIC_WC_URL = 'https://fixture.example'
    process.env.WC_PROXY_TOKEN = 'fixture-proxy-token'
    const calls = []
    globalThis.fetch = async (url, init) => {
      calls.push({ url, headers: new Headers(init.headers) })
      return Response.json({ shipping_rates: [{ shipping_rates: [] }] }, { headers: { 'Cart-Token': 'fixture-cart', 'x-wc-store-api-nonce': 'fixture-nonce' } })
    }
    await fetchShippingRates([{ productId: 123, quantity: 1 }], { country: 'GR' })
    assert.equal(calls.length, 3)
    for (const call of calls) assert.equal(call.headers.get('X-Meister-API-Key'), 'fixture-proxy-token')
    assert.equal(calls[1].headers.get('Cart-Token'), 'fixture-cart')
    assert.equal(calls[1].headers.get('Nonce'), 'fixture-nonce')
  } finally {
    globalThis.fetch = originalFetch
    if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_WC_URL; else process.env.NEXT_PUBLIC_WC_URL = savedUrl
    if (savedToken === undefined) delete process.env.WC_PROXY_TOKEN; else process.env.WC_PROXY_TOKEN = savedToken
  }
})

test('customer login forwards the proxy credential without using admin Basic auth', async () => {
  const { requestCustomerToken } = await import('../lib/auth/backend-login.ts')
  const originalFetch = globalThis.fetch
  const savedToken = process.env.WC_PROXY_TOKEN
  try {
    process.env.WC_PROXY_TOKEN = 'fixture-proxy-token'
    let received
    globalThis.fetch = async (url, init) => { received = { url, init, headers: new Headers(init.headers) }; return Response.json({ user_email: 'fixture@example.com' }) }
    await requestCustomerToken('https://fixture.example/', 'fixture@example.com', 'fixture-password')
    assert.equal(received.url, 'https://fixture.example/wp-json/jwt-auth/v1/token')
    assert.equal(received.headers.get('X-Meister-API-Key'), 'fixture-proxy-token')
    assert.equal(received.headers.get('Authorization'), null)
    assert.deepEqual(JSON.parse(received.init.body), { username: 'fixture@example.com', password: 'fixture-password' })
    assert.equal(received.init.cache, 'no-store')
  } finally {
    globalThis.fetch = originalFetch
    if (savedToken === undefined) delete process.env.WC_PROXY_TOKEN; else process.env.WC_PROXY_TOKEN = savedToken
  }
})

test('WooCommerce requests include a server-only proxy credential without replacing Basic auth', async () => {
  const originalFetch = globalThis.fetch
  const keys = ['NEXT_PUBLIC_WC_URL', 'WC_CONSUMER_KEY', 'WC_CONSUMER_SECRET', 'WC_PROXY_TOKEN']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  try {
    process.env.NEXT_PUBLIC_WC_URL = 'https://fixture.example'
    process.env.WC_CONSUMER_KEY = 'fixture-key'
    process.env.WC_CONSUMER_SECRET = 'fixture-secret'
    process.env.WC_PROXY_TOKEN = 'fixture-proxy-token'
    let received
    globalThis.fetch = async (_url, init) => { received = new Headers(init.headers); return Response.json([]) }
    await wcFetch('/products')
    assert.equal(received.get('X-Meister-API-Key'), 'fixture-proxy-token')
    assert.equal(received.get('Authorization'), `Basic ${Buffer.from('fixture-key:fixture-secret').toString('base64')}`)
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
  }
})
