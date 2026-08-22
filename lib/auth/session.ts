import { cookies } from 'next/headers'
import { getIronSession, type IronSession } from 'iron-session'
import { SESSION_COOKIE_NAME, getSessionPassword, type SessionData } from './session-options'

export type { SessionData }

/**
 * The session payload is just `{ wcCustomerId }` — nothing else needs to
 * persist, since every account/order/checkout read re-fetches live from
 * WooCommerce by that id.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), {
    cookieName: SESSION_COOKIE_NAME,
    password: getSessionPassword(),
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
}

export async function login(wcCustomerId: number): Promise<void> {
  const session = await getSession()
  session.wcCustomerId = wcCustomerId
  await session.save()
}

export async function logout(): Promise<void> {
  const session = await getSession()
  session.destroy()
}
