import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { openSync, closeSync } from 'node:fs'
import { once } from 'node:events'
import { chromium } from 'playwright'

// A local WooCommerce fixture exercises real-data code paths without reading
// store/customer records, changing Vercel configuration or placing orders.
const products = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1, slug: index === 0 ? encodeURIComponent('πέδιλα') : `fins-${index + 1}`,
  name: index === 0 ? 'Πέδιλα Meister' : `Fins ${index + 1}`,
  price: '80', regular_price: '80', sale_price: '', price_html: '80',
  type: 'simple', status: 'publish', on_sale: false, stock_status: 'instock', stock_quantity: 5,
  images: [], categories: [{ id: 86, name: 'Πέδιλα', slug: 'πέδιλα' }], attributes: [],
  description: '<p>&gt;Multiple dive modes<br>&gt;Wide variety of alarms</p>', short_description: '<p>Fins &amp; suits.</p>', sku: `FINS-${index + 1}`,
}))
products[1] = { ...products[1], type: 'variable', price: '60', price_html: '60–95',
  attributes: [{ name: 'Size', options: ['M', 'L'], variation: true, visible: true }] }
const variations = [
  { id: 101, price: '60', regular_price: '70', on_sale: true, stock_status: 'outofstock', attributes: [{ name: 'Size', option: 'M' }] },
  { id: 102, price: '95', regular_price: '95', on_sale: false, stock_status: 'onbackorder', attributes: [{ name: 'Size', option: '' }] },
]
const backend = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost')
  const id = url.pathname.match(/^\/wp-json\/wc\/v3\/products\/(\d+)$/)?.[1]
  const product = id ? products.find(product => product.id === Number(id)) : undefined
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('X-WP-TotalPages', '1')
  response.setHeader('X-WP-Total', String(products.length))
  if (url.pathname === '/wp-json/wc/v3/products/2/variations') { response.end(JSON.stringify(variations)) }
  else if (id) {
    response.statusCode = product ? 200 : 404
    response.end(JSON.stringify(product || { message: 'Not found' }))
  } else if (url.pathname === '/wp-json/wc/v3/products') {
    const slug = url.searchParams.get('slug')
    response.end(JSON.stringify(slug ? products.filter(product => decodeURIComponent(product.slug) === slug) : products))
  } else { response.statusCode = 404; response.end('{}') }
})
backend.listen(0, '127.0.0.1')
await once(backend, 'listening')
const fixtureURL = `http://127.0.0.1:${backend.address().port}`
const baseURL = 'http://127.0.0.1:3002'
const canonical = 'https://meister-storefront.vercel.app'
let browser, server, log

