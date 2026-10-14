import { cache } from 'react'
import { headers } from 'next/headers'
import { translate, validateLocale, type Translator } from './index'
/** React cache is scoped to the server render, never shared between requests. */
export const getLocale = cache(async () => validateLocale((await headers()).get('x-meister-locale')))
export const getTranslator = cache(async (): Promise<Translator> => {
  const locale = await getLocale()
  return (source, values) => translate(locale, source, values)
})
