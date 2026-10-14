import { coreGreek } from './dictionaries/core'
import { countriesGreek } from './dictionaries/countries'
import { contentGreek } from './dictionaries/content'
import { shopperGreek } from './dictionaries/shopper'
import { seoGreek } from './dictionaries/seo'
import type { Locale } from './paths'
export { isLocale, validateLocale, localePath, stripLocale, localeFromPath, isShopperPath } from './paths'
export type { Locale } from './paths'
export type TranslationValues = Record<string, string | number>
export type Translator = (source: string, values?: TranslationValues) => string
const greek: Record<string, string> = { ...coreGreek, ...seoGreek, ...shopperGreek, ...contentGreek, ...countriesGreek }
/** Fallback leaves untranslated catalog/brand text intact; interpolation is plain text. */
export function translate(locale: Locale, source: string, values?: TranslationValues): string {
  // Legacy state stores and cart selections carry complete source sentences.
  // Match only known UI templates; keep product names and option values intact.
  if (locale === 'el' && !Object.hasOwn(greek, source)) {
    const compared = /^(.*) added to comparison\.$/.exec(source)
    if (compared) return translate(locale, '{name} added to comparison.', { name: compared[1] })
    const invalidOptions = /^Please choose valid options for (.*)\.$/.exec(source)
    if (invalidOptions) return translate(locale, 'Please choose valid options for {options}.', {
      options: invalidOptions[1].split(', ').map(label => translate(locale, label)).join(', '),
    })
  }
  const text = locale === 'el' && Object.hasOwn(greek, source) ? greek[source] : source
  return text.replace(/\{(\w+)\}/g, (match, key: string) => !values || !Object.hasOwn(values, key) ? match : String(values[key]))
}