async function start(mode, mock = false) {
  log = openSync(`/tmp/meister-seo-${mode}.log`, 'w')
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3002'], {
    cwd: new URL('../', import.meta.url), stdio: ['ignore', log, log],
    env: { ...process.env, VERCEL_ENV: mode, NEXT_PUBLIC_SITE_URL: canonical, NEXT_PUBLIC_USE_MOCK_DATA: String(mock),
      NEXT_PUBLIC_WC_URL: fixtureURL, WC_CONSUMER_KEY: 'fixture-key', WC_CONSUMER_SECRET: 'fixture-secret',
      NODE_USE_ENV_PROXY: '1', NO_PROXY: `${process.env.NO_PROXY || ''},127.0.0.1,localhost` },
  })
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next exited; inspect /tmp/meister-seo-${mode}.log`)
    try { if ((await fetch(`${baseURL}/robots.txt`, { signal: AbortSignal.timeout(1500) })).ok) return } catch { /* Server is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error(`Next did not start; inspect /tmp/meister-seo-${mode}.log`)
}
async function stop() {
  if (server && server.exitCode === null) { const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited }
  if (log !== undefined) closeSync(log)
  server = undefined; log = undefined
}
async function snapshot(page, path) {
  const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'load' })
  return { status: response.status(), headers: response.headers(), ...await page.evaluate(() => ({
    title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.href,
    robots: document.querySelector('meta[name="robots"]')?.content,
    ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    twitter: document.querySelector('meta[name="twitter:card"]')?.content,
    description: document.querySelector('meta[name="description"]')?.content,
  })) }
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await start('production')
  for (const path of ['/', '/shop', '/fins']) {
    const meta = await snapshot(page, path)
    assert.equal(meta.status, 200)
    assert.equal(new URL(meta.canonical).href, canonical + path)
    assert.doesNotMatch(meta.robots, /noindex/)
    assert.equal(new URL(meta.ogUrl).href, canonical + path)
    assert.equal(meta.twitter, 'summary_large_image')
  }
  const product = await snapshot(page, `/products/${products[0].slug}`)
  assert.equal(product.status, 200)
  assert.equal(product.canonical, `${canonical}/products/${products[0].slug}`)
  assert.equal(product.description, 'Fins & suits.')
  const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => JSON.parse(node.textContent)))
  const productSchema = schemas.find(schema => schema['@type'] === 'Product')
  assert.equal(productSchema.url, product.canonical)
  assert.equal(productSchema.offers.price, 80)
  assert.equal(productSchema.offers.url, product.canonical)
  assert.equal(productSchema.offers.priceCurrency, 'EUR')
  const breadcrumbSchema = schemas.find(schema => schema['@type'] === 'BreadcrumbList')
  assert.deepEqual(breadcrumbSchema.itemListElement.map(item => item.item), [canonical + '/', canonical + '/fins', product.canonical])
  assert.deepEqual(await page.locator('.product-prose ul li').allTextContents(), ['Multiple dive modes', 'Wide variety of alarms'])
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  console.log('PASS: rendered Product/Breadcrumb schema, canonical offer URL and readable legacy description on mobile')
  await snapshot(page, '/products/fins-2')
  const variable = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => JSON.parse(node.textContent)).find(schema => schema['@type'] === 'Product'))
  assert.equal(variable.offers.lowPrice, 60)
  assert.equal(variable.offers.highPrice, 95)
  assert.deepEqual(variable.offers.offers.map(offer => offer.availability), ['https://schema.org/OutOfStock', 'https://schema.org/BackOrder'])
  console.log('PASS: rendered variable offer range and per-variation availability')
  const paged = await snapshot(page, '/fins?page=999')
  assert.equal(paged.canonical, `${canonical}/fins?page=2`)
  assert.match(paged.title, /Page 2/)
  const filtered = await snapshot(page, '/shop?brand=Meister&sort=price-asc')
  assert.equal(filtered.canonical, `${canonical}/shop`)
  assert.match(filtered.robots, /noindex/)
  for (const path of ['/cart', '/checkout', '/sign-in', '/sign-up', '/account', '/search?q=fins']) {
    const meta = await snapshot(page, path)
    assert.match(meta.robots, /noindex/)
    assert.match(meta.headers['x-robots-tag'], /noindex/)
  }
  const missing = await snapshot(page, '/products/missing')
  assert.equal(missing.status, 404)
  assert.match(missing.robots, /noindex/)
  const robots = await (await fetch(`${baseURL}/robots.txt`)).text()
  assert.match(robots, /Allow: \/\n/)
  assert.match(robots, /Disallow: \/api\//)
  assert.ok(robots.includes(`Sitemap: ${canonical}/sitemap.xml`))
  const sitemap = await fetch(`${baseURL}/sitemap.xml`)
  assert.equal(sitemap.status, 200)
  assert.match(sitemap.headers.get('Content-Type'), /application\/xml/)
  const xml = await sitemap.text()
  assert.equal((xml.match(/<loc>/g) || []).length, 39)
  assert.doesNotMatch(xml, /localhost|lastmod|cart|checkout/)
  console.log('PASS: rendered production metadata, Greek URLs, pagination, noindex headers, robots and real-only sitemap')
  await stop()
  await start('preview')
  const preview = await snapshot(page, '/shop')
  assert.match(preview.robots, /noindex/)
  assert.match(preview.headers['x-robots-tag'], /noindex/)
  assert.equal(preview.canonical, `${canonical}/shop`)
  assert.match(await (await fetch(`${baseURL}/robots.txt`)).text(), /Disallow: \/\n/)
  assert.doesNotMatch(await (await fetch(`${baseURL}/sitemap.xml`)).text(), /<loc>/)
  console.log('PASS: preview indexing exclusion and empty preview sitemap (local deployment-mode simulation)')
  await stop()
  await start('production', true)
  await snapshot(page, '/products/carbon-blade-fins')
  const demoSchemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => JSON.parse(node.textContent)))
  assert.ok(!demoSchemas.some(schema => schema['@type'] === 'Product'))
  console.log('PASS: mock catalog cannot publish Product structured data')
} finally {
  await browser?.close()
  await stop()
  backend.close()
  await once(backend, 'close')
}
