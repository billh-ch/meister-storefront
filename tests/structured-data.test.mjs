import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const schema = await import('../lib/seo/structured-data.ts').catch(() => ({}))
const url = 'https://meister-storefront.vercel.app/products/fins'
const base = { name: 'Fins', slug: 'fins', type: 'simple', price: 80, regularPrice: 100, onSale: true,
  stockStatus: 'instock', priceFrom: false, descriptionHtml: '<p>Fins &amp; straps.</p>', gallery: [], image: '', sku: '', brand: null, variants: [], attributes: [] }
const variant = (id, price, stockStatus, attributes = { Size: 'M' }) => ({ id, price, stockStatus, attributes })
test('simple offers use current sale price, canonical URL and actual availability', () => {
  assert.equal(typeof schema.buildProductStructuredData, 'function')
  for (const [stockStatus, availability] of [['instock', 'InStock'], ['outofstock', 'OutOfStock'], ['onbackorder', 'BackOrder']]) {
    const result = schema.buildProductStructuredData({ ...base, stockStatus }, url)
    assert.equal(result.description, 'Fins & straps.')
    assert.deepEqual(result.offers, { '@type': 'Offer', price: 80, priceCurrency: 'EUR', url, availability: `https://schema.org/${availability}` })
    for (const key of ['sku', 'brand', 'gtin', 'aggregateRating', 'review', 'itemCondition']) assert.equal(result[key], undefined)
    assert.equal(result.offers.priceValidUntil, undefined)
    assert.equal(result.offers.shippingDetails, undefined)
  }
})
test('variable offers reflect real variation prices and stock without inventing combinations', () => {
  const result = schema.buildProductStructuredData({ ...base, type: 'variable', priceFrom: true,
    attributes: [{ name: 'Size', values: ['M', 'L'], isVariationAxis: true }],
    variants: [variant('10', 60, 'outofstock'), variant('11', 95, 'onbackorder', { Size: '' })] }, url)
  assert.equal(result.offers['@type'], 'AggregateOffer')
  assert.equal(result.offers.lowPrice, 60)
  assert.equal(result.offers.highPrice, 95)
  assert.equal(result.offers.offerCount, 2)
  assert.equal(result.offers.availability, undefined)
  assert.equal(result.offers.offers[0].availability, 'https://schema.org/OutOfStock')
  assert.equal(result.offers.offers[1].availability, 'https://schema.org/BackOrder')
  assert.equal(result.offers.offers[1].name, undefined)
  assert.equal(result.offers.offers[1].sku, undefined)
})
test('legacy empty attributes cannot produce phantom variants or a false single floor-price offer', () => {
  const product = { ...base, type: 'variable', variants: [variant('10', 60, 'instock', {})] }
  assert.equal(schema.buildProductStructuredData({ ...product, priceFrom: true }, url).offers, undefined)
  assert.equal(schema.buildProductStructuredData(product, url).offers.price, 80)
  assert.equal(schema.buildProductStructuredData({ ...base, price: NaN }, url).offers, undefined)
})
test('breadcrumbs preserve visible order and script serialization cannot terminate its container', () => {
  const items = [{ name: 'Home', url: 'https://meister-storefront.vercel.app/' }, { name: '</script><script>alert(1)</script>', url }]
  const result = schema.buildBreadcrumbStructuredData(items)
  assert.equal(result.itemListElement[1].position, 2)
  assert.equal(result.itemListElement[1].item, url)
  const encoded = schema.serializeStructuredData(result)
  assert.ok(!encoded.includes('<'))
  assert.deepEqual(JSON.parse(encoded), result)
})
test('fully shadowed wildcard prices and ambiguous variations are not advertised as selectable offers', () => {
  const product = { ...base, type: 'variable', priceFrom: true,
    attributes: [{ name: 'Size', values: ['M', 'L'], isVariationAxis: true }],
    variants: [variant('10', 60, 'instock', { Size: '' }), variant('11', 80, 'instock', { Size: 'M' }), variant('12', 90, 'instock', { Size: 'L' })] }
  const offers = schema.buildProductStructuredData(product, url).offers
  assert.equal(offers.lowPrice, 80)
  assert.equal(offers.highPrice, 90)
  assert.equal(offers.offerCount, 2)
  const ambiguous = { ...product, variants: [variant('11', 80, 'instock'), variant('12', 90, 'instock')] }
  assert.equal(schema.buildProductStructuredData(ambiguous, url).offers, undefined)
})
