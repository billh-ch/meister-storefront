import assert from 'node:assert/strict'
import Stripe from 'stripe'

// Local Workers fixture only: no Stripe API calls, Redis writes or orders.
const base = new URL(process.env.TEST_BASE_URL ?? 'http://localhost:8787')
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Run only against a local fixture Worker')
const webhook = new URL('/api/webhooks/stripe', base)
const secret = 'whsec_cloudflare_local_fixture_only'
const body = JSON.stringify({ id: 'evt_local_crypto_fixture', type: 'ping', data: { object: {} } })
const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret })
const signed = await fetch(webhook, { method: 'POST', headers: { 'stripe-signature': signature }, body })
assert.equal(signed.status, 200, 'Workers must verify Stripe signatures using its available crypto provider')
assert.deepEqual(await signed.json(), { received: true })
const invalid = await fetch(webhook, { method: 'POST', headers: { 'stripe-signature': signature }, body: body + ' ' })
assert.equal(invalid.status, 400, 'A modified webhook must fail signature verification')
const page = await fetch(base)
assert.match(page.headers.get('x-robots-tag') ?? '', /noindex/)
const account = await fetch(new URL('/el/account?tab=orders', base), { redirect: 'manual' })
assert.equal(account.status, 307)
assert.equal(new URL(account.headers.get('location'), base).pathname, '/el/sign-in')
const shipping = await fetch(new URL('/api/checkout/shipping', base), {
  method: 'POST', headers: { Origin: 'https://untrusted.invalid', 'Content-Type': 'application/json' }, body: '{}',
})
assert.equal(shipping.status, 403, 'Cross-origin shipping mutations must be rejected')
console.log('PASS local Workers: Stripe signature crypto, tamper rejection, noindex, locale account guard, shipping origin guard')
