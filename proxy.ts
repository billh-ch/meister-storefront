import { NextResponse, type NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { SESSION_COOKIE_NAME, getSessionPassword, type SessionData } from '@/lib/auth/session-options'

/**
 * Gates `/account` only — everything else (browsing, search, the cart, and
 * `/checkout` itself) stays public. Checkout supports guest purchases, so it
 * must not require a session; `lib/checkout/actions.ts` and
 * `app/checkout/page.tsx` handle the logged-in vs guest split themselves.
 * Named `proxy` per this Next.js version's file convention (renamed from
 * `middleware` in v16.0.0 — see `node_modules/next/dist/docs/01-app/03-api-
 * reference/03-file-conventions/proxy.md`).
 *
 * Note (from the same docs): Server Actions are POST requests to the route
 * that defines them, not separate routes — a matcher change could silently
 * stop covering one. `lib/checkout/actions.ts`'s Server Action re-checks the
 * session itself for exactly this reason, rather than relying on this file alone.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const session = await getIronSession<SessionData>(request, response, {
    cookieName: SESSION_COOKIE_NAME,
    password: getSessionPassword(),
  })

  if (!session.wcCustomerId) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return response
}

export const config = {
  matcher: ['/account/:path*'],
}
