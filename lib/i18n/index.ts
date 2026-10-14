import { coreGreek } from './dictionaries/core'
import { seoGreek } from './dictionaries/seo'
import type { Locale } from './paths'
export { isLocale, validateLocale, localePath, stripLocale, localeFromPath, isShopperPath } from './paths'
export type { Locale } from './paths'
export type TranslationValues = Record<string, string | number>
export type Translator = (source: string, values?: TranslationValues) => string
const greek: Record<string, string> = { ...coreGreek, ...seoGreek }
/** Fallback leaves untranslated catalog/brand text intact; interpolation is plain text. */
export function translate(locale: Locale, source: string, values?: TranslationValues): string {
  const text = locale === 'el' && Object.hasOwn(greek, source) ? greek[source] : source
  return text.replace(/\{(\w+)\}/g, (match, key: string) => !values || !Object.hasOwn(values, key) ? match : String(values[key]))
}
