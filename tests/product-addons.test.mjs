import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'false'
process.env.NEXT_PUBLIC_WC_URL = 'https://woo.fixture.example'
process.env.WC_CONSUMER_KEY = 'fixture-key'
process.env.WC_CONSUMER_SECRET = 'fixture-secret'
process.env.WC_PROXY_TOKEN = 'fixture-proxy'

const contract = await import('../lib/addons/contract.ts')
const { parseAddons, addonsFromMetaData, localizeAddons, resolveAddonSelection, encodeAddonRefs, decodeAddonRefs, ADDON_REF_PATTERN, MAX_ADDON_REFS } = contract
const { cartItemSchema, addonRefsSchema } = await import('../lib/cart/schema.ts')
const { cartLineKey } = await import('../lib/cart/line-key.ts')
const { resolveCartItems, ADDON_UNAVAILABLE_ISSUE, ADDON_INVALID_ISSUE } = await import('../lib/cart/resolve.ts')
const { checkoutCartSignature } = await import('../lib/checkout/model.ts')
const { evaluateCoupon } = await import('../lib/coupons/evaluate.ts')
const { stripeProductLineItems, cartLinesMetadata } = await import('../lib/checkout/stripe-lines.ts')
const { orderTotalCheck } = await import('../lib/checkout/total-check.ts')
const { orderTotals } = await import('../lib/email/order.ts')

/* ---------------------------------------------------------------- fixtures */

const name = (en, el = `${en} ΕΛ`) => ({ en, el })
const wetsuitAddons = () => ({
  version: 1,
  groups: [
    { id: 'camo', type: 'single', name: name('Camo pattern'), options: [
      { id: 'split', name: name('Split camo pattern'), price: '30.00' },
      { id: 'full', name: name('Full camo pattern'), price: '40.00' },
    ] },
    { id: 'extras', type: 'multi', name: name('Extras'), options: [
      { id: 'elbow-pads', name: name('Elbow pads'), price: '25.00' },
      { id: 'knee-pads', name: name('Knee pads'), price: '25.00' },
      { id: 'velcro', name: name('Velcro'), price: '20.00' },
    ] },
  ],
})
const raw = (value) => JSON.stringify(value)
const groups = (config = wetsuitAddons(), locale = 'en') => localizeAddons(parseAddons(raw(config)), locale)

/* ---------------------------------------------------------------- contract */

test('a valid definition parses into whole-cent prices', () => {
  const parsed = parseAddons(raw(wetsuitAddons()))
  assert.equal(parsed.version, 1)
  assert.deepEqual(parsed.groups.map(group => [group.id, group.type, group.options.map(option => [option.id, option.priceCents])]), [
    ['camo', 'single', [['split', 3000], ['full', 4000]]],
    ['extras', 'multi', [['elbow-pads', 2500], ['knee-pads', 2500], ['velcro', 2000]]],
  ])
  assert.equal(groups(wetsuitAddons(), 'el')[0].name, 'Camo pattern ΕΛ')
})

