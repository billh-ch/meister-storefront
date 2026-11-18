import { emailAssetBase, emailTheme as c, sellerIdentity } from './config'
import { translate, type Locale } from '@/lib/i18n'

export const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

export function formatMoney(cents: number, currency: string | undefined, locale: Locale) {
  const code = /^[A-Z]{3}$/.test(currency ?? '') ? currency! : 'EUR'
  return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-IE', { style: 'currency', currency: code }).format(cents / 100)
}

export function formatDate(iso: string | undefined, locale: Locale) {
  const date = iso ? new Date(iso.endsWith('Z') || /[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`) : new Date()
  const valid = Number.isNaN(date.getTime()) ? new Date() : date
  return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-IE', { dateStyle: 'medium', timeZone: 'Europe/Athens' }).format(valid)
}

export const addressLines = (a: { first_name?: string; last_name?: string; address_1?: string; address_2?: string; city?: string; postcode?: string; country?: string; phone?: string } | undefined) =>
  [
    [a?.first_name, a?.last_name].filter(Boolean).join(' '),
    a?.address_1, a?.address_2,
    [a?.postcode, a?.city].filter(Boolean).join(' '),
    a?.country,
  ].filter((line): line is string => Boolean(line && line.trim()))

/** DD-MM-YYYY in Athens time, like a printed receipt. */
export function receiptDate(iso: string | undefined) {
  const date = iso ? new Date(iso.endsWith('Z') || /[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`) : new Date()
  const valid = Number.isNaN(date.getTime()) ? new Date() : date
  const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Athens' }).formatToParts(valid)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('day')}-${get('month')}-${get('year')}`
}

/**
 * Table-based "till receipt" layout: a dark card on a light page, wordmark and
 * date on top, optional product photo, big uppercase title with an underlined
 * subtitle, and a sawtooth torn edge at the bottom. Inline styles only.
 */
export function layout(opts: {
  locale: Locale; preheader: string; heading: string; subtitle?: string; date?: string
  hero?: { src: string; alt: string }; body: string; footer?: boolean
  /** Replaces the default "not a tax invoice" line (for emails that are not about an order). */
  footerNote?: string
}) {
  const t = (source: string, values?: Record<string, string | number>) => translate(opts.locale, source, values)
  const seller = sellerIdentity()
  const display = opts.locale === 'el' ? c.displayEl : c.displayEn
  const footer = opts.footer === false ? '' : `
    <tr><td style="padding:20px 28px 28px;font-size:11px;line-height:1.7;color:${c.muted};">
      <p style="margin:0 0 8px;">${escapeHtml(opts.footerNote ?? t('This email confirms activity on your order. It is not a tax invoice or receipt.'))}</p>
      <p style="margin:0;">${escapeHtml(seller.legalName)}${seller.vatNumber ? ` · ${escapeHtml(t('VAT No. {vat}', { vat: seller.vatNumber }))}` : ''}<br>
      ${escapeHtml(seller.address)}<br>
      ${escapeHtml(seller.telephone)} · <a href="mailto:${escapeHtml(seller.email)}" style="color:${c.muted};">${escapeHtml(seller.email)}</a><br>
      <a href="${escapeHtml(seller.privacyUrl)}" style="color:${c.muted};">${escapeHtml(t('Privacy policy'))}</a></p>
    </td></tr>`
  const hero = opts.hero ? `<tr><td align="center" style="padding:8px 28px 4px;"><img src="${escapeHtml(opts.hero.src)}" alt="${escapeHtml(opts.hero.alt)}" width="260" style="display:block;width:260px;max-width:100%;height:auto;border:0;"></td></tr>` : ''
  return `<!doctype html><html lang="${opts.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&family=Zalando+Sans+Expanded:wght@700;800&display=swap" rel="stylesheet">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:0;background:${c.page};font-family:${c.font};color:${c.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
 <tr><td style="background:${c.card};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.card};">
   <tr><td style="padding:24px 28px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
     <td valign="middle" style="font-family:${display};font-size:12px;letter-spacing:3px;font-weight:bold;color:${c.gold};">MEISTER DIVING</td>
     <td valign="middle" align="right" width="110" style="padding-left:12px;"><img src="${emailAssetBase()}/email/meister-logo.png" alt="Meister" width="110" style="display:block;width:110px;max-width:110px;height:auto;border:0;font-family:${display};font-size:12px;font-weight:bold;color:${c.gold};"></td></tr></table></td></tr>
   ${hero}
   <tr><td style="padding:20px 28px 0;"><h1 style="margin:0;font-family:${display};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:${c.text};">${escapeHtml(opts.heading)}</h1>
     ${opts.subtitle || opts.date ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;"><tr>
       <td style="padding:0 0 10px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${c.soft};border-bottom:1px solid ${c.line};">${escapeHtml(opts.subtitle ?? '')}</td>
       <td align="right" style="padding:0 0 10px 12px;font-size:11px;letter-spacing:1px;color:${c.muted};white-space:nowrap;border-bottom:1px solid ${c.line};">${escapeHtml(opts.date ?? '')}</td></tr></table>` : ''}</td></tr>
   <tr><td style="padding:16px 28px 24px;font-size:13px;line-height:1.7;color:${c.soft};">${opts.body}</td></tr>
   ${footer}
  </table></td></tr>
 <tr><td style="padding:0;font-size:0;line-height:0;"><img src="${emailAssetBase()}/email/receipt-edge.png" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
</table></td></tr></table></body></html>`
}

export const section = (title: string, inner: string) =>
  `<h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${c.gold};">${escapeHtml(title)}</h2>${inner}`

export const paragraph = (value: string) => `<p style="margin:0 0 12px;">${escapeHtml(value)}</p>`
export const linesHtml = (lines: string[]) => lines.map(escapeHtml).join('<br>')
export const button = (href: string, label: string) =>
  `<p style="margin:16px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${c.gold};color:${c.onGold};text-decoration:none;padding:12px 20px;font-weight:bold;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(label)}</a></p>`
