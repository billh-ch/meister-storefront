import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { openSync, closeSync } from 'node:fs'
import { sealData } from 'iron-session'
import { chromium } from 'playwright'
import './helpers/typescript-imports.mjs'
const { translate } = await import('../lib/i18n/index.ts')

// Self-contained real-data fixture. Every credential/service is overridden;
// successful Stripe/paid confirmation is dependency-stubbed in unit tests.
const secret = 'greek-locale-fixture-secret-at-least-32-characters'
const backendPort = Number(process.env.LOCALE_FIXTURE_PORT ?? 4055)
const appPort = Number(process.env.LOCALE_APP_PORT ?? 3043)
const base = `http://localhost:${appPort}`
let shippingOffline = false, addressWrites = 0, prohibitedWrites = 0
const cartSessions = new Map()
const catalog = [501, 502].map(id => ({
  id, status: 'publish', name: id === 501 ? 'Catalog fins' : 'Catalog accessory', slug: id === 501 ? encodeURIComponent('πέδιλα-fixture') : 'fixture-accessory',
  type: id === 501 ? 'variable' : 'simple', price: '80', regular_price: '80', sale_price: '', price_html: '80', on_sale: false,
  stock_status: 'instock', stock_quantity: 5, images: [], categories: [{ id: 86, name: 'Πέδιλα', slug: 'πέδιλα' }],
  description: '<p>Catalog text stays authored.</p>', short_description: '<p>Catalog source.</p>', sku: `SKU-${id}`, weight: '', dimensions: { length: '', width: '', height: '' },
  attributes: id === 501 ? [{ id: 0, name: 'Size', visible: true, variation: true, options: ['M'] }] : [],
}))
const savedAddress = { first_name: 'Test', last_name: 'Customer', address_1: 'Fixture Street 1', address_2: '', city: 'Athens', postcode: '10558', country: 'GR', phone: '+302100000000' }
const backend = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture.invalid')
  const json = (data, status = 200, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(data)) }
  if (url.pathname === '/wp-json/jwt-auth/v1/token') return json({ message: 'Fixture rejects credentials' }, 401)
  if (url.pathname === '/wp-json/wc/v3/customers/901') {
    if (req.method === 'PUT') { addressWrites++; return json({ code: 'offline' }, 503) }
    return json({ id: 901, email: 'qa@fixture.invalid', first_name: 'Test', last_name: 'Customer', shipping: savedAddress, meta_data: [] })
  }
  if (url.pathname === '/wp-json/wc/v3/orders' && req.method === 'GET') return json([{ id: 9011, number: 'FIXTURE-9011', status: 'processing', date_created: '2026-10-14T12:00:00', total: '80', transaction_id: '', line_items: [{ name: 'Catalog fins', quantity: 1, total: '80' }] }])
  if (url.pathname.startsWith('/wp-json/wc/v3/products')) {
    if (url.pathname.endsWith('/variations')) return json([{ id: 601, status: 'publish', price: '80', regular_price: '80', sale_price: '', on_sale: false, stock_status: 'instock', attributes: [{ id: 0, name: 'Size', option: 'M' }] }])
    const id = Number(url.pathname.split('/').at(-1))
    if (id) return json(catalog.find(item => item.id === id) ?? {}, catalog.some(item => item.id === id) ? 200 : 404)
    const slug = url.searchParams.get('slug'), include = url.searchParams.get('include')?.split(',')
    return json(catalog.filter(item => (!slug || decodeURIComponent(item.slug) === slug) && (!include || include.includes(String(item.id)))), 200, { 'X-WP-Total': '2', 'X-WP-TotalPages': '1' })
  }
  if (url.pathname.startsWith('/wp-json/wc/store/v1/cart')) {
    if (shippingOffline) return json({ code: 'fixture_offline' }, 503)
    if (req.method === 'GET') { const token = `fixture-${cartSessions.size}`; cartSessions.set(token, []); return json({ items: [], shipping_rates: [] }, 200, { 'Cart-Token': token }) }
    let body = ''; for await (const chunk of req) body += chunk
    const input = JSON.parse(body), token = req.headers['cart-token']
    if (!cartSessions.has(token)) return json({ code: 'bad_fixture_token' }, 401)
    if (url.pathname.endsWith('/add-item')) { cartSessions.get(token).push(input); return json({ items: cartSessions.get(token), shipping_rates: [] }, 200, { 'Cart-Token': token }) }
    const rate = (rate_id, method_id, name, price) => ({ rate_id, method_id, name, price, currency_minor_unit: 2 })
    return json({ shipping_rates: [{ shipping_rates: input.shipping_address.country === 'GR' ? [rate('flat_rate:1', 'flat_rate', 'Courier', '300'), rate('local_pickup:2', 'local_pickup', 'Local pickup', '0'), rate('box_now_delivery:3', 'box_now_delivery', 'BOX NOW', '200')] : [] }] }, 200, { 'Cart-Token': token })
  }
  if (req.method !== 'GET') prohibitedWrites++
  return json({ code: 'unknown_fixture_endpoint' }, 404)
})
await new Promise(resolve => backend.listen(backendPort, '127.0.0.1', resolve))
const fixtureURL = `http://127.0.0.1:${backendPort}`
const env = { ...process.env,
  NEXT_PUBLIC_USE_MOCK_DATA: 'false', NEXT_PUBLIC_WC_URL: fixtureURL, WC_CONSUMER_KEY: 'fixture-key', WC_CONSUMER_SECRET: 'fixture-secret', WC_PROXY_TOKEN: '',
  SESSION_SECRET: secret, STRIPE_SECRET_KEY: 'sk_test_fixture_only', NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_fixture_only', STRIPE_WEBHOOK_SECRET: 'whsec_fixture_only',
  REDIS_ENV_PREFIX: '', KV_REST_API_URL: fixtureURL, KV_REST_API_TOKEN: 'fixture-only', UPSTASH_REDIS_REST_URL: fixtureURL, UPSTASH_REDIS_REST_TOKEN: 'fixture-only',
  BOX_NOW_PARTNER_ID: '123', NEXT_PUBLIC_SITE_URL: 'https://fixture.invalid', NODE_USE_ENV_PROXY: '1', NO_PROXY: `${process.env.NO_PROXY ?? ''},localhost,127.0.0.1`,
}
let app, build, browser
function run(args, filename) {
  const fd = openSync(filename, 'w')
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...args], { cwd: new URL('../', import.meta.url), env, stdio: ['ignore', fd, fd] })
  child.once('exit', () => closeSync(fd)); return child
}
async function seed(context, signedIn = false) {
  await context.addCookies([{ name: 'mm_cart', value: Buffer.from(JSON.stringify([{ productId: '501', variationId: '601', selectedOptions: { Size: 'M' }, quantity: 1 }])).toString('base64url'), url: base }])
  if (signedIn) await context.addCookies([{ name: 'mm_session', value: await sealData({ wcCustomerId: 901 }, { password: secret }), url: base, httpOnly: true, sameSite: 'Lax' }])
}
try {
  if (process.env.LOCALE_TEST_MODE !== 'dev' && process.env.LOCALE_SKIP_BUILD !== '1') {
    build = run(['build'], '/tmp/meister-locale/task-3-build.log'); await once(build, 'exit')
    assert.equal(build.exitCode, 0, 'Optimized build: /tmp/meister-locale/task-3-build.log')
    console.log('PASS optimized real-fixture production build')
  }
  app = run([process.env.LOCALE_TEST_MODE === 'dev' ? 'dev' : 'start', '--hostname', 'localhost', '--port', String(appPort)], '/tmp/meister-locale/task-3-fixture-server.log')
  let ready = false
  for (let attempt = 0; attempt < 180; attempt++) {
    if (app.exitCode !== null) throw Error('Fixture app exited: /tmp/meister-locale/task-3-fixture-server.log')
    try { if ((await fetch(base + '/robots.txt', { signal: AbortSignal.timeout(1500) })).ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, 'Fixture app becomes ready')
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
  const errors = []
  const locales = process.env.LOCALE_TEST_LOCALE ? [process.env.LOCALE_TEST_LOCALE] : ['en', 'el']
  assert.ok(locales.every(locale => ['en', 'el'].includes(locale)))
  for (const locale of locales) {
    const prefix = locale === 'el' ? '/el' : '', t = (source, values) => translate(locale, source, values)
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } }); await seed(context)
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message))
    // Whole-branch review regressions exercise rendered schema and the real
    // guest wishlist store against this local catalog, including a deleted ID.
    if (!process.env.LOCALE_REVIEW_CASE || process.env.LOCALE_REVIEW_CASE === 'm1') {
      await page.goto(base + prefix + '/products/' + catalog[0].slug)
      const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => JSON.parse(node.textContent)))
      const breadcrumb = schemas.find(schema => schema['@type'] === 'BreadcrumbList')
      assert.deepEqual(breadcrumb.itemListElement.map(item => item.name), [locale === 'el' ? 'Αρχική' : 'Home', locale === 'el' ? 'ΠΕΔΙΛΑ' : 'FINS', catalog[0].name])
      assert.equal(schemas.find(schema => schema['@type'] === 'Product').name, catalog[0].name, 'Authored product name stays raw in Product schema')
      assert.equal(breadcrumb.itemListElement[1].item, `https://fixture.invalid${prefix}/fins`)
      assert.equal(breadcrumb.itemListElement.at(-1).item, `https://fixture.invalid${prefix}/products/${catalog[0].slug}`)
      console.log(`PASS REVIEW M1 ${locale}: rendered category breadcrumb names/URLs and raw authored product names`)
    }
    if (!process.env.LOCALE_REVIEW_CASE || process.env.LOCALE_REVIEW_CASE === 'm2') {
      await page.goto(base + prefix + '/wishlist')
      await page.evaluate(() => localStorage.setItem('mm_wishlist_guest', '["502","999999"]'))
      await page.reload()
      const unavailable = page.getByText(t('This saved product is no longer available.'), { exact: true })
      await unavailable.waitFor()
      const tombstone = unavailable.locator('..').getByRole('button')
      assert.equal(await tombstone.getAttribute('aria-label'), locale === 'el' ? 'Αφαίρεση του προϊόντος 999999 από τα αγαπημένα' : 'Remove product 999999 from wishlist')
      const realName = t('Remove {name} from wishlist', { name: catalog[1].name })
      assert.equal(await page.getByRole('button', { name: realName, exact: true }).count(), 1, 'Real catalog name remains untouched')
      await tombstone.click()
      await page.waitForFunction(() => !JSON.parse(localStorage.getItem('mm_wishlist_guest')).includes('999999'))
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('mm_wishlist_guest'))), ['502'], 'Removal targets only the original deleted ID')
      // Removing a saved ID triggers a fresh catalog key and asynchronous read.
      await page.getByRole('button', { name: realName, exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: realName, exact: true }).count(), 1)
      await page.evaluate(() => localStorage.setItem('mm_wishlist_guest', '[]'))
      console.log(`PASS REVIEW M2 ${locale}: natural tombstone accessible label, raw ID removal and preserved real product name/ID`)
    }
    if (process.env.LOCALE_REVIEW_FIXES_ONLY === '1') { await context.close(); continue }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['', '/products/' + catalog[0].slug, '/cart', '/checkout', '/checkout/confirmation', '/sign-in', '/wishlist', '/compare', '/fixture-missing-page']) {
        await page.goto(base + (prefix + path || '/'))
        await page.locator('html[lang]').waitFor()
        assert.equal(await page.locator('html').getAttribute('lang'), locale, `${locale} ${path} at ${width}`)
        await page.evaluate(() => document.fonts.ready)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale} ${path} fits ${width}px`)
        if (path.includes('products')) { assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'Catalog fins'); assert.ok((await page.locator('.product-prose').allTextContents()).includes('Catalog text stays authored.')) }
        if (path === '') assert.ok((await page.locator('iframe[src*="google.com/maps/embed"]').getAttribute('src')).includes(`!1s${locale}!2sgr`), 'Store location map uses selected locale')
        if (path === '/checkout') assert.equal(await page.locator('option[value="GR"]').innerText(), t('Greece'))
        if (path === '/checkout/confirmation') await page.getByRole('heading', { name: t('SOMETHING WENT WRONG'), exact: true }).waitFor()
        if (path === '/wishlist') await page.getByText(t('Your wishlist is empty'), { exact: true }).waitFor()
        if (path === '/compare') await page.getByText(t('No products selected for comparison'), { exact: true }).waitFor()
        if (path.includes('missing')) assert.match(await page.getByRole('heading', { level: 1 }).innerText(), locale === 'el' ? /Η ΣΕΛΙΔΑ ΔΕΝ ΒΡΕΘΗΚΕ/ : /PAGE NOT FOUND/)
        if (locale === 'el' && width === 320 && path === '/checkout') await page.screenshot({ path: '/tmp/meister-locale/task-3-checkout-320.png', fullPage: true })
      }
    }
    if (locale === 'el') {
      const fonts = await page.evaluate(() => [...document.fonts].filter(font => /Cascadia/.test(font.family)).map(font => font.status))
      assert.ok(fonts.includes('loaded'), 'Greek Cascadia asset loads')
    }
    const before = (await context.cookies()).find(cookie => cookie.name === 'mm_cart').value
    await page.goto(base + prefix + '/cart')
    await page.evaluate(() => { localStorage.setItem('mm_wishlist_guest', '["501"]'); localStorage.setItem('mm_compare_v1', JSON.stringify([{ id: '501', name: 'Catalog fins', category: 'fins' }])) })
    const savedBefore = await page.evaluate(() => [localStorage.getItem('mm_wishlist_guest'), localStorage.getItem('mm_compare_v1')])
    await page.getByRole('button', { name: /Choose language:|Επιλογή γλώσσας:/ }).click()
    await page.getByRole('link', { name: locale === 'el' ? 'Switch language to English' : 'Αλλαγή γλώσσας σε Ελληνικά' }).first().click()
    await page.waitForURL(base + (locale === 'el' ? '/cart' : '/el/cart'))
    assert.equal((await context.cookies()).find(cookie => cookie.name === 'mm_cart').value, before)
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem('mm_wishlist_guest'), localStorage.getItem('mm_compare_v1')]), savedBefore)
    // Genuine unauthenticated guard; no fabricated locale header affects it.
    const authBoundary = await context.request.get(base + prefix + '/account', { maxRedirects: 0 })
    assert.equal(authBoundary.status(), 307)
    assert.ok(authBoundary.headers().location.includes(prefix + '/sign-in'))
    await page.goto(base + prefix + '/sign-in?redirect_url=https://evil.invalid')
    await page.locator('#sign-in-email').fill('qa@fixture.invalid')
    await page.getByLabel(t('Password'), { exact: true }).fill('fixture-password')
    await page.getByRole('button', { name: t('Sign in'), exact: true }).click()
    await page.getByText(t('Incorrect email or password.'), { exact: true }).waitFor()
    assert.equal(new URL(page.url()).origin, base)
    shippingOffline = true
    await page.goto(base + prefix + '/checkout')
    await page.getByRole('alert').filter({ hasText: t('Could not calculate delivery. Please try again.') }).waitFor()
    shippingOffline = false
    const shippingResponse = page.waitForResponse(response => response.url().endsWith('/api/checkout/shipping'))
    await page.getByRole('button', { name: t('Retry delivery calculation'), exact: true }).click()
    const refreshed = await shippingResponse
    assert.equal(refreshed.request().postDataJSON().locale, locale)
    await page.getByRole('radio', { name: /BOX NOW/ }).waitFor()
    const message = { boxnowLockerId: '3', boxnowLockerName: 'Fixture locker', boxnowLockerAddressLine1: 'Fixture Street 144', boxnowLockerPostalCode: '18545', boxnowCountry: 'GR' }
    await page.route('https://widget-v5.boxnow.gr/**', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><button id="select">Select fixture locker</button><script>document.querySelector('#select').onclick=()=>parent.postMessage(${JSON.stringify(message)},'*')</script>` }))
    await page.getByRole('radio', { name: /BOX NOW/ }).check()
    const iframe = page.locator(`iframe[title="${t('BOX NOW locker map for Greece')}"]`)
    const iframeURL = new URL(await iframe.getAttribute('src'))
    assert.equal(iframeURL.searchParams.get('language'), locale === 'el' ? 'gr' : 'en')
    assert.equal(iframeURL.searchParams.get('countryCode'), 'gr')
    assert.equal(iframeURL.searchParams.get('autoselect'), 'yes'); assert.equal(iframeURL.searchParams.get('autoclose'), 'no')
    await page.evaluate(data => window.dispatchEvent(new MessageEvent('message', { origin: 'https://widget-v5.boxnow.gr', source: window, data })), message)
    assert.equal(await page.getByRole('button', { name: t('Continue to payment'), exact: true }).isDisabled(), true)
    await page.frameLocator(`iframe[title="${t('BOX NOW locker map for Greece')}"]`).getByRole('button', { name: 'Select fixture locker' }).click()
    for (const [label, value] of [['Email for order confirmation', 'qa@fixture.invalid'], ['First name', 'Test'], ['Last name', 'Customer'], ['Address', 'Fixture 1'], ['City', 'Athens'], ['Postcode', '10558'], ['Phone', '2100000000']]) await page.getByLabel(t(label), { exact: true }).fill(value)
    await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled)
    let submitted
    await page.route('**/api/checkout/session', route => { submitted = route.request().postDataJSON(); return route.abort('failed') })
    await page.getByRole('button', { name: t('Continue to payment'), exact: true }).click()
    await page.getByText(t('Could not prepare checkout. Please try again. Your details have been kept.'), { exact: true }).waitFor()
    assert.equal(submitted.locale, locale); assert.deepEqual(submitted.boxNowLocker, { id: '3' })
    assert.equal(await page.getByLabel(t('Address'), { exact: true }).inputValue(), 'Fixture 1')
    // Invalid input follows the real stable API and never reaches Stripe.
    const invalid = await context.request.post(base + '/api/checkout/session', { headers: { Origin: base }, data: { locale, address: {}, deliveryMethodId: 'local_pickup:2' } })
    assert.equal(invalid.status(), 400)
    assert.equal((await invalid.json()).error, t('Please fill in every required field.'))
    await context.close()

    const accountContext = await browser.newContext({ viewport: { width: 320, height: 900 } }); await seed(accountContext, true)
    const accountPage = await accountContext.newPage(); accountPage.on('pageerror', error => errors.push(error.message))
    await accountPage.goto(base + prefix + '/account')
    await accountPage.getByRole('heading', { name: t('YOUR ACCOUNT'), exact: true }).waitFor()
    await accountPage.getByText(t('processing'), { exact: true }).waitFor()
    assert.equal(await accountPage.getByLabel(t('Address'), { exact: true }).inputValue(), savedAddress.address_1)
    assert.equal(await accountPage.locator('option[value="GR"]').innerText(), t('Greece'))
    assert.ok(await accountPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    if (locale === 'el') await accountPage.screenshot({ path: '/tmp/meister-locale/task-3-account-320.png', fullPage: true })
    await accountPage.getByRole('button', { name: t('Save address'), exact: true }).click()
    await accountPage.getByText(t('Could not save your address. Please try again.'), { exact: true }).waitFor()
    await accountPage.goto(base + prefix + '/checkout')
    assert.equal(await accountPage.getByLabel(t('Address'), { exact: true }).inputValue(), savedAddress.address_1)
    assert.equal(await accountPage.getByLabel(t('Email for order confirmation'), { exact: true }).count(), 0)
    await accountPage.goto(base + prefix + '/account')
    await accountPage.getByRole('button', { name: t('Sign out'), exact: true }).click()
    await accountPage.waitForURL(base + (prefix || '/'))
    assert.equal((await accountContext.request.get(base + prefix + '/account', { maxRedirects: 0 })).status(), 307)
    await accountContext.close()
    console.log(`PASS ${locale}: authored catalog/Greek slug, all shopper states and widths, state continuity, account boundary/auth failure, delivery recovery, BOX NOW contract, locale payload/payment retry, signed account/address failure/checkout/logout`)
  }
  assert.deepEqual(errors, [])
  assert.equal(addressWrites, process.env.LOCALE_REVIEW_FIXES_ONLY === '1' ? 0 : locales.length, 'Only deliberately failing local-fixture address saves occurred')
  assert.equal(prohibitedWrites, 0, 'No fixture customer/order/Redis mutation was attempted')
} finally {
  await browser?.close()
  for (const child of [app, build]) if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited }
  await new Promise(resolve => backend.close(resolve))
}
