'use client'
import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { localePath, translate, type Locale, type Translator } from '@/lib/i18n'
const LocaleContext = createContext<Locale>('en')
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}
export function useLocale(): Locale { return useContext(LocaleContext) }
export function useTranslation(): Translator {
  const locale = useLocale()
  return useCallback((source, values) => translate(locale, source, values), [locale])
}
export function useLocalePath() {
  const locale = useLocale()
  return useCallback((path: string) => localePath(path, locale), [locale])
}
