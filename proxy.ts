import { prefersMarkdown, isPublicContentPath } from '@/lib/agents/content'
import { localeFromPath, localePath, stripLocale, isShopperPath } from '@/lib/i18n/paths'
import { NextResponse, type NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { SESSION_COOKIE_NAME, getSessionPassword, type SessionData } from '@/lib/auth/session-options'

export async function proxy(request: NextRequest) {
  const original = request.nextUrl.pathname + request.nextUrl.search
  const locale = localeFromPath(original)
  const path = stripLocale(request.nextUrl.pathname)
  // Reject reserved/unknown prefixed paths before route resolution can expose APIs.
  if (locale === 'el' && !isShopperPath(original)) return new NextResponse(null, { status: 404 })
  const headers = new Headers(request.headers)
  headers.set('x-meister-locale', locale)
  headers.set('x-meister-original-path', original)
  const target = request.nextUrl.clone()
  target.pathname = path
  const response = locale === 'el' ? NextResponse.rewrite(target, { request: { headers } }) : NextResponse.next({ request: { headers } })

  if (/^\/account(?:\/|$)/.test(path)) {
    const session = await getIronSession<SessionData>(request, response, {
      cookieName: SESSION_COOKIE_NAME, password: getSessionPassword(),
    })
    if (!session.wcCustomerId) {
      const signInUrl = new URL(localePath('/sign-in', locale), request.url)
      signInUrl.searchParams.set('redirect_url', original)
      return NextResponse.redirect(signInUrl)
    }
    return response
  }
  if (['GET', 'HEAD'].includes(request.method) && isPublicContentPath(path)) {
    const vary = 'Accept, rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch'
    if (!request.headers.has('rsc') && prefersMarkdown(request.headers.get('accept') || '')) {
      const markdown = new URL('/api/agent-content', request.url)
      markdown.search = request.nextUrl.search
      markdown.searchParams.set('__agent_path', path)
      const rewritten = NextResponse.rewrite(markdown, { request: { headers } })
      rewritten.headers.set('Vary', vary)
      rewritten.headers.set('Cache-Control', 'no-store')
      return rewritten
    }
    response.headers.set('Vary', vary)
  }
  return response
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] }
