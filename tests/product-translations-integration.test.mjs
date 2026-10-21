import './helpers/typescript-imports.mjs'
import { registerHooks } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
registerHooks({ resolve(specifier, context, next) {
  const source = specifier === 'next/server' ? 'export const NextResponse = Response' : specifier === '@/lib/cart/cookie' ? 'export const getCart = async () => [{ productId: "501", quantity: 2 }]' : undefined
  return source ? { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true } : next(specifier, context)
} })
process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'false'
const wc = await import('../lib/woocommerce/index.ts')
const { resolveCartItems } = await import('../lib/cart/resolve.ts')
const { checkoutCartSignature } = await import('../lib/checkout/model.ts')
const { fetchCompareCatalog } = await import('../lib/compare/catalog.ts')
const source = { name: 'Authored fins', short_description: 'Raw short', description: 'Raw long\nline two' }
const hash = createHash('sha256').update(Object.values(source).join('\0')).digest('hex')
const raw = { id: 501, status: 'publish', ...source, short_description: '<p>REST short</p>', description: '<p>REST long<br>line two</p>', slug: 'stable-fins', type: 'simple', price: '80', regular_price: '80', sale_price: '', price_html: '80', on_sale: false, stock_status: 'instock', stock_quantity: 5, images: [], categories: [{ id: 86 }], attributes: [], sku: 'SKU-501', weight: '', dimensions: { length: '', width: '', height: '' }, meister_translation_source: source, meister_translations: { version: 1, en: { status: 'published', source_hash: hash, name: 'English fins' }, el: { status: 'published', source_hash: hash, name: 'Πέδιλα Carbon', description: '<p>Περιγραφή</p>' } }, meta_data: [] }
async function backend(fn) {
 const fetch = globalThis.fetch, env = Object.fromEntries(['NEXT_PUBLIC_WC_URL', 'WC_CONSUMER_KEY', 'WC_CONSUMER_SECRET'].map(key => [key, process.env[key]])), calls = []
 Object.assign(process.env, { NEXT_PUBLIC_WC_URL: 'https://fixture.invalid', WC_CONSUMER_KEY: 'fixture', WC_CONSUMER_SECRET: 'fixture' })
 globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); const path = new URL(url).pathname; return Response.json(/products\/501$/.test(path) ? raw : [raw, { ...raw, id: 502, slug: 'stable-accessory' }], { headers: { 'X-WP-TotalPages': '1' } }) }
 try { await fn(calls) } finally { globalThis.fetch = fetch; for (const [key, value] of Object.entries(env)) { if (value === undefined) delete process.env[key]; else process.env[key] = value } }
}
test('explicit locales project after raw catalog reads, including defaults, detail, live cart and comparison', () => backend(async calls => {
 const [english, greek, again] = await Promise.all([wc.getProducts(), wc.getProducts('el'), wc.getProducts('en')])
 assert.equal(greek[0].name, 'Πέδιλα Carbon'); assert.equal(english[0].name, 'English fins'); assert.deepEqual(english, again)
 assert.equal((await wc.getProductBySlug('stable-fins', 'el')).descriptionHtml, '<p>Περιγραφή</p>')
 assert.equal((await wc.getProductById('501', 'el')).name, 'Πέδιλα Carbon')
 assert.equal((await fetchCompareCatalog(['501'], 'el')).products[0].name, 'Πέδιλα Carbon')
 const cart = [{ productId: '501', quantity: 2 }]
 const enCart = await resolveCartItems(cart), elCart = await resolveCartItems(cart, 'el')
 assert.equal(elCart.lines[0].name, 'Πέδιλα Carbon'); assert.equal(enCart.lines[0].name, 'English fins')
 assert.equal(checkoutCartSignature(enCart.lines), checkoutCartSignature(elCart.lines))
 for (const call of calls) assert.equal(new URL(call.url).searchParams.has('locale'), false, 'Woo cache stores raw bilingual data, not projected locale')
 assert.equal(JSON.stringify(greek).includes('source_hash'), false)
}))
const routes = {
 search: await import('../app/api/search-suggestions/route.ts'),
 wishlist: await import('../app/api/wishlist/products/route.ts'),
 compare: await import('../app/api/compare/route.ts'),
 cart: await import('../app/api/cart/route.ts'),
 recommendations: await import('../app/api/cart/recommendations/route.ts'),
}
test('stable shopper APIs localize catalog text and reject invalid locales before fetching', () => backend(async calls => {
 for (const [name, route] of Object.entries(routes)) {
  const url = `https://shop.invalid/api/${name}?ids=501&q=${encodeURIComponent('Πέδιλα')}&locale=el`
  const response = await route.GET(new Request(url)), json = await response.json()
  assert.equal(response.status, 200, name)
  assert.ok(JSON.stringify(json).includes('Πέδιλα Carbon'), `${name}: ${JSON.stringify(json)}`)
  assert.equal(JSON.stringify(json).includes('source_hash'), false)
  const before = calls.length
  assert.equal((await route.GET(new Request(url.replace('locale=el', 'locale=gr')))).status, 400, name)
  assert.equal(calls.length, before, name)
 }
 const legacy = await routes.search.GET(new Request('https://shop.invalid/api/search?q=English'))
 assert.equal((await legacy.json()).results[0].name, 'English fins')
}))
