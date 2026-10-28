import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { getStripe } from '../lib/stripe.ts'

test('test-only checkout refuses live or unrecognized credentials before contacting Stripe', () => {
  const previous = { key: process.env.STRIPE_SECRET_KEY, mode: process.env.STRIPE_EXPECTED_MODE }
  try {
    process.env.STRIPE_EXPECTED_MODE = 'test'
    for (const key of ['sk_live_fixture', 'rk_live_fixture', 'unknown-fixture']) {
      process.env.STRIPE_SECRET_KEY = key
      assert.throws(() => getStripe(), /test/i)
    }
    process.env.STRIPE_SECRET_KEY = 'rk_test_fixture'
    assert.ok(getStripe())
  } finally {
    for (const [name, value] of [['STRIPE_SECRET_KEY', previous.key], ['STRIPE_EXPECTED_MODE', previous.mode]]) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})
