import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { evaluateCoupon, normalizeCouponCode } = await import('../lib/coupons/evaluate.ts')

const NOW = Date.parse('2026-11-17T12:00:00Z')
const lines = [
  { productId: '10', quantity: 2, unitPrice: 40, onSale: false, purchasable: true },   // €80
  { productId: '20', quantity: 1, unitPrice: 20.5, onSale: true, purchasable: true },  // €20.50
]
const coupon = (overrides = {}) => ({ id: 1, code: 'TESTCOUPON', status: 'publish', discount_type: 'percent', amount: '10', ...overrides })
const run = (overrides, extra = {}, cart = lines) => evaluateCoupon(coupon(overrides), cart, { now: NOW, ...extra })

test('percentage coupons discount products by whole cents', () => {
  assert.deepEqual(run({}), { ok: true, code: 'TESTCOUPON', discountCents: 1005 })
  assert.equal(run({ amount: '33.33' }).discountCents, 3350)
})
test('fixed cart coupons never exceed the eligible products', () => {
  assert.equal(run({ discount_type: 'fixed_cart', amount: '15' }).discountCents, 1500)
  assert.equal(run({ discount_type: 'fixed_cart', amount: '500' }).discountCents, 10050)
})
test('unsupported or unpublished coupons are rejected, never silently ignored', () => {
  for (const overrides of [{ discount_type: 'fixed_product' }, { free_shipping: true }, { product_categories: [3] }, { excluded_product_categories: [3] }, { email_restrictions: ['a@b.c'] }]) {
    const result = run(overrides)
    assert.equal(result.ok, false, JSON.stringify(overrides))
    assert.equal(result.error, "This discount code can't be used online.")
  }
  assert.equal(run({ status: 'draft' }).error, "This discount code isn't valid.")
  assert.equal(run({ amount: '0' }).ok, false)
})
test('expiry uses the stored GMT time', () => {
  assert.equal(run({ date_expires_gmt: '2026-11-17T11:59:59' }).error, 'This discount code has expired.')
  assert.equal(run({ date_expires_gmt: '2026-11-17T12:00:01' }).ok, true)
  assert.equal(run({ date_expires_gmt: null }).ok, true)
})
test('usage limits are enforced', () => {
  assert.equal(run({ usage_limit: 5, usage_count: 5 }).error, 'This discount code has reached its usage limit.')
  assert.equal(run({ usage_limit: 5, usage_count: 4 }).ok, true)
  assert.equal(run({ usage_limit: 0, usage_count: 99 }).ok, true)
})
test('per-customer limits match by email or account id and only once the shopper is known', () => {
  const used = { usage_limit_per_user: 1, used_by: ['Shopper@Example.com', '77'] }
  assert.equal(run(used, { email: 'shopper@example.com' }).error, 'You have already used this discount code.')
  assert.equal(run(used, { customerId: 77 }).error, 'You have already used this discount code.')
  assert.equal(run(used, { email: 'other@example.com' }).ok, true)
  assert.equal(run(used).ok, true, 'unknown shopper is checked again when payment starts')
})
test('minimum and maximum spend use the whole purchasable cart', () => {
  assert.deepEqual(run({ minimum_amount: '150' }), { ok: false, error: 'Spend at least {amount} to use this code.', values: { amount: '€150.00' } })
  assert.equal(run({ minimum_amount: '100.50' }).ok, true)
  assert.equal(run({ maximum_amount: '100' }).error, 'This code only applies to orders up to {amount}.')
})
test('product restrictions and sale exclusion only discount eligible lines', () => {
  assert.equal(run({ product_ids: [10] }).discountCents, 800)
  assert.equal(run({ excluded_product_ids: [10] }).discountCents, 205)
  assert.equal(run({ exclude_sale_items: true }).discountCents, 800)
  assert.equal(run({ product_ids: [999] }).error, "This code doesn't apply to the items in your cart.")
  assert.equal(run({ exclude_sale_items: true }, {}, [lines[1]]).ok, false)
})
test('unavailable lines never earn a discount', () => {
  assert.equal(run({}, {}, [{ ...lines[0], purchasable: false }]).ok, false)
})
test('codes are normalised and constrained before any lookup', () => {
  assert.equal(normalizeCouponCode('  Test   Coupon '), 'Test Coupon')
  assert.equal(normalizeCouponCode('ΚΩΔΙΚΟΣ-10'), 'ΚΩΔΙΚΟΣ-10')
  for (const bad of ['', '   ', 'a'.repeat(51), 'x&y=1', 'a/b', '<script>', 'a\nb', 42, null, undefined]) assert.equal(normalizeCouponCode(bad), null, String(bad))
})
