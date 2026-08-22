/**
 * Shared between `lib/auth/session.ts` (Node runtime, App Router) and
 * `middleware.ts` (Edge runtime) — kept in its own file with zero
 * `next/headers` imports so both can import it safely.
 */
export interface SessionData {
  wcCustomerId?: number
}

export const SESSION_COOKIE_NAME = 'mm_session'

export function getSessionPassword(): string {
  const password = process.env.SESSION_SECRET
  if (!password || password.length < 32) {
    throw new Error('SESSION_SECRET is not configured (needs 32+ characters)')
  }
  return password
}