test('anything outside the contract means no add-ons (fail closed)', () => {
  const variants = {
    'invalid JSON': '{"version":1,',
    'not a string': wetsuitAddons(),
    'empty string': '',
    'unknown version': raw({ ...wetsuitAddons(), version: 2 }),
    'version as string': raw({ ...wetsuitAddons(), version: '1' }),
    'extra top-level key': raw({ ...wetsuitAddons(), extra: true }),
    'no groups': raw({ version: 1, groups: [] }),
    'groups not a list': raw({ version: 1, groups: {} }),
  }
  const mutate = (fn) => { const config = wetsuitAddons(); fn(config); return raw(config) }
  Object.assign(variants, {
    'uppercase id': mutate(c => { c.groups[0].id = 'Camo' }),
    'id with spaces': mutate(c => { c.groups[0].options[0].id = 'split camo' }),
    'id with double hyphen': mutate(c => { c.groups[0].options[0].id = 'split--camo' }),
    'duplicate group id': mutate(c => { c.groups[1].id = 'camo' }),
    'option id reused across groups': mutate(c => { c.groups[1].options[0].id = 'split' }),
    'duplicate option id in a group': mutate(c => { c.groups[1].options[1].id = 'elbow-pads' }),
    'unknown group type': mutate(c => { c.groups[0].type = 'required' }),
    'required flag (not in v1)': mutate(c => { c.groups[0].required = true }),
    'missing Greek name': mutate(c => { delete c.groups[0].name.el }),
    'empty English name': mutate(c => { c.groups[0].options[0].name.en = '' }),
    'name with markup': mutate(c => { c.groups[0].options[0].name.en = '<b>Split</b>' }),
    'name with control character': mutate(c => { c.groups[0].options[0].name.en = 'Split\u0007' }),
    'name with padding': mutate(c => { c.groups[0].options[0].name.en = ' Split' }),
    'name too long': mutate(c => { c.groups[0].options[0].name.el = 'α'.repeat(81) }),
    'empty option list': mutate(c => { c.groups[0].options = [] }),
    'price as number': mutate(c => { c.groups[0].options[0].price = 30 }),
    'price without decimals': mutate(c => { c.groups[0].options[0].price = '30' }),
    'price with one decimal': mutate(c => { c.groups[0].options[0].price = '30.0' }),
    'price with comma': mutate(c => { c.groups[0].options[0].price = '30,00' }),
    'zero price': mutate(c => { c.groups[0].options[0].price = '0.00' }),
    'negative price': mutate(c => { c.groups[0].options[0].price = '-30.00' }),
    'leading zero price': mutate(c => { c.groups[0].options[0].price = '030.00' }),
    'extra option key': mutate(c => { c.groups[0].options[0].sku = 'x' }),
  })
  for (const [label, value] of Object.entries(variants)) assert.equal(parseAddons(value), null, label)
  assert.equal(parseAddons('x'.repeat(20_001)), null, 'oversized meta value')
  const many = { version: 1, groups: Array.from({ length: 11 }, (_, i) => ({ id: `g${i}`, type: 'multi', name: name('G'), options: [{ id: `o${i}`, name: name('O'), price: '1.00' }] })) }
  assert.equal(parseAddons(raw(many)), null, 'too many groups')
})

test('WooCommerce meta_data must hold exactly one add-ons entry', () => {
  const entry = { id: 9, key: 'meister_addons', value: raw(wetsuitAddons()) }
  assert.ok(addonsFromMetaData([{ key: 'other', value: 'x' }, entry]))
  assert.equal(addonsFromMetaData([entry, { ...entry, id: 10 }]), null)
  assert.equal(addonsFromMetaData([]), null)
  assert.equal(addonsFromMetaData(undefined), null)
})

test('the cart cookie schema uses the same reference rule as the contract', () => {
  for (const sample of ['camo:full', 'extras:knee-pads', 'a1:b2', 'camo', 'Camo:full', 'camo:full:x', 'camo:-full', 'camo:full-', 'c_a:full', 'κάμο:full']) {
    assert.equal(addonRefsSchema.safeParse([sample]).success, ADDON_REF_PATTERN.test(sample), sample)
  }
  assert.equal(addonRefsSchema.safeParse(Array(MAX_ADDON_REFS).fill('camo:full')).success, true)
  assert.equal(addonRefsSchema.safeParse(Array(MAX_ADDON_REFS + 1).fill('camo:full')).success, false)
  for (const bad of ['camo', 'camo:', ':full', 'Camo:full', 'camo:full:x', 'camo: full', 'camo:full,extras:velcro']) {
    assert.equal(cartItemSchema.safeParse({ productId: '7', quantity: 1, addons: [bad] }).success, false, bad)
  }
  assert.equal(cartItemSchema.safeParse({ productId: '7', quantity: 1, addons: [{ ref: 'camo:full', price: 0 }] }).success, false)
})

/* ---------------------------------------------------------------- selection / tampering */

test('selections resolve to live names and prices in a stable order', () => {
  const result = resolveAddonSelection(groups(), ['extras:velcro', 'camo:full', 'extras:knee-pads'])
  assert.equal(result.ok, true)
  assert.equal(result.totalCents, 8500)
  assert.deepEqual(result.chosen.map(addon => addon.ref), ['camo:full', 'extras:knee-pads', 'extras:velcro'])
  assert.deepEqual(resolveAddonSelection(groups(), []), { ok: true, chosen: [], totalCents: 0 })
  assert.deepEqual(resolveAddonSelection(groups(), undefined), { ok: true, chosen: [], totalCents: 0 })
})

