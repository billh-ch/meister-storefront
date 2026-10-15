import { prefersMarkdown, isPublicContentPath } from '@/lib/agents/content'
import { localeFromPath, localePath, stripLocale } from '@/lib/i18n/paths'
import { NextResponse, type NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { SESSION_COOKIE_NAME, getSessionPassword, type SessionData } from '@/lib/auth/session-options'

export async function proxy(request: NextRequest) {
  const original = request.nextUrl.pathname + request.nextUrl.search
  const locale = localeFromPath(original)
  const path = stripLocale(request.nextUrl.pathname)
  // Decode and normalize only for the reserved-route check. Rewrite the original
  // pathname bytes so catalog slugs and option identities remain untouched.
  let checkedPath = path
  try {
    for (let pass = 0; pass < 16; pass++) {
      const decoded = decodeURIComponent(checkedPath)
      if (decoded === checkedPath) break
      checkedPath = decoded
    }
    checkedPath = new URL(checkedPath.replace(/\\/g, '/').replace(/^\/+/, '/'), 'https://meister.invalid').pathname
  } catch { if (locale === 'el') return new NextResponse(null, { status: 404 }) }
  if (locale === 'el' && (/^\/+(?:api|docs|_next|images|\.well-known)(?:\/|$)/i.test(checkedPath) || /\.[^/]+$/.test(checkedPath))) {
    return new NextResponse(null, { status: 404 })
  }
  const headers = new Headers(request.headers)
  headers.set('x-meister-locale', locale)
  headers.set('x-meister-original-path', original)
  const target = request.nextUrl.clone()
  target.pathname = path
  const response = locale === 'el' ? NextResponse.rewrite(target, { request: { headers } }) : NextResponse.next({ request: { headers } })

  if (/^\/account(?:\/|$)/i.test(checkedPath)) {
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
