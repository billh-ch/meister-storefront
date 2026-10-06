import test from 'node:test'
import assert from 'node:assert/strict'
import { countries, isCountryCode } from '../lib/address/countries.ts'
import { createRequestGuard } from '../lib/checkout/request-guard.ts'
import { products } from '../lib/mock-data.ts'
import { cartItemSchema } from '../lib/cart/schema.ts'
import { asUnavailableProductPreview } from '../lib/woocommerce/preview-product.ts'

test('outage previews cannot be mistaken for real numeric WooCommerce products', () => {
  const preview = asUnavailableProductPreview(products[0])
  assert.equal(preview.name, products[0].name)
  assert.equal(cartItemSchema.safeParse({ productId: preview.id, quantity: 1 }).success, false)
})

test('every development product can pass the real cart identity validation', () => {
  for (const product of products) {
    assert.equal(cartItemSchema.safeParse({ productId: product.id, quantity: 1 }).success, true, product.slug)
  }
  assert.equal(cartItemSchema.safeParse({ productId: '../customers', quantity: 1 }).success, false)
})

test('country names cover ISO destinations without accepting arbitrary two-letter input', () => {
  assert.equal(countries.length, 249)
  assert.equal(new Set(countries.map(country => country.code)).size, 249)
  assert.equal(countries.find(country => country.code === 'GR').name, 'Greece')
  assert.equal(countries.find(country => country.code === 'DE').name, 'Germany')
  assert.equal(isCountryCode('GR'), true)
  assert.equal(isCountryCode('CY'), true)
  for (const value of ['ZZ', 'UK', 'Germany', '', 'gr']) assert.equal(isCountryCode(value), false)
})

test('older shipping responses cannot replace the latest destination', async () => {
  const guard = createRequestGuard()
  let resolveOld
  const oldResponse = new Promise(resolve => { resolveOld = resolve })
  const oldIsCurrent = guard.begin()
  let displayed = []
  const oldTask = oldResponse.then(value => { if (oldIsCurrent()) displayed = value })
  const newIsCurrent = guard.begin()
  if (newIsCurrent()) displayed = ['Cyprus delivery']
  resolveOld(['Greece delivery'])
  await oldTask
  assert.deepEqual(displayed, ['Cyprus delivery'])
})

test('invalidating shipping requests discards pending successes and failures', () => {
  const guard = createRequestGuard()
  const isCurrent = guard.begin()
  guard.invalidate()
  assert.equal(isCurrent(), false)
  assert.equal(guard.begin()(), true)
})
