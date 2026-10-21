import { z } from 'zod'
import { isLocale, translate, type Translator } from './index'

/** APIs have stable unlocalized URLs: callers explicitly supply en/el.
 * Only omission defaults to English; malformed explicit input is rejected. */
export const requestLocaleSchema = z.enum(['en', 'el']).default('en')
export function inputTranslator(input: unknown): Translator {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>).locale : undefined
  const locale = isLocale(value) ? value : 'en'
  return (source, values) => translate(locale, source, values)
}
export function queryLocale(request: Request) {
  const value = new URL(request.url).searchParams.get('locale')
  return requestLocaleSchema.safeParse(value === null ? undefined : value)
}
