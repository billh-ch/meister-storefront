import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { getBaseUrl } = await import('../lib/url.ts')

function withEnv(env, run) {
  const keys = ['APP_BASE_URL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL']
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]))
  for (const k of keys) delete process.env[k]
  Object.assign(process.env, env)
  try { run() } finally { for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] } }
}

test('APP_BASE_URL wins, so a staging branch links to its public domain, not the protected vercel.app URL', () => {
  withEnv({ APP_BASE_URL: 'https://staging.meister.gr', VERCEL_ENV: 'preview', VERCEL_URL: 'x-123.vercel.app' }, () => {
    assert.equal(getBaseUrl(), 'https://staging.meister.gr')
  })
  withEnv({ APP_BASE_URL: 'https://staging.meister.gr/', VERCEL_ENV: 'preview' }, () => assert.equal(getBaseUrl(), 'https://staging.meister.gr'))
})

test('an unusable APP_BASE_URL is ignored, never half-used', () => {
  for (const bad of ['http://staging.meister.gr', 'https://staging.meister.gr/shop', 'https://u:p@staging.meister.gr', 'not a url', '']) {
    withEnv({ APP_BASE_URL: bad, VERCEL_ENV: 'preview', VERCEL_URL: 'x-123.vercel.app' }, () => assert.equal(getBaseUrl(), 'https://x-123.vercel.app'))
  }
})

test('without it, production and previews behave as before', () => {
  withEnv({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'storefront.meister.gr', VERCEL_URL: 'x.vercel.app' }, () => assert.equal(getBaseUrl(), 'https://storefront.meister.gr'))
  withEnv({}, () => assert.equal(getBaseUrl(), 'http://localhost:3000'))
})
