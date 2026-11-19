import './helpers/typescript-imports.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
const { requestPasswordReset, completePasswordReset, checkResetToken, hashToken, normalizeEmail, isTokenShape, RESET_TTL_SECONDS } = await import('../lib/auth/password-reset.ts')
const { isSessionRevoked, revokeSessionsBefore } = await import('../lib/auth/session-validity.ts')
const { buildPasswordReset, buildPasswordChanged } = await import('../lib/email/templates/account.ts')
const { sendPasswordResetEmail } = await import('../lib/email/account-mail.ts')

function setup(overrides = {}) {
  const clock = { now: 1_700_000_000_000 }
  const records = new Map() // hash -> { record, expiresAt }
  const log = { sent: [], changed: [], passwords: [], revoked: [], tokens: 0 }
  const customer = { id: 7, email: 'Maria@Example.com', firstName: 'Maria' }
  const deps = {
    store: {
      save: async (hash, record, ttl) => { for (const [h, v] of records) if (v.record.customerId === record.customerId) records.delete(h); records.set(hash, { record, expiresAt: clock.now + ttl * 1000 }) },
      peek: async hash => { const v = records.get(hash); return v && v.expiresAt > clock.now ? v.record : null },
      consume: async hash => { const v = records.get(hash); records.delete(hash); return v && v.expiresAt > clock.now ? v.record : null },
      restore: async (hash, record, ttl) => { records.set(hash, { record, expiresAt: clock.now + ttl * 1000 }) },
      drop: async hash => { records.delete(hash) },
    },
    findCustomer: async email => (email === 'maria@example.com' ? customer : null),
    setPassword: async (id, password) => { log.passwords.push({ id, password }) },
    revokeSessions: async (id, at) => { log.revoked.push({ id, at }) },
    allowEmail: async () => true,
    sendReset: async input => { log.sent.push(input); return true },
    sendChanged: async input => { log.changed.push(input) },
    now: () => clock.now,
    token: () => `t${++log.tokens}`.padEnd(43, 'x'),
    ...overrides,
  }
  return { deps, log, records, clock }
}

test('an unknown address gets no token and no email, and no error', async () => {
  const { deps, log, records } = setup()
  assert.equal(await requestPasswordReset({ email: 'nobody@example.com', locale: 'en' }, deps), 'ignored')
  assert.equal(log.sent.length, 0); assert.equal(records.size, 0)
})

test('invalid or non-string email input is ignored before any lookup', async () => {
  let lookups = 0
  const { deps } = setup({ findCustomer: async () => { lookups++; return null } })
  for (const email of [undefined, null, 42, '', 'not an email', 'a@b', `${'a'.repeat(250)}@b.co`, { toString: () => 'maria@example.com' }]) {
    assert.equal(await requestPasswordReset({ email, locale: 'en' }, deps), 'ignored')
  }
  assert.equal(lookups, 0)
})

test('a known address gets one email; only the token hash is stored', async () => {
  const { deps, log, records } = setup()
  assert.equal(await requestPasswordReset({ email: '  MARIA@example.com ', locale: 'el' }, deps), 'sent')
  assert.equal(log.sent.length, 1)
  const { token, tokenHash, to, locale } = log.sent[0]
  assert.equal(to, 'Maria@Example.com'); assert.equal(locale, 'el')
  assert.equal(tokenHash, hashToken(token))
  assert.deepEqual([...records.keys()], [tokenHash])
  assert.ok(![...records.keys()].includes(token))
  assert.ok(isTokenShape(token))
})

test('the per-email limit silently stops a flood', async () => {
  const { deps, log } = setup({ allowEmail: async () => false })
  assert.equal(await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps), 'ignored')
  assert.equal(log.sent.length, 0)
})

test('a customer whose stored email differs from the request is not emailed', async () => {
  const { deps, log } = setup({ findCustomer: async () => ({ id: 9, email: 'someone.else@example.com' }) })
  assert.equal(await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps), 'ignored')
  assert.equal(log.sent.length, 0)
})

test('a failed email send leaves no usable link behind', async () => {
  const { deps, records } = setup({ sendReset: async () => false })
  assert.equal(await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps), 'ignored')
  assert.equal(records.size, 0)
})

test('a second request replaces the first link', async () => {
  const { deps, log } = setup()
  await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps)
  await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps)
  const [first, second] = log.sent
  assert.equal(await checkResetToken(first.token, deps), false)
  assert.equal(await checkResetToken(second.token, deps), true)
})

test('a valid link sets the password once, signs out old sessions and emails a notice', async () => {
  const { deps, log, clock } = setup()
  await requestPasswordReset({ email: 'maria@example.com', locale: 'el' }, deps)
  const { token } = log.sent[0]
  clock.now += 5 * 60 * 1000
  assert.deepEqual(await completePasswordReset({ token, password: 'a-new-password' }, deps), { ok: true })
  assert.deepEqual(log.passwords, [{ id: 7, password: 'a-new-password' }])
  assert.deepEqual(log.revoked, [{ id: 7, at: clock.now }])
  assert.deepEqual(log.changed, [{ to: 'Maria@Example.com', firstName: 'Maria', locale: 'el', at: clock.now }])
  // single use
  assert.deepEqual(await completePasswordReset({ token, password: 'another-password' }, deps), { ok: false, reason: 'invalid' })
  assert.equal(log.passwords.length, 1)
})

