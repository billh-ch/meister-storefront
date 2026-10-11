import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'false'
const { resolveCartItems } = await import('../lib/cart/resolve.ts')
const { fetchShippingRates } = await import('../lib/woocommerce/queries/get-shipping-rates.ts')
const { quoteResolvedCart } = await import('../lib/checkout/shipping.ts')

const product = {
  id: 501, status: 'publish', name: 'Saved suit', slug: 'saved-suit', type: 'variable',
  price: '40', regular_price: '40', sale_price: '', price_html: '', on_sale: false,
  stock_status: 'instock', stock_quantity: null, images: [], categories: [],
  description: '', short_description: '', sku: 'SUIT', weight: '',
  dimensions: { length: '', width: '', height: '' },
  attributes: [{ id: 0, name: 'Size', visible: true, variation: true, options: ['S', 'M'] }],
}
const variant = (id, option, price = '40') => ({
  id, status: 'publish', price, regular_price: price, sale_price: '', on_sale: false,
  stock_status: 'instock', attributes: [{ id: 0, name: 'Size', option }],
})
async function backend(variations, run, changes = {}) {
  const previous = globalThis.fetch
  const keys = ['NEXT_PUBLIC_WC_URL', 'WC_CONSUMER_KEY', 'WC_CONSUMER_SECRET']
  const env = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  Object.assign(process.env, { NEXT_PUBLIC_WC_URL: 'https://fixture.invalid', WC_CONSUMER_KEY: 'fixture', WC_CONSUMER_SECRET: 'fixture' })
  globalThis.fetch = async url => Response.json(String(url).includes('/variations') ? variations : { ...product, ...changes })
  try { await run() } finally {
    globalThis.fetch = previous
    for (const key of keys) if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key]
  }
}
test('an old variable cart without a size stays removable and identifies its missing option', async () => {
  await backend([variant(601, 'S')], async () => {
    const cart = await resolveCartItems([{ productId: '501', quantity: 1 }])
    assert.equal(cart.lines.length, 1)
    assert.equal(cart.lines[0].purchasable, false)
    assert.match(cart.lines[0].checkoutIssue, /Size/)
    assert.equal(cart.subtotal, 0)
  })
})
test('a saved variation ID recovers its pinned size without requiring a new cart', async () => {
  await backend([variant(601, 'S')], async () => {
    const cart = await resolveCartItems([{ productId: '501', variationId: '601', quantity: 2 }])
    assert.equal(cart.lines[0].purchasable, true)
    assert.deepEqual(cart.lines[0].attributes, { Size: 'S' })
    assert.equal(cart.subtotal, 80)
  })
})
test('an Any size variation keeps the actual saved size rather than an empty pinned value', async () => {
  await backend([variant(601, '')], async () => {
    const cart = await resolveCartItems([{ productId: '501', variationId: '601', selectedOptions: { Size: 'M' }, quantity: 1 }])
    assert.deepEqual(cart.lines[0].attributes, { Size: 'M' })
    assert.equal(cart.lines[0].purchasable, true)
  })
})
test('a removed size is rejected before it reaches shipping', async () => {
  await backend([variant(601, '')], async () => {
    const cart = await resolveCartItems([{ productId: '501', variationId: '601', selectedOptions: { Size: 'XL' }, quantity: 1 }])
    assert.equal(cart.lines[0].purchasable, false)
    assert.match(cart.lines[0].checkoutIssue, /Size/)
  })
})
test('a stale variation ID recovers only a unique match and preserves the stored line identity', async () => {
  await backend([variant(602, 'M', '55')], async () => {
    const cart = await resolveCartItems([{ productId: '501', variationId: '601', selectedOptions: { Size: 'M' }, quantity: 1 }])
    assert.equal(cart.lines.length, 1)
    assert.equal(cart.lines[0].variationId, '601')
    assert.equal(cart.lines[0].resolvedVariationId, '602')
    assert.equal(cart.lines[0].unitPrice, 55)
    assert.equal(cart.lines[0].purchasable, true)
  })
})
test('ambiguous saved selections do not guess a variation or charge the parent price', async () => {
  await backend([variant(601, 'M', '40'), variant(602, 'M', '55')], async () => {
    const cart = await resolveCartItems([{ productId: '501', selectedOptions: { Size: 'M' }, quantity: 1 }])
    assert.equal(cart.lines[0].purchasable, false)
    assert.match(cart.lines[0].checkoutIssue, /options/i)
  })
})
test('legacy Woo variations without metadata still accept complete saved parent selections', async () => {
  await backend([{ ...variant(601, ''), attributes: [] }], async () => {
    const cart = await resolveCartItems([{ productId: '501', selectedOptions: { Size: 'M' }, quantity: 1 }])
    assert.equal(cart.lines[0].purchasable, true)
    assert.deepEqual(cart.lines[0].attributes, { Size: 'M' })
  })
})

