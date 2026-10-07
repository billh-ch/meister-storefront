import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { getPublicSiteUrl, canonicalProductUrl, isIndexingAllowed } = await import('../lib/seo/site.ts')
const { plainTextDescription, buildPageMetadata, buildCollectionMetadata, buildProductMetadata, buildRobots } = await import('../lib/seo/metadata.ts')
const { buildSitemapUrls, sitemapResponse } = await import('../lib/seo/sitemap.ts')
const production = { VERCEL_ENV: 'production' }
const base = 'https://meister-storefront.vercel.app'

test('public URLs use the configured production origin and encode Greek slugs once', () => {
  assert.equal(getPublicSiteUrl({}).origin, base)
  assert.equal(getPublicSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://shop.example.com/' }).origin, 'https://shop.example.com')
  for (const value of ['http://localhost:3000', 'https://user:pass@example.com', 'https://example.com/shop']) {
    assert.throws(() => getPublicSiteUrl({ NEXT_PUBLIC_SITE_URL: value }))
  }
  assert.equal(canonicalProductUrl('πέδιλα'), `${base}/products/${encodeURIComponent('πέδιλα')}`)
  assert.equal(canonicalProductUrl(encodeURIComponent('πέδιλα')), canonicalProductUrl('πέδιλα'))
  assert.equal(canonicalProductUrl('100%'), `${base}/products/100%25`)
  assert.equal(canonicalProductUrl('x/y?z'), `${base}/products/x%2Fy%3Fz`)
})

test('only production real-data pages allow indexing', () => {
  assert.equal(isIndexingAllowed(production), true)
  for (const env of [{ VERCEL_ENV: 'preview' }, { NODE_ENV: 'development' }, { ...production, NEXT_PUBLIC_USE_MOCK_DATA: 'true' }]) {
    assert.equal(isIndexingAllowed(env), false)
    assert.equal(buildPageMetadata({ title: 'Shop', description: 'Equipment', path: '/shop' }, env).robots.index, false)
    assert.deepEqual(buildRobots(env).rules, { userAgent: '*', disallow: '/' })
  }
  assert.equal(buildRobots(production).sitemap, `${base}/sitemap.xml`)
})

test('metadata describes content, decodes entities and truncates without broken Unicode', () => {
  assert.equal(plainTextDescription('<p>Fins &amp; suits</p><p>B&uuml;hlmann &#x1F30A;</p><script>secret</script>', 160), 'Fins & suits Bühlmann 🌊')
  assert.equal(plainTextDescription('A🌊B', 2), 'A🌊')
  const metadata = buildPageMetadata({ title: 'Fins', description: 'Carbon fins', path: '/fins' }, production)
  assert.equal(metadata.alternates.canonical, `${base}/fins`)
  assert.equal(metadata.openGraph.url, `${base}/fins`)
  assert.equal(metadata.twitter.title, 'Fins')
  const privatePage = buildPageMetadata({ title: 'Cart', description: 'Your cart', path: '/cart', noindex: true }, production)
  assert.equal(privatePage.robots.index, false)
})

test('pagination canonicals match displayed pages while filtered/sorted views are excluded', () => {
  const input = { title: 'Fins — Meister', description: 'Freediving fins', path: '/fins', currentPage: 2, searchParams: { page: '999' } }
  const paged = buildCollectionMetadata(input, production)
  assert.equal(paged.alternates.canonical, `${base}/fins?page=2`)
  assert.match(paged.title, /Page 2/)
  assert.equal(paged.robots.index, true)
  for (const searchParams of [{ brand: 'Meister', page: '2' }, { sort: 'price-asc' }, { minPrice: 'bad' }]) {
    const filtered = buildCollectionMetadata({ ...input, searchParams }, production)
    assert.equal(filtered.alternates.canonical, `${base}/fins`)
    assert.equal(filtered.robots.index, false)
  }
  const tracked = buildCollectionMetadata({ ...input, currentPage: 1, searchParams: { utm_source: 'email' } }, production)
  assert.equal(tracked.alternates.canonical, `${base}/fins`)
  assert.equal(tracked.robots.index, true)
})

test('product metadata uses real product content and excludes outage fallback products', () => {
  const product = { id: '2627', slug: '%CF%80%CE%AD%CE%B4%CE%B9%CE%BB%CE%B1', name: 'Πέδιλα', shortDescriptionHtml: '<p>Fins &amp; accessories</p>', descriptionHtml: '', gallery: [{ src: 'https://images.example.com/fins.jpg' }] }
  const metadata = buildProductMetadata(product, production)
  assert.equal(metadata.description, 'Fins & accessories')
  assert.equal(metadata.alternates.canonical, canonicalProductUrl(product.slug))
  assert.equal(metadata.openGraph.images[0].url, product.gallery[0].src)
  assert.equal(buildProductMetadata({ ...product, id: 'preview:1' }, production).robots.index, false)
})

test('sitemap contains only real catalog URLs and excludes duplicate/mock/private entries', async () => {
  const products = [{ id: '1', slug: 'πέδιλα' }, { id: '2', slug: encodeURIComponent('πέδιλα') }]
  const urls = buildSitemapUrls(products, ['fins'], production)
  assert.deepEqual(urls, [`${base}/`, `${base}/shop`, `${base}/fins`, canonicalProductUrl('πέδιλα')])
  assert.throws(() => buildSitemapUrls([{ id: 'preview:1', slug: 'fake' }], [], production))
  const success = await sitemapResponse(async () => products, ['fins'], production)
  assert.equal(success.status, 200)
  const xml = await success.text()
  assert.match(xml, /sitemaps.org\/schemas\/sitemap\/0.9/)
  assert.doesNotMatch(xml, /lastmod|checkout|cart|privacy|fake/)
  const failure = await sitemapResponse(async () => { throw new Error('backend down') }, ['fins'], production)
  assert.equal(failure.status, 503)
  assert.equal(failure.headers.get('Retry-After'), '60')
  assert.match(failure.headers.get('Cache-Control'), /no-store/)
  assert.doesNotMatch(await failure.text(), /fake|backend down/)
  let requested = false
  const preview = await sitemapResponse(async () => { requested = true; return products }, ['fins'], { VERCEL_ENV: 'preview' })
  assert.equal(preview.status, 200)
  assert.equal(requested, false)
  assert.doesNotMatch(await preview.text(), /<loc>/)
})

test('published sitemap retrieval never falls back to demo content or silently truncates the catalog', async () => {
  const savedFetch = globalThis.fetch
  const savedEnv = Object.fromEntries(['NEXT_PUBLIC_WC_URL', 'WC_CONSUMER_KEY', 'WC_CONSUMER_SECRET', 'NEXT_PUBLIC_USE_MOCK_DATA'].map(key => [key, process.env[key]]))
  Object.assign(process.env, { NEXT_PUBLIC_WC_URL: 'https://woo.example', WC_CONSUMER_KEY: 'test-key', WC_CONSUMER_SECRET: 'test-secret', NEXT_PUBLIC_USE_MOCK_DATA: 'false' })
  const product = { id: 1, slug: 'fins', name: 'Fins', price: '80', price_html: '80', images: [], categories: [], attributes: [], type: 'simple', status: 'publish', stock_status: 'instock', on_sale: false }
  let phase = 'success'
  globalThis.fetch = async () => phase === 'outage'
    ? new Response('unavailable', { status: 503 })
    : new Response(JSON.stringify([product, { ...product, id: 2, status: 'draft' }]), { headers: { 'Content-Type': 'application/json', 'X-WP-TotalPages': phase === 'oversized' ? '11' : '1' } })
  try {
    const { getPublishedProducts } = await import('../lib/woocommerce/index.ts')
    assert.equal(typeof getPublishedProducts, 'function', 'Sitemap needs a real-only catalog loader')
    assert.deepEqual((await getPublishedProducts()).map(product => product.id), ['1'])
    phase = 'outage'
    await assert.rejects(getPublishedProducts(), /503/)
    phase = 'oversized'
    await assert.rejects(getPublishedProducts(), /limit/)
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true'
    await assert.rejects(getPublishedProducts(), /demo/i)
  } finally {
    globalThis.fetch = savedFetch
    for (const [key, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
})

test('HTTP indexing rules cover protected redirects and all preview URLs', async () => {
  const { buildIndexingHeaders } = await import('../lib/seo/site.ts')
  assert.ok(buildIndexingHeaders(production).some(rule => rule.source === '/account/:path*' && rule.headers[0].value.includes('noindex')))
  assert.ok(buildIndexingHeaders(production).some(rule => rule.source === '/search'))
  assert.equal(buildIndexingHeaders({ VERCEL_ENV: 'preview' })[0].source, '/:path*')
})
