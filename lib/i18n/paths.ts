export type Locale = 'en' | 'el'
export function isLocale(value: unknown): value is Locale { return value === 'en' || value === 'el' }
export function validateLocale(value: unknown): Locale { return isLocale(value) ? value : 'en' }

/** Local paths only: do not parse/re-encode catalog slugs or query values. */
function localPath(path: string): boolean { return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') }
export function stripLocale(path: string): string {
  if (!localPath(path)) return path
  return path.replace(/^\/el(?=\/|[?#]|$)/, '').replace(/^(?=[?#]|$)/, '/')
}
export function localeFromPath(path: string): Locale { return localPath(path) && /^\/el(?:\/|[?#]|$)/.test(path) ? 'el' : 'en' }
/** Explicit storefront allowlist prevents prefixed API, assets and docs rewrites. */
export function isShopperPath(path: string): boolean {
  if (!localPath(path)) return false
  const pathname = stripLocale(path).split(/[?#]/, 1)[0]
  return pathname === '/' || /^\/(?:shop|fins|suits|guns|accessories|merch|search|cart|wishlist|compare|about|contact|privacy|sign-in|sign-up)\/?$/.test(pathname) ||
    /^\/(?:account|checkout)(?:\/|$)/.test(pathname) || /^\/products\/[^/]+\/?$/.test(pathname)
}
export function localePath(path: string, locale: Locale): string {
  if (!isShopperPath(path)) return path
  const plain = stripLocale(path)
  return locale === 'en' ? plain : `/el${plain.startsWith('/?') || plain.startsWith('/#') || plain === '/' ? plain.slice(1) : plain}`
}
