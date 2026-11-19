import { cookies } from 'next/headers'
import { getIronSession, type IronSession } from 'iron-session'
import { isSessionRevoked } from './session-validity'
import { SESSION_COOKIE_NAME, getSessionPassword, type SessionData } from './session-options'

export type { SessionData }

/**
 * The session payload is just `{ wcCustomerId }` — nothing else needs to
 * persist, since every account/order/checkout read re-fetches live from
 * WooCommerce by that id.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(await cookies(), {
    cookieName: SESSION_COOKIE_NAME,
    password: getSessionPassword(),
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
  // A password reset signs out every earlier session. Server Components cannot
  // rewrite the cookie, so the revoked session is simply read as signed out.
  if (session.wcCustomerId && (await isSessionRevoked(session.wcCustomerId, session.iat))) {
    session.wcCustomerId = undefined
  }
  return session
}

export async function login(wcCustomerId: number): Promise<void> {
  const session = await getSession()
  session.wcCustomerId = wcCustomerId
  session.iat = Date.now()
  await session.save()
}

export async function logout(): Promise<void> {
  const session = await getSession()
  session.destroy()
}