test('tampered selections are refused', () => {
  const reason = (refs, list = groups()) => { const result = resolveAddonSelection(list, refs); return result.ok ? 'ok' : result.reason }
  assert.equal(reason(['camo:split', 'camo:full']), 'invalid', 'two options in a single group')
  assert.equal(reason(['extras:velcro', 'extras:velcro']), 'invalid', 'duplicate ids')
  assert.equal(reason(['camo:FULL']), 'invalid', 'malformed id')
  assert.equal(reason(['camo:gold']), 'unavailable', 'unknown option')
  assert.equal(reason(['stoles:full']), 'unavailable', 'unknown group')
  assert.equal(reason(['camo:velcro']), 'unavailable', 'option from another group')
  const otherProduct = groups({ version: 1, groups: [{ id: 'colour', type: 'single', name: name('Colour'), options: [{ id: 'red', name: name('Red'), price: '5.00' }] }] })
  assert.equal(reason(['colour:red']), 'unavailable', 'id from another product')
  assert.equal(reason(['camo:full'], otherProduct), 'unavailable', 'this product does not offer it')
  assert.equal(reason(['camo:full'], []), 'unavailable', 'product without add-ons')
  assert.equal(reason(Array.from({ length: MAX_ADDON_REFS + 1 }, (_, i) => `extras:o${i}`)), 'invalid')
})

test('Stripe metadata references round-trip and reject junk', () => {
  assert.equal(encodeAddonRefs(['extras:velcro', 'camo:full']), 'camo:full,extras:velcro')
  assert.deepEqual(decodeAddonRefs('camo:full,extras:velcro'), ['camo:full', 'extras:velcro'])
  assert.deepEqual(decodeAddonRefs(undefined), [])
  for (const bad of ['', 'camo:full,camo:full', 'camo:full,', 'camo', 5, ['camo:full']]) assert.equal(decodeAddonRefs(bad), null, String(bad))
})

test('different add-ons are different cart lines; the same set in any order is one line', () => {
  const base = { productId: '4465', variationId: '4473', selectedOptions: { Size: 'M' } }
  assert.notEqual(cartLineKey({ ...base, addons: ['camo:full'] }), cartLineKey({ ...base, addons: ['camo:split'] }))
  assert.notEqual(cartLineKey({ ...base, addons: ['camo:full'] }), cartLineKey(base))
  assert.equal(cartLineKey({ ...base, addons: ['camo:full', 'extras:velcro'] }), cartLineKey({ ...base, addons: ['extras:velcro', 'camo:full'] }))
  assert.equal(cartLineKey({ ...base, addons: [] }), cartLineKey(base), 'no add-ons keeps the existing identity')
  assert.equal(cartLineKey(base), '4465:4473:Size=M')
})

/* ---------------------------------------------------------------- live re-pricing */

const backend = { product: null, variations: [] }
function wcProduct({ addons = raw(wetsuitAddons()), pricing = 1, price = '290' } = {}) {
  return {
    id: 4465, name: 'Fixture wetsuit', slug: 'fixture-wetsuit', type: 'variable', status: 'publish', price, regular_price: '', sale_price: '', on_sale: false,
    price_html: '', images: [], categories: [{ id: 1, name: 'Suits', slug: 'suits' }], description: '', short_description: '', sku: 'FX', stock_status: 'instock', stock_quantity: null,
    attributes: [{ id: 1, name: 'Thickness', variation: true, visible: true, options: ['3mm', '5mm'] }],
    weight: '', dimensions: { length: '', width: '', height: '' },
    meta_data: addons === null ? [] : [{ id: 1, key: 'meister_addons', value: addons }],
    ...(pricing === null ? {} : { meister_addons_pricing: pricing }),
  }
}
const variation = (id, thickness, price) => ({ id, status: 'publish', price, regular_price: price, sale_price: '', on_sale: false, stock_status: 'instock', attributes: [{ id: 1, name: 'Thickness', option: thickness }] })
async function withWoo(setup, run) {
  const originalFetch = globalThis.fetch
  backend.product = wcProduct(setup.product)
  backend.variations = setup.variations ?? [variation(4473, '3mm', '290'), variation(4474, '5mm', '320')]
  globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    assert.equal(url.hostname, 'woo.fixture.example')
    if (url.pathname.endsWith('/products/4465/variations')) return Response.json(backend.variations)
    if (url.pathname.endsWith('/products/4465')) return Response.json(backend.product)
    return Response.json({ code: 'not_found' }, { status: 404 })
  }
  try { await run() } finally { globalThis.fetch = originalFetch }
}
const line = (addons, extra = {}) => ({ productId: '4465', variationId: '4474', quantity: 2, selectedOptions: { Thickness: '5mm' }, ...(addons ? { addons } : {}), ...extra })