test('a saved variation on a product that is now simple cannot reach payment with stale variation metadata', async () => {
  await backend([], async () => {
    const cart = await resolveCartItems([{ productId: '501', variationId: '601', quantity: 1 }])
    assert.equal(cart.lines[0].purchasable, false)
    assert.match(cart.lines[0].checkoutIssue, /options/i)
  }, { type: 'simple', attributes: [] })
})
test('a unique all-wildcard variation recovers a stale ID with its own current price', async () => {
  await backend([variant(602, '', '55')], async () => {
    const cart = await resolveCartItems([{ productId: '501', variationId: '601', selectedOptions: { Size: 'M' }, quantity: 1 }])
    assert.equal(cart.lines[0].purchasable, true)
    assert.equal(cart.lines[0].resolvedVariationId, '602')
    assert.equal(cart.lines[0].unitPrice, 55)
  })
})
test('missing variation metadata with different prices never charges the parent floor price', async () => {
  await backend([variant(601, '', '40'), variant(602, '', '55')].map(v => ({ ...v, attributes: [] })), async () => {
    const cart = await resolveCartItems([{ productId: '501', selectedOptions: { Size: 'M' }, quantity: 1 }])
    assert.equal(cart.lines[0].purchasable, false)
    assert.match(cart.lines[0].checkoutIssue, /options/i)
  })
})
test('shipping preserves the Woo error code and failing cart product without exposing its message', async () => {
  await backend([], async () => {
    globalThis.fetch = async url => String(url).endsWith('/cart')
      ? Response.json({}, { headers: { 'cart-token': 'fixture' } })
      : Response.json({ code: 'woocommerce_rest_cart_missing_variation', message: 'Private upstream detail' }, { status: 400 })
    await assert.rejects(fetchShippingRates([{ productId: 501, quantity: 1 }], { country: 'GR' }), error => {
      assert.equal(error.code, 'woocommerce_rest_cart_missing_variation')
      assert.equal(error.productId, 501)
      assert.equal(error.status, 400)
      assert.doesNotMatch(error.message, /Private upstream detail/)
      return true
    })
  })
})
test('shipping sessions and quotes are uncached and requests have a timeout signal', async () => {
  await backend([], async () => {
    globalThis.fetch = async (url, init) => {
      assert.equal(init.cache, 'no-store')
      assert.ok(init.signal)
      return Response.json({ shipping_rates: [{ shipping_rates: [{ rate_id: 'flat_rate:1', method_id: 'flat_rate', name: 'Greece delivery', price: '300', currency_minor_unit: 2 }] }] }, { headers: { 'cart-token': 'fixture' } })
    }
    const rates = await fetchShippingRates([{ productId: 501, quantity: 1 }], { country: 'GR' })
    assert.equal(rates[0].price, '300')
  })
})

test('equivalent normalized delivery addresses share a key, but changed destinations do not', async () => {
  const model = await import('../lib/checkout/model.ts')
  assert.equal(typeof model.normalizeShippingAddress, 'function')
  const first = model.normalizeShippingAddress({ country: ' gr ', city: ' Athens ', postcode: '10558', address1: 'Ermou 1' })
  const second = model.normalizeShippingAddress({ country: 'GR', city: 'Athens', postcode: ' 10558 ', address1: 'Ermou 1 ' })
  assert.deepEqual(first, second)
  assert.notDeepEqual(first, model.normalizeShippingAddress({ ...second, country: 'CY' }))
})

test('incomplete saved carts return a named cart issue without attempting a delivery request', async () => {
  await backend([variant(601, 'S')], async () => {
    const cart = await resolveCartItems([{ productId: '501', quantity: 1 }])
    globalThis.fetch = async () => { throw Error('Delivery must not be requested') }
    const quote = await quoteResolvedCart(cart, { country: 'GR' })
    assert.equal(quote.status, 'cart')
    assert.equal(quote.issues[0].name, 'Saved suit')
    assert.match(quote.issues[0].message, /Size/)
  })
})
test('an upstream delivery outage stays an error rather than a successful empty methods list', async () => {
  await backend([variant(601, 'S')], async () => {
    const cart = await resolveCartItems([{ productId: '501', variationId: '601', quantity: 1 }])
    globalThis.fetch = async () => Response.json({ code: 'store_offline' }, { status: 503 })
    const quote = await quoteResolvedCart(cart, { country: 'GR' })
    assert.equal(quote.status, 'error')
    assert.match(quote.error, /try again/i)
    assert.equal('methods' in quote, false)
  })
})
test('a genuinely empty delivery result is distinct from an upstream failure', async () => {
  await backend([variant(601, 'S')], async () => {
    const cart = await resolveCartItems([{ productId: '501', variationId: '601', quantity: 1 }])
    globalThis.fetch = async () => Response.json({ shipping_rates: [] }, { headers: { 'cart-token': 'fixture' } })
    const quote = await quoteResolvedCart(cart, { country: 'GR' })
    assert.equal(quote.status, 'ready')
    assert.deepEqual(quote.methods, [])
  })
})
