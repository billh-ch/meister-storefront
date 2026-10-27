import { UI, FIN_UI, EXTRA } from '@/lib/gear-finder/reference'
import type { Bilingual, Mode } from '@/lib/gear-finder/types'
import type { Locale } from '@/lib/i18n'
export function guideCopy(mode: Mode, locale: Locale) {
  const t = (value: Bilingual) => value[locale]
  const u = (key: string) => t((mode === 'fins' ? FIN_UI[key] : undefined) ?? UI[key])
  const e = (english: string) => EXTRA[english]?.[locale] ?? english
  return { t, u, e }
}