test('the cart prices add-ons from WooCommerce, never from the cookie', async () => withWoo({}, async () => {
  // A hand-edited cookie can add any field it likes; the schema strips it and
  // resolution takes every amount from the live product.
  const forged = cartItemSchema.parse({ ...line(['camo:full', 'extras:knee-pads']), unitPrice: 1, price: '0.01', addonPrices: { 'camo:full': '0.01' } })
  assert.equal('unitPrice' in forged, false)
  const cart = await resolveCartItems([forged])
  const [resolved] = cart.lines
  assert.equal(resolved.baseUnitPrice, 320)
  assert.equal(resolved.unitPrice, 385)
  assert.deepEqual(resolved.chosenAddons.map(addon => [addon.optionName, addon.priceCents]), [['Full camo pattern', 4000], ['Knee pads', 2500]])
  assert.equal(resolved.purchasable, true)
  assert.equal(cart.subtotal, 770)
  assert.deepEqual(resolved.addons, ['camo:full', 'extras:knee-pads'])
}))

test('the same product with and without add-ons stays as separate priced lines', async () => withWoo({}, async () => {
  const cart = await resolveCartItems([line(['camo:split']), line(), line(['camo:split'], { quantity: 1 })])
  assert.equal(cart.lines.length, 2)
  assert.deepEqual(cart.lines.map(l => [l.quantity, l.unitPrice]), [[3, 350], [2, 320]])
  assert.equal(cart.subtotal, 3 * 350 + 2 * 320)
}))

test('add-ons work on made-to-measure and any-size variations alike', async () => withWoo({
  variations: [variation(4473, '3mm', '290'), variation(4474, '5mm', '370')],
}, async () => {
  const [resolved] = (await resolveCartItems([line(['camo:full', 'extras:elbow-pads', 'extras:velcro'])])).lines
  assert.equal(resolved.unitPrice, 370 + 40 + 25 + 20)
}))

test('a removed or tampered add-on makes the line unpurchasable instead of charging or dropping it', async () => {
  await withWoo({}, async () => {
    const [unknown] = (await resolveCartItems([line(['camo:gold'])])).lines
    assert.equal(unknown.purchasable, false)
    assert.equal(unknown.checkoutIssue, ADDON_UNAVAILABLE_ISSUE)
    const [twoInSingle] = (await resolveCartItems([line(['camo:full', 'camo:split'])])).lines
    assert.equal(twoInSingle.checkoutIssue, ADDON_INVALID_ISSUE)
    const cart = await resolveCartItems([line(['camo:gold']), line()])
    assert.equal(cart.subtotal, 640, 'unpurchasable lines never count')
  })
  for (const product of [{ pricing: null }, { pricing: 2 }, { pricing: '1' }, { addons: '{bad json' }, { addons: null }]) {
    await withWoo({ product }, async () => {
      const [resolved] = (await resolveCartItems([line(['camo:full'])])).lines
      assert.equal(resolved.purchasable, false, JSON.stringify(product))
      assert.equal(resolved.unitPrice, 320, 'no add-on price is ever charged when they are not offered')
    })
  }
})

test('a price change between adding to the cart and paying changes the checkout signature', async () => {
  let before
  await withWoo({}, async () => { before = await resolveCartItems([line(['camo:full'])]) })
  const changed = wetsuitAddons(); changed.groups[0].options[1].price = '45.00'
  await withWoo({ product: { addons: raw(changed) } }, async () => {
    const after = await resolveCartItems([line(['camo:full'])])
    assert.equal(after.lines[0].unitPrice, 365, 'the new price is what gets charged')
    assert.notEqual(checkoutCartSignature(after.lines), checkoutCartSignature(before.lines))
  })
  await withWoo({ variations: [variation(4473, '3mm', '290'), variation(4474, '5mm', '330')] }, async () => {
    const after = await resolveCartItems([line(['camo:full'])])
    assert.equal(after.lines[0].unitPrice, 370)
    assert.notEqual(checkoutCartSignature(after.lines), checkoutCartSignature(before.lines))
  })
  await withWoo({}, async () => {
    assert.equal(checkoutCartSignature((await resolveCartItems([line(['camo:full'])])).lines), checkoutCartSignature(before.lines), 'unchanged prices keep the signature')
  })
})

