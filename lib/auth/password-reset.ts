import { createHash, randomBytes } from 'node:crypto'

/**
 * Password-reset core. Everything with a side effect is injected, so the
 * rules (one live link per customer, single use, expiry, no account probing)
 * are unit-testable without Redis, WooCommerce or an email provider.
 */

export const RESET_TTL_SECONDS = 60 * 60
export const RESET_TTL_MINUTES = RESET_TTL_SECONDS / 60
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export interface ResetRecord { customerId: number; email: string; firstName?: string; locale: string; createdAt: number }
export interface ResetCustomer { id: number; email: string; firstName?: string }

export interface ResetStore {
  /** Stores the record under `hash` and makes it the customer's only live link. */
  save(hash: string, record: ResetRecord, ttlSeconds: number): Promise<void>
  peek(hash: string): Promise<ResetRecord | null>
  /** Atomic read-and-delete: two concurrent callers can never both get the record. */
  consume(hash: string): Promise<ResetRecord | null>
  restore(hash: string, record: ResetRecord, ttlSeconds: number): Promise<void>
  drop(hash: string): Promise<void>
}

export interface ResetDeps {
  store: ResetStore
  findCustomer(email: string): Promise<ResetCustomer | null>
  setPassword(customerId: number, password: string): Promise<void>
  /** Sign out every session issued before `at`. */
  revokeSessions(customerId: number, at: number): Promise<void>
  /** Limits per email address. Must fail closed. */
  allowEmail(email: string): Promise<boolean>
  sendReset(input: { to: string; firstName?: string; locale: string; token: string; tokenHash: string }): Promise<boolean>
  sendChanged(input: { to: string; firstName?: string; locale: string; at: number }): Promise<void>
  now(): number
  token(): string
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')
export const isTokenShape = (value: unknown): value is string => typeof value === 'string' && TOKEN_PATTERN.test(value)
export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null
}

/**
 * Starts a reset. Intentionally reveals nothing: the same thing happens
 * visibly whether or not the address has an account.
 */
export async function requestPasswordReset(input: { email: unknown; locale: string }, deps: ResetDeps): Promise<'sent' | 'ignored'> {
  const email = normalizeEmail(input.email)
  if (!email) return 'ignored'
  if (!(await deps.allowEmail(email))) return 'ignored'

  const customer = await deps.findCustomer(email)
  // WooCommerce matches the email filter exactly; verify rather than assume.
  if (!customer || customer.email.trim().toLowerCase() !== email) return 'ignored'

  const token = deps.token()
  const tokenHash = hashToken(token)
  await deps.store.save(tokenHash, {
    customerId: customer.id, email: customer.email.trim(), firstName: customer.firstName,
    locale: input.locale, createdAt: deps.now(),
  }, RESET_TTL_SECONDS)

  const delivered = await deps.sendReset({ to: customer.email.trim(), firstName: customer.firstName, locale: input.locale, token, tokenHash })
  if (!delivered) {
    await deps.store.drop(tokenHash)
    return 'ignored'
  }
  return 'sent'
}

/** True when the link could still be used. Does not consume it. */
export async function checkResetToken(token: unknown, deps: Pick<ResetDeps, 'store'>): Promise<boolean> {
  if (!isTokenShape(token)) return false
  try { return (await deps.store.peek(hashToken(token))) !== null } catch { return false }
}

export type ResetOutcome = { ok: true } | { ok: false; reason: 'invalid' | 'weak' | 'unavailable' }

/**
 * Sets the new password. The link is consumed first (atomically) and handed
 * back if WooCommerce fails, so it can neither be used twice nor be lost to a
 * transient error.
 */
export async function completePasswordReset(input: { token: unknown; password: unknown }, deps: ResetDeps): Promise<ResetOutcome> {
  if (!isTokenShape(input.token)) return { ok: false, reason: 'invalid' }
  if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 200) return { ok: false, reason: 'weak' }

  const hash = hashToken(input.token)
  let record: ResetRecord | null
  try { record = await deps.store.consume(hash) } catch { return { ok: false, reason: 'unavailable' } }
  if (!record) return { ok: false, reason: 'invalid' }

  try {
    await deps.setPassword(record.customerId, input.password)
  } catch {
    const remaining = RESET_TTL_SECONDS - Math.floor((deps.now() - record.createdAt) / 1000)
    if (remaining > 0) await deps.store.restore(hash, record, remaining).catch(() => undefined)
    return { ok: false, reason: 'unavailable' }
  }

  const at = deps.now()
  // The password is already changed; a failure here must not hide that.
  await deps.revokeSessions(record.customerId, at).catch(error => {
    console.error('[auth] could not revoke sessions', error instanceof Error ? error.name : 'UnknownError')
  })
  await deps.sendChanged({ to: record.email, firstName: record.firstName, locale: record.locale, at }).catch(() => undefined)
  return { ok: true }
}
