import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { shippingAmounts } = await import('../lib/woocommerce/mappers/map-shipping-rate.ts')

test('delivery is charged with VAT: the Store API price excludes it', () => {
  assert.deepEqual(shippingAmounts({ price: '242', taxes: '58', currency_minor_unit: 2 }), { cost: 3, netCost: 2.42 })
  assert.deepEqual(shippingAmounts({ price: '300', taxes: '72', currency_minor_unit: 2 }), { cost: 3.72, netCost: 3 })
  assert.deepEqual(shippingAmounts({ price: '0', taxes: '0', currency_minor_unit: 2 }), { cost: 0, netCost: 0 })
})

test('a rate without a taxes field (VAT off, or an older WooCommerce) is charged as quoted', () => {
  assert.deepEqual(shippingAmounts({ price: '500', currency_minor_unit: 2 }), { cost: 5, netCost: 5 })
  assert.deepEqual(shippingAmounts({ price: '500', taxes: '', currency_minor_unit: 2 }), { cost: 5, netCost: 5 })
})

test('unreadable amounts fail instead of charging a guess', () => {
  for (const bad of [{ price: '3.00', taxes: '0' }, { price: '300', taxes: '-72' }, { price: 'abc', taxes: '0' }]) {
    assert.throws(() => shippingAmounts({ ...bad, currency_minor_unit: 2 }), /unreadable delivery price/)
  }
})