test('expired, malformed and unknown links are rejected without touching WooCommerce', async () => {
  const { deps, log, clock } = setup()
  await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps)
  const { token } = log.sent[0]
  for (const bad of [undefined, null, 5, '', 'short', 'x'.repeat(43), `${token}!`, `${token}x`, token.toUpperCase()]) {
    assert.deepEqual(await completePasswordReset({ token: bad, password: 'a-new-password' }, deps), { ok: false, reason: 'invalid' })
  }
  clock.now += RESET_TTL_SECONDS * 1000 + 1
  assert.equal(await checkResetToken(token, deps), false)
  assert.deepEqual(await completePasswordReset({ token, password: 'a-new-password' }, deps), { ok: false, reason: 'invalid' })
  assert.equal(log.passwords.length, 0)
})

test('weak passwords are rejected and do not burn the link', async () => {
  const { deps, log } = setup()
  await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps)
  const { token } = log.sent[0]
  for (const password of [undefined, 1234, '', 'short', 'x'.repeat(201)]) {
    assert.deepEqual(await completePasswordReset({ token, password }, deps), { ok: false, reason: 'weak' })
  }
  assert.equal(await checkResetToken(token, deps), true)
  assert.deepEqual(await completePasswordReset({ token, password: 'long-enough-1' }, deps), { ok: true })
})

test('a WooCommerce failure hands the link back so the shopper can retry', async () => {
  let fail = true
  const { deps, log, clock } = setup({ setPassword: async () => { if (fail) throw new Error('503'); } })
  await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps)
  const { token } = log.sent[0]
  clock.now += 10 * 60 * 1000
  assert.deepEqual(await completePasswordReset({ token, password: 'a-new-password' }, deps), { ok: false, reason: 'unavailable' })
  assert.equal(log.changed.length, 0); assert.equal(log.revoked.length, 0)
  assert.equal(await checkResetToken(token, deps), true)
  fail = false
  assert.deepEqual(await completePasswordReset({ token, password: 'a-new-password' }, deps), { ok: true })
})

test('a store outage on submit is reported as unavailable, never as success', async () => {
  const { deps } = setup({ store: { ...setup().deps.store, consume: async () => { throw new Error('redis down') } } })
  assert.deepEqual(await completePasswordReset({ token: 'a'.repeat(43), password: 'a-new-password' }, deps), { ok: false, reason: 'unavailable' })
})

test('the password still counts as changed if revoking sessions or the notice fails', async () => {
  const { deps, log } = setup({ revokeSessions: async () => { throw new Error('redis') }, sendChanged: async () => { throw new Error('resend') } })
  await requestPasswordReset({ email: 'maria@example.com', locale: 'en' }, deps)
  assert.deepEqual(await completePasswordReset({ token: log.sent[0].token, password: 'a-new-password' }, deps), { ok: true })
  assert.equal(log.passwords.length, 1)
})

test('normalizeEmail trims, lowercases and rejects junk', () => {
  assert.equal(normalizeEmail('  A@B.co '), 'a@b.co')
  assert.equal(normalizeEmail('a b@c.co'), null)
  assert.equal(normalizeEmail(7), null)
})

test('session cut-off: sessions issued before a reset are revoked, later ones are not', async () => {
  const data = new Map()
  const redis = { get: async k => data.get(k) ?? null, set: async (k, v) => { data.set(k, v) } }
  assert.equal(await isSessionRevoked(7, 100, redis), false)
  await revokeSessionsBefore(7, 1000, redis)
  assert.equal(await isSessionRevoked(7, 999, redis), true)
  assert.equal(await isSessionRevoked(7, undefined, redis), true)
  assert.equal(await isSessionRevoked(7, 1000, redis), false)
  assert.equal(await isSessionRevoked(8, 1, redis), false)
  assert.equal(await isSessionRevoked(7, 1, { get: async () => { throw new Error('down') } }), false)
})

test('reset email carries the link, in English and Greek, and escapes nothing dangerous', () => {
  process.env.EMAIL_ASSET_BASE_URL = 'https://shop.example'
  const url = 'https://shop.example/reset-password?token=abc_DEF-123'
  const en = buildPasswordReset({ firstName: 'Maria', locale: 'en', resetUrl: url, minutes: 60 })
  assert.match(en.html, /Reset your password/); assert.match(en.html, /abc_DEF-123/); assert.match(en.text, /expires in 60 minutes/)
  const el = buildPasswordReset({ firstName: '<b>x</b>', locale: 'el', resetUrl: url, minutes: 60 })
  assert.match(el.html, /Επαναφορά κωδικού/); assert.doesNotMatch(el.html, /<b>x<\/b>/)
  const changed = buildPasswordChanged({ locale: 'en', supportEmail: 'info@example.com' })
  assert.match(changed.html, /password was changed/); assert.match(changed.text, /info@example\.com/)
  delete process.env.EMAIL_ASSET_BASE_URL
})

test('the reset link is built from the site base and the shopper\'s language', async () => {
  process.env.EMAIL_ASSET_BASE_URL = 'https://shop.example'
  const sent = []
  const ok = await sendPasswordResetEmail({ to: 'm@example.com', locale: 'el', token: 'tok_en-1', tokenHash: 'a'.repeat(64) }, async m => { sent.push(m); return { ok: true, id: 'x' } })
  assert.equal(ok, true)
  assert.match(sent[0].text, /https:\/\/shop\.example\/el\/reset-password\?token=tok_en-1/)
  assert.equal(sent[0].idempotencyKey, `pwreset-${'a'.repeat(40)}`)
  const failed = await sendPasswordResetEmail({ to: 'm@example.com', locale: 'en', token: 't', tokenHash: 'b'.repeat(64) }, async () => ({ ok: false, error: 'Resend responded 500' }))
  assert.equal(failed, false)
  delete process.env.EMAIL_ASSET_BASE_URL
})