test('Greek shoppers see Greek add-on names at the same prices', async () => withWoo({}, async () => {
  const [resolved] = (await resolveCartItems([line(['camo:full'])], 'el')).lines
  assert.equal(resolved.chosenAddons[0].optionName, 'Full camo pattern ΕΛ')
  assert.equal(resolved.unitPrice, 360)
}))

/* ---------------------------------------------------------------- coupons & Stripe */

test('percent coupons discount the add-ons too, because they use the resolved unit price', async () => withWoo({}, async () => {
  const cart = await resolveCartItems([line(['camo:full', 'extras:knee-pads'])])
  const couponLines = cart.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, onSale: l.onSale, purchasable: l.purchasable }))
  const result = evaluateCoupon({ id: 1, code: 'TEN', status: 'publish', discount_type: 'percent', amount: '10' }, couponLines, { now: Date.now() })
  assert.deepEqual(result, { ok: true, code: 'TEN', discountCents: 7700 }, '10% of 2 × €385')
}))

test('Stripe line items charge exactly the resolved unit price and name the add-ons', async () => withWoo({}, async () => {
  const cart = await resolveCartItems([line(['extras:velcro', 'camo:full']), line()])
  const items = stripeProductLineItems(cart.lines, source => source)
  assert.deepEqual(items.map(item => [item.price_data.unit_amount, item.quantity]), [[38000, 2], [32000, 2]])
  // formatPrice uses Greek number formatting with a no-break space before €.
  assert.equal(items[0].price_data.product_data.description.replace(/\u00a0/g, ' '), 'Add-ons: Full camo pattern (+40,00 €), Velcro (+20,00 €)')
  assert.equal(items[1].price_data.product_data.description, undefined)
  const meta = JSON.parse(cartLinesMetadata(cart.lines))
  assert.deepEqual(meta[0], { p: '4465', v: '4474', q: 2, o: 'camo:full,extras:velcro' })
  assert.equal(meta[1].o, undefined)
}))

test('add-on ids are never dropped to fit Stripe metadata; checkout stops instead', () => {
  const addon = (ref) => ({ ref, groupId: 'g', optionId: 'o', groupName: 'G', optionName: 'O', priceCents: 100 })
  const make = (count, withAxes) => Array.from({ length: count }, (_, i) => ({
    productId: String(1000 + i), resolvedVariationId: String(2000 + i), quantity: 1,
    attributes: withAxes ? { Colour: 'Πράσινο - Green', Hardness: 'Medium' } : {}, variantAttributes: {},
    chosenAddons: [addon('camo:full'), addon('extras:knee-pads')],
  }))
  const reduced = JSON.parse(cartLinesMetadata(make(5, true)))
  assert.equal(reduced[0].a, undefined, 'optional axis labels go first')
  assert.equal(reduced[0].o, 'camo:full,extras:knee-pads')
  assert.equal(cartLinesMetadata(make(20, false)), null)
})

/* ---------------------------------------------------------------- WooCommerce total == Stripe total */

/**
 * The arithmetic WooCommerce applies to the plugin-priced line (prices
 * include VAT, `woocommerce_tax_round_at_subtotal = no`): the add-on plugin
 * hands WooCommerce the VAT-inclusive line price, WooCommerce removes VAT at
 * full precision (`wc_get_price_excluding_tax`), re-adds it per line rounded
 * to cents, and rounds the order total to cents. Percent coupons are applied
 * to the VAT-inclusive subtotal and split back into net + tax the same way.
 * This is a model, not WooCommerce; the real check ran on staging (see docs).
 */
function wooTotalCents(lines, { rate = 0.24, couponPercent = 0, shippingCents = 0 } = {}) {
  let total = 0
  for (const { grossUnitCents, quantity } of lines) {
    const grossCents = grossUnitCents * quantity
    const discountCents = Math.round(grossCents * couponPercent / 100)
    const net = (grossCents - discountCents) / 100 / (1 + rate)
    const tax = Math.round(net * rate * 100) / 100
    total += net + tax
  }
  return Math.round((total + shippingCents / 100) * 100)
}

