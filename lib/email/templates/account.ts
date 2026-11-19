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

export function buildPasswordReset(input: { firstName?: string; locale: Locale; resetUrl: string; minutes: number }): BuiltEmail {
  const { locale, resetUrl } = input
  const t = (s: string, v?: Record<string, string | number>) => translate(locale, s, v)
  const heading = t('Reset your password')
  const hello = input.firstName ? t('Hi {name},', { name: input.firstName }) : t('Hello,')
  const intro = `${hello} ${t('we received a request to reset the password for your account.')}`
  const expiry = t('This link expires in {minutes} minutes and can be used once.', { minutes: input.minutes })
  const ignore = t("If you didn't ask for this, you can ignore this email. Your password will not change.")
  const body = paragraph(intro) + button(resetUrl, t('Choose a new password')) + paragraph(expiry) + paragraph(ignore) +
    `<p style="margin:16px 0 0;font-size:11px;word-break:break-all;color:${c.muted};">${escapeHtml(resetUrl)}</p>`
  const text = [heading, '', intro, '', `${t('Choose a new password')}: ${resetUrl}`, '', expiry, ignore].join('\n')
  return {
    subject: t('Reset your Meister password'),
    html: layout({ locale, preheader: heading, heading, body, footerNote: t('You are receiving this email because a password reset was requested for this address.') }),
    text,
  }
}

export function buildPasswordChanged(input: { firstName?: string; locale: Locale; supportEmail: string }): BuiltEmail {
  const { locale } = input
  const t = (s: string, v?: Record<string, string | number>) => translate(locale, s, v)
  const heading = t('Your password was changed')
  const hello = input.firstName ? t('Hi {name},', { name: input.firstName }) : t('Hello,')
  const intro = `${hello} ${t('the password for your account was just changed.')}`
  const warning = t("If this wasn't you, reset your password again straight away and contact us at {email}.", { email: input.supportEmail })
  const signIn = `${emailAssetBase()}${localePath('/sign-in', locale)}`
  const body = paragraph(intro) + paragraph(warning) + button(signIn, t('Sign in'))
  const text = [heading, '', intro, '', warning, '', `${t('Sign in')}: ${signIn}`].join('\n')
  return {
    subject: heading,
    html: layout({ locale, preheader: heading, heading, body, footerNote: t('You are receiving this email because the password of your account was changed.') }),
    text,
  }
}
