import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'

async function withEnvironment(values, run) {
  const keys = ['REDIS_ENV_PREFIX', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'restore_KV_REST_API_URL', 'restore_KV_REST_API_TOKEN']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const fetch = globalThis.fetch
  try {
    for (const key of keys) {
      if (values[key] === undefined) delete process.env[key]
      else process.env[key] = values[key]
    }
    await run()
  } finally {
    globalThis.fetch = fetch
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}
const old = { KV_REST_API_URL: 'https://old.fixture.example', KV_REST_API_TOKEN: 'old-fixture-token' }
const restored = { restore_KV_REST_API_URL: 'https://restored.fixture.example', restore_KV_REST_API_TOKEN: 'restored-fixture-token' }

test('a selected Marketplace prefix uses the restored database instead of the archived default', async () => withEnvironment({ ...old, ...restored, REDIS_ENV_PREFIX: 'restore_' }, async () => {
  globalThis.fetch = async (url, init) => {
    const selected = new URL(String(url)).hostname === 'restored.fixture.example'
    const authenticated = new Headers(init.headers).get('authorization') === 'Bearer restored-fixture-token'
    const raw = selected && authenticated ? 'PONG' : 'ARCHIVED_DATABASE'
    const result = new Headers(init.headers).get('upstash-encoding') === 'base64' ? Buffer.from(raw).toString('base64') : raw
    const body = JSON.parse(init.body)
    return Response.json(Array.isArray(body[0]) ? body.map(() => ({ result })) : { result })
  }
  const { getRedis } = await import('../lib/redis.ts?configuration=restored')
  assert.equal(await getRedis().ping(), 'PONG')
}))
test('an incomplete selected database does not fall back to stale credentials', async () => withEnvironment({ ...old, restore_KV_REST_API_URL: restored.restore_KV_REST_API_URL, REDIS_ENV_PREFIX: 'restore_' }, async () => {
  const { getRedis } = await import('../lib/redis.ts?configuration=incomplete')
  assert.throws(() => getRedis(), /restore_KV_REST_API_URL\/restore_KV_REST_API_TOKEN are not configured/)
}))
test('unprefixed database configuration keeps existing local setup working', async () => withEnvironment(old, async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(String(url)).hostname, 'old.fixture.example')
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer old-fixture-token')
    const body = JSON.parse(init.body)
    const result = new Headers(init.headers).get('upstash-encoding') === 'base64' ? Buffer.from('PONG').toString('base64') : 'PONG'
    return Response.json(Array.isArray(body[0]) ? body.map(() => ({ result })) : { result })
  }
  const { getRedis } = await import('../lib/redis.ts?configuration=default')
  assert.equal(await getRedis().ping(), 'PONG')
}))
