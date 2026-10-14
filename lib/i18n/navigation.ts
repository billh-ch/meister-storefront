import type { UrlObject } from 'url'
import { localePath, stripLocale, type Locale } from './paths'
export function localizedDestination<T extends string | UrlObject>(destination: T, locale: Locale): T {
  return (typeof destination === 'string' ? localePath(destination, locale) : destination.pathname && !destination.host && !destination.hostname && !destination.protocol ? { ...(destination as UrlObject), pathname: localePath(destination.pathname, locale) } : destination) as T
}
/** Remember only a deliberate switch; direct links and query/hash home entries win. */
export function rememberedHomeDestination(current: string, preference: unknown): string | null {
  return current === '/' && preference === 'el' ? '/el' : null
}
/** Equivalent visible shopper URLs include obsolete links that render404.
 * Destination links keep their narrower allowlist; technical paths stay untouched. */
export function localeSwitchPath(current: string, locale: Locale): string {
  if (!current.startsWith('/') || current.startsWith('//') || current.includes('\\')) return current
  const plain = stripLocale(current)
  let checked = plain.split(/[?#]/, 1)[0]
  try {
    for (let pass = 0; pass < 16; pass++) {
      const decoded = decodeURIComponent(checked)
      if (decoded === checked) break
      checked = decoded
    }
    checked = new URL(checked.replace(/\\/g, '/').replace(/^\/+/, '/'), 'https://meister.invalid').pathname
  } catch { return current }
  if (/^\/(?:api|docs|_next|images|\.well-known)(?:\/|$)/i.test(checked) || /\.[^/]+$/.test(checked)) return current
  return locale === 'en' ? plain : `/el${plain === '/' || plain.startsWith('/?') || plain.startsWith('/#') ? plain.slice(1) : plain}`
}
