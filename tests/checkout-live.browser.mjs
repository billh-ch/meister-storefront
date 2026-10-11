import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { openSync, closeSync } from 'node:fs'
import { chromium } from 'playwright'

// A real production Next build talks to a local WooCommerce-shaped backend.
// No production catalog, customer, Stripe session or order is ever changed.
let outage = false, catalogOutage = false, deliveryPrice = '300', productPrice = '80'
let counter = 0
let lastAddress
const sessions = new Map()
const addedIds = []
const product = id => ({
  id, status: 'publish', name: id === 501 ? 'Saved fins' : 'Saved accessory', slug: `saved-${id}`,
  type: id === 501 ? 'variable' : 'simple', price: id === 501 ? productPrice : '6',
  regular_price: id === 501 ? productPrice : '6', sale_price: '', price_html: '', on_sale: false,
  stock_status: 'instock', stock_quantity: null, images: [], categories: [],
  description: '', short_description: '', sku: `SKU-${id}`, weight: '', dimensions: { length: '', width: '', height: '' },
  attributes: id === 501 ? [{ id: 0, name: 'Size', visible: true, variation: true, options: ['M'] }] : [],
})
const backend = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const json = (value, status = 200, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(value)) }
  if (url.pathname.includes('/wc/v3/products')) {
    if (catalogOutage) return json({ code: 'offline' }, 503)
    if (url.pathname.endsWith('/variations')) return json([{ id: 601, status: 'publish', price: productPrice, regular_price: productPrice, sale_price: '', on_sale: false, stock_status: 'instock', attributes: [{ id: 0, name: 'Size', option: 'M' }] }])
    const id = Number(url.pathname.split('/').at(-1))
    return id ? json(product(id)) : json([product(501), product(502)], 200, { 'X-WP-Total': '2', 'X-WP-TotalPages': '1' })
  }
  if (url.pathname.includes('/wc/store/v1/cart')) {
    if (outage) return json({ code: 'delivery_service_offline' }, 503)
    if (req.method === 'GET') {
      const token = `fixture-session-${++counter}`
      sessions.set(token, [])
      return json({ items: [], shipping_rates: [] }, 200, { 'Cart-Token': token })
    }
    const token = req.headers['cart-token']
    if (!sessions.has(token)) return json({ code: 'invalid_cart_token' }, 401)
    let body = ''; for await (const chunk of req) body += chunk
    const input = JSON.parse(body)
    if (url.pathname.endsWith('/add-item')) {
      addedIds.push(input.id)
      if (input.id === 501 && !input.variation?.some(axis => axis.attribute === 'Size' && axis.value === 'M')) return json({ code: 'woocommerce_rest_cart_missing_variation' }, 400)
      sessions.get(token).push(input)
      return json({ items: sessions.get(token), shipping_rates: [] }, 200, { 'Cart-Token': token })
    }
    lastAddress = input.shipping_address
    const country = input.shipping_address.country
    const rate = (rate_id, method_id, name, price) => ({ rate_id, method_id, name, price, currency_minor_unit: 2 })
    const rates = country === 'GR'
      ? [rate('flat_rate:1', 'flat_rate', 'Greece courier', deliveryPrice), rate('local_pickup:2', 'local_pickup', 'Local pickup', '0'), rate('locker:3', 'locker', 'Greece locker delivery', '200')]
      : country === 'CY' ? [rate('flat_rate:4', 'flat_rate', 'Cyprus courier', '900')] : []
    return json({ shipping_rates: [{ shipping_rates: rates }] }, 200, { 'Cart-Token': token })
  }
  json([])
})
backend.listen(0, 'localhost'); await once(backend, 'listening')
const base = 'http://localhost:3002'
const env = { ...process.env, NEXT_PUBLIC_USE_MOCK_DATA: 'false', NEXT_PUBLIC_WC_URL: `http://localhost:${backend.address().port}`, WC_CONSUMER_KEY: 'fixture', WC_CONSUMER_SECRET: 'fixture', SESSION_SECRET: 'checkout-fixture-secret-'.repeat(4), STRIPE_SECRET_KEY: 'sk_test_fixture', NODE_USE_ENV_PROXY: '1', NO_PROXY: `${process.env.NO_PROXY ?? ''},localhost,127.0.0.1` }
const run = (args, path) => { const log = openSync(path, 'w'); const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...args], { env, stdio: ['ignore', log, log] }); child.once('exit', () => closeSync(log)); return child }
let app, browser, build
try {
  build = run(['build'], '/tmp/checkout-live-build.log'); await once(build, 'exit')
  assert.equal(build.exitCode, 0, 'Build failed: /tmp/checkout-live-build.log')
  console.log('PASS optimized production build')
  app = run(['start', '--hostname', 'localhost', '--port', '3002'], '/tmp/checkout-live-server.log')
  for (let i = 0; i < 150; i++) { try { if ((await fetch(base + '/robots.txt')).ok) break } catch {} await new Promise(resolve => setTimeout(resolve, 100)) }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
  page.setDefaultTimeout(20000)
  await page.context().addCookies([{ name: 'mm_cart', value: Buffer.from(JSON.stringify([{ productId: '501', variationId: '600', selectedOptions: { Size: 'M' }, quantity: 1 }, { productId: '502', quantity: 1 }])).toString('base64url'), url: base }])
  outage = true
  await page.goto(base + '/checkout')
  await page.getByRole('alert').filter({ hasText: 'Could not calculate delivery' }).waitFor()
  assert.equal(await page.getByText(/No delivery options/).count(), 0, 'Initial outages must not claim Greece has no methods')
  outage = false
  await page.getByRole('button', { name: 'Retry delivery calculation' }).click()
  await page.getByRole('radio', { name: /Greece courier/ }).waitFor()
  assert.equal(await page.getByRole('radio').count(), 3)
  assert.ok(addedIds.includes(601), 'Shipping receives the recovered current variation ID')
  assert.ok(addedIds.includes(502), 'Shipping receives the other cart line')
  await page.getByLabel('Country', { exact: true }).selectOption('CY')
  await page.getByRole('radio', { name: /Cyprus courier/ }).waitFor()
  assert.equal(await page.getByRole('radio').count(), 1)
  await page.getByLabel('Country', { exact: true }).selectOption('GR')
  await page.getByRole('radio', { name: /Greece courier/ }).waitFor()
  assert.equal(await page.getByRole('radio').count(), 3)
  const result = await page.evaluate(async () => { const response = await fetch('/api/checkout/shipping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: 'GR' }) }); return { status: response.status, cache: response.headers.get('cache-control'), body: await response.json() } })
  assert.equal(result.status, 200); assert.equal(result.cache, 'private, no-store'); assert.equal(result.body.methods.length, 3)
  assert.equal((await fetch(base + '/api/checkout/shipping', { method: 'POST', headers: { Origin: 'https://other.invalid', 'Content-Type': 'application/json' }, body: JSON.stringify({ country: 'GR' }) })).status, 403)
  assert.equal((await fetch(base + '/api/checkout/shipping', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ country: 'ZZ' }) })).status, 400)
  console.log('PASS real route → cart resolution → Store API sessions → three Greece rates / one Cyprus rate, outage retry and request boundaries')
  for (const [label, value] of [['Email for order confirmation', 'qa@fixture.invalid'], ['First name', 'Test'], ['Last name', 'Customer'], ['Address', 'Ermou 1'], ['City', 'Athens'], ['Postcode', '10558'], ['Phone', '+302100000000']]) await page.getByLabel(label, { exact: true }).fill(value)
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
  deliveryPrice = '350'
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
  await page.getByText('The delivery price has changed. Please review the updated total and continue.', { exact: true }).waitFor()
  await page.getByRole('radio', { name: /Greece courier.*3,50/ }).waitFor()
  assert.equal(lastAddress.postcode, '10558', 'Price-change recovery must quote the complete submitted address even while its fields are disabled')
  assert.equal(await page.getByLabel('Address', { exact: true }).inputValue(), 'Ermou 1')
  productPrice = '82'
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Your cart or product prices have changed' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Continue to payment', exact: true }).isDisabled(), true)
  console.log('PASS live cart and shipping price changes stop payment and retain entered details')
  catalogOutage = true
  await page.reload()
  await page.getByRole('alert').filter({ hasText: 'Could not verify your cart' }).waitFor()
  catalogOutage = false
  await page.getByRole('link', { name: 'Retry checkout' }).click()
  await page.getByRole('radio', { name: /Greece courier/ }).waitFor()
  const cart = await page.evaluate(async () => (await fetch('/api/cart')).json())
  assert.equal(cart.lines.length, 2)
  console.log('PASS initial catalog outage recovers without discarding saved cart items')
} finally {
  await browser?.close()
  if (app && app.exitCode === null) { app.kill('SIGTERM'); await once(app, 'exit') }
  if (build && build.exitCode === null) { build.kill('SIGTERM'); await once(build, 'exit') }
  backend.close(); await once(backend, 'close')
}
