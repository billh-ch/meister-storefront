import { localePath, type Locale } from '../i18n/paths'
type SiteEnvironment = Partial<Pick<NodeJS.ProcessEnv, 'NEXT_PUBLIC_SITE_URL' | 'VERCEL_ENV' | 'NODE_ENV' | 'NEXT_PUBLIC_USE_MOCK_DATA'>>

/** Search URLs must use the public production origin, never the request Host
 * or the WooCommerce origin. Payment redirects retain their own URL helper. */
export function getPublicSiteUrl(env: SiteEnvironment = process.env): URL {
  const site = new URL(env.NEXT_PUBLIC_SITE_URL || 'https://meister-storefront.vercel.app')
  if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTPS origin without a path, query or credentials.')
  }
  return site
}

export function isIndexingAllowed(env: SiteEnvironment = process.env): boolean {
  return env.NEXT_PUBLIC_USE_MOCK_DATA !== 'true' &&
    (env.VERCEL_ENV === 'production' || (!env.VERCEL_ENV && env.NODE_ENV === 'production'))
}

export function canonicalProductUrl(slug: string, env: SiteEnvironment = process.env, locale: Locale = 'en'): string {
  let decoded = slug
  try { decoded = decodeURIComponent(slug) } catch { /* Literal malformed percent text is encoded below. */ }
  return new URL(localePath(`/products/${encodeURIComponent(decoded)}`, locale), getPublicSiteUrl(env)).href
}

/** Headers also apply to redirects, which do not render a page's metadata. */
export function buildIndexingHeaders(env: SiteEnvironment = process.env) {
  if (!isIndexingAllowed(env)) {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  }
  return [
    ...['/cart/:path*', '/checkout/:path*', '/account/:path*', '/wishlist/:path*', '/compare/:path*', '/sign-in', '/sign-up']
      .flatMap(source => [source, `/el${source}`]).map(source => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
    ...['/search', '/el/search'].map(source => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }] })),
  ]
}
