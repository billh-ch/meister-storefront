import type { UrlObject } from 'url'
import { localePath, type Locale } from './paths'
export function localizedDestination<T extends string | UrlObject>(destination: T, locale: Locale): T {
  return (typeof destination === 'string' ? localePath(destination, locale) : destination.pathname && !destination.host && !destination.hostname && !destination.protocol ? { ...(destination as UrlObject), pathname: localePath(destination.pathname, locale) } : destination) as T
}
/** Remember only a deliberate switch; direct links and query/hash home entries win. */
export function rememberedHomeDestination(current: string, preference: unknown): string | null {
  return current === '/' && preference === 'el' ? '/el' : null
}
