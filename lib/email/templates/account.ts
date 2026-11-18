import { localePath, translate, type Locale } from '@/lib/i18n'
import { emailAssetBase, emailTheme as c } from '../config'
import { button, escapeHtml, layout, paragraph, section } from '../html'
import type { BuiltEmail } from './customer'

export interface WelcomeOffer { code: string; percent: number }

export function buildWelcome(input: { firstName?: string; locale: Locale; offer?: WelcomeOffer | null }): BuiltEmail {
  const { locale, offer } = input
  const t = (s: string, v?: Record<string, string | number>) => translate(locale, s, v)
  const heading = t('Welcome to Meister')
  const hello = input.firstName ? t('Hi {name},', { name: input.firstName }) : t('Hello,')
  const intro = `${hello} ${t('your account has been created.')}`
  const benefits = t('With your account you can follow your orders and keep your delivery address ready for next time.')
  const shopUrl = `${emailAssetBase()}${localePath('/shop', locale)}`
  const gift = offer ? {
    title: t('A welcome gift: {percent}% off your next order', { percent: offer.percent }),
    howTo: t('Use code {code} at checkout. One use per customer.', { code: offer.code }),
  } : null
  const body = paragraph(intro) + paragraph(benefits) +
    (gift ? section(gift.title, `<p style="margin:0 0 4px;">${escapeHtml(gift.howTo)}</p><p style="margin:8px 0 0;display:inline-block;padding:10px 16px;border:1px dashed ${c.gold};font-size:18px;font-weight:bold;letter-spacing:2px;color:${c.gold};">${escapeHtml(offer!.code)}</p>`) : '') +
    button(shopUrl, t('Visit the shop'))
  const text = [heading, '', intro, '', benefits, ...(gift ? ['', gift.title, gift.howTo] : []), '', `${t('Visit the shop')}: ${shopUrl}`].join('\n')
  return {
    subject: heading,
    html: layout({ locale, preheader: heading, heading, body, footerNote: t('You are receiving this email because an account was created with this address.') }),
    text,
  }
}
