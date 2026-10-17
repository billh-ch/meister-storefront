import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { openSync, closeSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { chromium } from 'playwright'

// All services are local fixtures; never run this against the real store.
const artifacts = process.env.BH_AGENT_WORKSPACE || join(homedir(), '.hermes/cache/scratch')
assert.ok(artifacts, 'An explicit scratch directory is required')
const dir = join(artifacts, 'meister-product-translations'); mkdirSync(dir, { recursive: true })
const backendPort = Number(process.env.TRANSLATIONS_FIXTURE_PORT || 4067)
const appPort = Number(process.env.TRANSLATIONS_APP_PORT || 3067)
const base = `http://localhost:${appPort}`, backendURL = `http://127.0.0.1:${backendPort}`
const catalog = [501, 502].map(id => {
 const source = { name: `Original Carbon ${id}`, short_description: `Raw short ${id}`, description: `Raw description ${id}\n\nSecond line` }
 const hash = createHash('sha256').update(Object.values(source).join('\0')).digest('hex')
 return { id, status: 'publish', ...source, description: `<p>Formatted original ${id}</p>`, short_description: '<p>Formatted original short</p>', slug: `fixture-${id}`, type: 'simple', price: '80', regular_price: '80', sale_price: '', price_html: '80', on_sale: false, stock_status: 'instock', stock_quantity: 5, images: [], categories: [{ id: 86, name: 'Fins', slug: 'fins' }], attributes: [], sku: `SKU-${id}`, weight: '', dimensions: { length: '', width: '', height: '' }, meister_translation_source: source, meister_translations: { version: 1, en: { status: 'published', source_hash: hash, name: `English Carbon ${id}`, description: `<p>English body ${id}</p>` }, el: { status: 'published', source_hash: hash, name: `Πέδιλα Carbon ${id}`, short_description: '<p>Σύντομη περιγραφή</p>', description: `<p onclick="bad()">Ελληνική περιγραφή ${id}<script>window.translationXss = true</script></p>` } }, meta_data: [{ key: 'private_internal', value: 'private-fixture-marker' }] }
})
let unexpected = 0
const backend = createServer(async (req, res) => {
 const url = new URL(req.url, backendURL)
 const json = (data, status = 200, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(data)) }
 if (req.method === 'GET' && url.pathname.startsWith('/wp-json/wc/v3/products')) {
  const id = Number(url.pathname.split('/').at(-1)), slug = url.searchParams.get('slug'), include = url.searchParams.get('include')?.split(',')
  if (id) return json(catalog.find(p => p.id === id) || {}, catalog.some(p => p.id === id) ? 200 : 404)
  return json(catalog.filter(p => (!slug || p.slug === slug) && (!include || include.includes(String(p.id)))), 200, { 'X-WP-TotalPages': '1', 'X-WP-Total': '2' })
 }
 if (url.pathname.startsWith('/wp-json/wc/store/v1/cart')) return json({ items: [], shipping_rates: [{ shipping_rates: [{ rate_id: 'local_pickup:1', method_id: 'local_pickup', name: 'Local pickup', price: '0', currency_minor_unit: 2 }] }] }, 200, { 'Cart-Token': 'local-fixture-only' })
 unexpected++; return json({ code: 'unavailable_fixture' }, 503)
})
await new Promise(resolve => backend.listen(backendPort, '127.0.0.1', resolve))
const env = { ...process.env, NEXT_PUBLIC_USE_MOCK_DATA: 'false', NEXT_PUBLIC_WC_URL: backendURL, WC_CONSUMER_KEY: 'fixture', WC_CONSUMER_SECRET: 'fixture', WC_PROXY_TOKEN: '', SESSION_SECRET: 'fixture-secret-more-than-32-characters-long', STRIPE_SECRET_KEY: 'sk_test_fixture_only', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', REDIS_ENV_PREFIX: 'TRANSLATIONS_DISABLED_', TRANSLATIONS_DISABLED_KV_REST_API_URL: '', TRANSLATIONS_DISABLED_KV_REST_API_TOKEN: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', NEXT_PUBLIC_SITE_URL: 'https://fixture.invalid', NO_PROXY: `${process.env.NO_PROXY || ''},localhost,127.0.0.1` }
const fd = openSync(join(dir, 'server.log'), 'w')
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.env.TRANSLATIONS_TEST_MODE === 'production' ? 'start' : 'dev', '--hostname', 'localhost', '--port', String(appPort)], { cwd: new URL('../', import.meta.url), env, stdio: ['ignore', fd, fd] })
let browser
try {
 let ready = false
 for (let i = 0; i < 240; i++) {
  if (app.exitCode !== null) throw Error(`App exited; see ${dir}/server.log`)
  try { if ((await fetch(base + '/robots.txt', { signal: AbortSignal.timeout(1500) })).ok) { ready = true; break } } catch {}
  await new Promise(resolve => setTimeout(resolve, 250))
 }
 assert.ok(ready, `App starts; see ${dir}/server.log`)
 browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
 const errors = []
 for (const locale of ['el', 'en', 'el']) {
  const prefix = locale === 'el' ? '/el' : '', name = locale === 'el' ? 'Πέδιλα Carbon 501' : 'English Carbon 501', related = locale === 'el' ? 'Πέδιλα Carbon 502' : 'English Carbon 502'
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => localStorage.setItem('mm_compare_v1', JSON.stringify([{ id: '501', name: 'Old saved name', category: 'fins' }])))
  await context.addCookies([{ name: 'mm_cart', value: Buffer.from(JSON.stringify([{ productId: '501', quantity: 1 }])).toString('base64url'), url: base }])
  const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(180000); page.on('pageerror', error => errors.push(error.message))
  const privateData = /meister_translations|meister_translation_source|source_hash|private-fixture-marker/
  for (const path of ['/', '/fins', '/shop', `/search?q=${encodeURIComponent(locale === 'el' ? 'Πέδιλα' : 'English')}`, '/products/fixture-501', '/cart', '/checkout']) {
   const response = await page.goto(base + prefix + (path === '/' ? '' : path))
   assert.equal(response.status(), 200, path)
   await page.getByText(path === '/checkout' ? `1 × ${name}` : name, { exact: true }).first().waitFor()
   if (path === '/') await page.locator('[data-compare-tray]').getByText(name, { exact: true }).waitFor()
   assert.doesNotMatch(await page.content(), privateData, `${path} cannot expose metadata in HTML/RSC`)
   assert.equal(await page.evaluate(() => Boolean(window.translationXss)), false)
   if (path.includes('/products/')) {
    assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), name)
    assert.ok((await page.locator('.product-prose').allTextContents()).join(' ').includes(locale === 'el' ? 'Ελληνική περιγραφή 501' : 'English body 501'))
    assert.ok((await page.title()).includes(name))
    const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => JSON.parse(node.textContent)))
    assert.equal(schemas.find(s => s['@type'] === 'Product').name, name)
    await page.getByText(related, { exact: true }).first().waitFor()
   }
  }
  for (const path of ['/wishlist', '/compare']) {
   await page.goto(base + prefix + path)
   await page.evaluate(() => { localStorage.setItem('mm_wishlist_guest', '["501"]'); localStorage.setItem('mm_compare_v1', JSON.stringify([{ id: '501', name: 'Old saved name', category: 'fins' }])) })
   await page.reload()
   await page.getByText(name, { exact: true }).first().waitFor()
  }
  // Drawer and recommendations use their own locale-aware stable APIs.
  await page.goto(base + prefix + '/shop')
  await page.locator('nav a[href$="/cart"]').click()
  await page.getByRole('dialog').getByText(name, { exact: true }).waitFor()
  await page.getByRole('dialog').getByText(related, { exact: true }).first().waitFor()
  for (const api of ['/api/search-suggestions?q=' + encodeURIComponent(locale === 'el' ? 'Πέδιλα' : 'English'), '/api/wishlist/products?ids=501', '/api/compare?ids=501', '/api/cart?', '/api/cart/recommendations?']) {
   const response = await context.request.get(base + api + (api.includes('?') ? '&' : '?') + 'locale=' + locale)
   assert.equal(response.status(), 200, api)
   const text = await response.text(); assert.ok(text.includes(api.includes('recommendations') ? related : name), api); assert.doesNotMatch(text, privateData)
  }
  // Narrow and wide product layouts preserve locale typography and action group.
  for (const width of [390, 1440]) {
   await page.setViewportSize({ width, height: 900 }); await page.goto(base + prefix + '/products/fixture-501'); await page.evaluate(() => document.fonts.ready)
   await page.locator('[data-compare-tray]').getByText(name, { exact: true }).waitFor()
   assert.equal(await page.locator('[data-compare-tray]').getByText('Old saved name', { exact: true }).count(), 0, 'Tray refreshes saved labels for the selected locale without changing IDs')
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
   await page.screenshot({ path: join(dir, `${locale}-${width}.png`), fullPage: true, caret: 'initial' })
  }
  const cookie = (await context.cookies()).find(c => c.name === 'mm_cart').value
  await page.getByRole('button', { name: /Choose language:|Επιλογή γλώσσας:/ }).first().click()
  await page.getByRole('link', { name: locale === 'el' ? 'Switch language to English' : 'Αλλαγή γλώσσας σε Ελληνικά' }).first().click()
  await page.getByRole('heading', { level: 1, name: locale === 'el' ? 'English Carbon 501' : 'Πέδιλα Carbon 501', exact: true }).waitFor()
  assert.equal((await context.cookies()).find(c => c.name === 'mm_cart').value, cookie)
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('mm_wishlist_guest'))), ['501'])
  await context.close()
  console.log(`PASS ${locale}: home, collections, search, PDP/SEO/JSON-LD, related, saved, comparison, full/popup cart, recommendations, checkout, locale switch, metadata isolation, desktop/mobile`)
 }
 assert.deepEqual(errors, []); assert.equal(unexpected, 0, 'No Redis, payment or unrelated backend request')
} finally {
 await browser?.close()
 if (app.exitCode === null) { const exited = once(app, 'exit'); app.kill('SIGTERM'); await exited }
 closeSync(fd); await new Promise(resolve => backend.close(resolve))
}