test('the WooCommerce order total equals what Stripe charged, with and without a coupon', async () => {
  for (const price of ['290', '320', '289.90', '19.99', '435']) {
    await withWoo({ variations: [variation(4473, '3mm', '290'), variation(4474, '5mm', price)] }, async () => {
      for (const refs of [undefined, ['camo:split'], ['camo:full', 'extras:elbow-pads', 'extras:knee-pads', 'extras:velcro']]) {
        for (const quantity of [1, 2, 3]) {
          const cart = await resolveCartItems([line(refs, { quantity })])
          const stripeCents = stripeProductLineItems(cart.lines, s => s).reduce((sum, item) => sum + item.price_data.unit_amount * item.quantity, 0)
          const woo = wooTotalCents(cart.lines.map(l => ({ grossUnitCents: Math.round(l.unitPrice * 100), quantity: l.quantity })))
          assert.equal(woo, stripeCents, `price ${price}, ${refs}, ×${quantity}`)
          assert.equal(orderTotalCheck({ orderTotal: (woo / 100).toFixed(2), amountTotalCents: stripeCents, hasAddons: Boolean(refs) }), null)

          const couponLines = cart.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, onSale: false, purchasable: true }))
          const coupon = evaluateCoupon({ id: 1, code: 'TEN', status: 'publish', discount_type: 'percent', amount: '10' }, couponLines, { now: Date.now() })
          const paid = stripeCents - coupon.discountCents
          const wooDiscounted = wooTotalCents(cart.lines.map(l => ({ grossUnitCents: Math.round(l.unitPrice * 100), quantity: l.quantity })), { couponPercent: 10 })
          assert.equal(wooDiscounted, paid, `coupon: price ${price}, ${refs}, ×${quantity}`)
        }
      }
    })
  }
})

test('the total check runs for add-on orders without a coupon and compares whole cents', () => {
  assert.equal(orderTotalCheck({ orderTotal: '385.00', amountTotalCents: 38500, hasAddons: true }), null)
  assert.match(orderTotalCheck({ orderTotal: '320.00', amountTotalCents: 38500, hasAddons: true }), /Stripe charged €385\.00 but WooCommerce computed €320\.00 .*product add-ons/)
  assert.match(orderTotalCheck({ orderTotal: '346.49', amountTotalCents: 34650, hasAddons: true, couponCode: 'TEN' }), /discount code TEN and product add-ons/)
  assert.equal(orderTotalCheck({ orderTotal: '385.00', amountTotalCents: 38500, hasAddons: false }), null, 'plain matching orders pass')
  assert.match(orderTotalCheck({ orderTotal: '388.72', amountTotalCents: 38800, hasAddons: false }), /Stripe charged €388\.00 but WooCommerce computed €388\.72 for this order\. /, 'every order is checked now, e.g. delivery VAT')
  assert.equal(orderTotalCheck({ orderTotal: '0.1', amountTotalCents: 10, hasAddons: true }), null, '0.1 € is 10 cents, not a float mismatch')
})

/* ---------------------------------------------------------------- emails */

test('order emails list each add-on under its item from the WooCommerce line meta', () => {
  const totals = orderTotals({ id: 1, line_items: [{ name: 'Fixture wetsuit', quantity: 1, subtotal: '310.48', subtotal_tax: '74.52', meta_data: [
    { key: 'pa_thickness', value: '5mm', display_key: 'Thickness', display_value: '5mm' },
    { key: '_meister_addons', value: 'camo:full,extras:knee-pads' },
    { key: '_meister_addons_total', value: '65.00' },
    { key: 'Camo pattern', value: 'Full camo pattern (+€40.00)' },
    { key: 'Extras', value: 'Knee pads (+€25.00)' },
  ] }] })
  assert.deepEqual(totals.lines[0].options, ['Thickness: 5mm', 'Camo pattern: Full camo pattern (+€40.00)', 'Extras: Knee pads (+€25.00)'])
  assert.equal(totals.lines[0].gross, 38500)
})

test('the TypeScript parser agrees with every case in the shared contract fixture', async () => {
  const { readFile } = await import('node:fs/promises')
  const fixture = JSON.parse(await readFile(new URL('../wordpress/fixtures/product-addons-contract.json', import.meta.url), 'utf8'))
  assert.ok(fixture.cases.length >= 30)
  for (const { label, raw: value, valid } of fixture.cases) assert.equal(parseAddons(value) !== null, valid, label)
})
