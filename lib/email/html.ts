import { emailTheme as c, sellerIdentity } from './config'
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

/** Small table-based layout that survives Outlook and Gmail: inline styles only. */
export function layout(opts: { locale: Locale; preheader: string; heading: string; body: string; footer?: boolean }) {
  const t = (source: string, values?: Record<string, string | number>) => translate(opts.locale, source, values)
  const seller = sellerIdentity()
  const footer = opts.footer === false ? '' : `
    <tr><td style="padding:20px 28px;border-top:1px solid ${c.line};font-size:12px;line-height:1.6;color:${c.muted};">
      <p style="margin:0 0 8px;">${escapeHtml(t('This email confirms activity on your order. It is not a tax invoice or receipt.'))}</p>
      <p style="margin:0;">${escapeHtml(seller.legalName)}${seller.vatNumber ? ` · ${escapeHtml(t('VAT No. {vat}', { vat: seller.vatNumber }))}` : ''}<br>
      ${escapeHtml(seller.address)}<br>
      ${escapeHtml(seller.telephone)} · <a href="mailto:${escapeHtml(seller.email)}" style="color:${c.muted};">${escapeHtml(seller.email)}</a><br>
      <a href="${escapeHtml(seller.privacyUrl)}" style="color:${c.muted};">${escapeHtml(t('Privacy policy'))}</a></p>
    </td></tr>`
  return `<!doctype html><html lang="${opts.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${c.page};font-family:${c.font};color:${c.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${c.card};">
  <tr><td style="background:${c.header};padding:18px 28px;font-size:14px;letter-spacing:2px;font-weight:bold;color:${c.gold};">MEISTER &amp; MEISTER DIVE</td></tr>
  <tr><td style="padding:28px 28px 8px;"><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${c.text};">${escapeHtml(opts.heading)}</h1></td></tr>
  <tr><td style="padding:0 28px 24px;font-size:14px;line-height:1.6;">${opts.body}</td></tr>
  ${footer}
</table></td></tr></table></body></html>`
}

export const section = (title: string, inner: string) =>
  `<h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${c.muted};">${escapeHtml(title)}</h2>${inner}`

export const paragraph = (value: string) => `<p style="margin:0 0 12px;">${escapeHtml(value)}</p>`
export const linesHtml = (lines: string[]) => lines.map(escapeHtml).join('<br>')
export const button = (href: string, label: string) =>
  `<p style="margin:16px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${c.header};color:${c.gold};text-decoration:none;padding:12px 20px;font-weight:bold;font-size:13px;letter-spacing:1px;">${escapeHtml(label)}</a></p>`
