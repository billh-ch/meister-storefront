import { translate, type Locale } from '@/lib/i18n'
import { emailTheme as c, sellerIdentity } from '../config'
import { addressLines, button, escapeHtml, formatMoney, layout, linesHtml, paragraph, receiptDate, section } from '../html'
import { heroImage, metaValue, orderNumber, orderTotals, type EmailOrder } from '../order'
import { extractTracking } from '../tracking'

export interface BuiltEmail { subject: string; html: string; text: string }

const isPickup = (order: EmailOrder) => (order.shipping_lines ?? []).some(line => line.method_id === 'local_pickup')

/** Pickup point saved on the order by checkout (BOX NOW locker), if any. */
function lockerLines(order: EmailOrder): string[] {
  return [metaValue(order, '_boxnow_locker_name'), metaValue(order, '_boxnow_locker_address'), metaValue(order, '_boxnow_locker_postal_code')].filter(Boolean)
}

function itemsHtml(order: EmailOrder, locale: Locale) {
  const totals = orderTotals(order)
  const money = (value: number) => formatMoney(value, order.currency, locale)
  const rows = totals.lines.map(line => `<tr>
    <td style="padding:8px 0;border-bottom:1px solid ${c.line};vertical-align:top;color:${c.text};">${escapeHtml(`${line.quantity} × ${line.name}`)}${line.options.length ? `<br><span style="font-size:12px;color:${c.muted};">${escapeHtml(line.options.join(' · '))}</span>` : ''}</td>
    <td align="right" style="padding:8px 0 8px 12px;border-bottom:1px solid ${c.line};vertical-align:top;white-space:nowrap;color:${c.text};">${escapeHtml(money(line.gross))}</td></tr>`).join('')
  return { totals, money, rows }
}

function totalsRows(order: EmailOrder, locale: Locale) {
  const t = (s: string, v?: Record<string, string | number>) => translate(locale, s, v)
  const { totals, money } = itemsHtml(order, locale)
  const code = order.coupon_lines?.find(line => line.code)?.code
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;${strong ? `font-weight:bold;font-size:15px;color:${c.text};border-top:1px solid ${c.line};border-bottom:1px solid ${c.line};` : ''}">${escapeHtml(label)}</td><td align="right" style="padding:4px 0;${strong ? `font-weight:bold;font-size:22px;color:${c.text};border-top:1px solid ${c.line};border-bottom:1px solid ${c.line};` : ''}">${escapeHtml(value)}</td></tr>`
  const plain: string[] = [`${t('Items')}: ${money(totals.itemsCents)}`]
  let html = row(t('Items'), money(totals.itemsCents))
  if (totals.discountCents > 0) {
    const label = code ? t('Discount ({code})', { code }) : t('Discount')
    html += row(label, `− ${money(totals.discountCents)}`); plain.push(`${label}: -${money(totals.discountCents)}`)
  }
  html += row(t('Delivery'), money(totals.shippingCents)); plain.push(`${t('Delivery')}: ${money(totals.shippingCents)}`)
  html += row(t('Total'), money(totals.totalCents), true); plain.push(`${t('Total')}: ${money(totals.totalCents)}`)
  if (totals.vatCents > 0) { const vat = t('Includes VAT of {amount}', { amount: money(totals.vatCents) }); html += `<tr><td colspan="2" style="padding:2px 0;font-size:12px;color:${c.muted};">${escapeHtml(vat)}</td></tr>`; plain.push(vat) }
  return { html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${html}</table>`, plain }
}

function deliveryHtml(order: EmailOrder, locale: Locale) {
  const t = (s: string) => translate(locale, s)
  const seller = sellerIdentity()
  const method = order.shipping_lines?.[0]?.method_title
  const locker = lockerLines(order)
  const where = isPickup(order) ? [seller.address] : locker.length ? locker : addressLines(order.shipping)
  const title = isPickup(order) ? t('Pickup from our store') : locker.length ? t('Pickup point') : t('Delivery address')
  return { title, where, method, html: section(title, `<p style="margin:0;">${method ? `<strong style="color:${c.text};">${escapeHtml(method)}</strong><br>` : ''}${linesHtml(where)}</p>`) }
}

const greeting = (order: EmailOrder, locale: Locale) => {
  const name = order.billing?.first_name || order.shipping?.first_name
  return name ? translate(locale, 'Hi {name},', { name }) : translate(locale, 'Hello,')
}
const contactLine = (locale: Locale) => {
  const s = sellerIdentity()
  return translate(locale, 'Questions about your order? Reply to this email or contact us at {email} or {phone}.', { email: s.email, phone: s.telephone })
}

export function buildOrderConfirmation(order: EmailOrder, locale: Locale): BuiltEmail {
  const t = (s: string, v?: Record<string, string | number>) => translate(locale, s, v)
  const number = orderNumber(order)
  const { rows } = itemsHtml(order, locale)
  const totals = totalsRows(order, locale)
  const delivery = deliveryHtml(order, locale)
  const heading = t('Thank you for your order')
  const intro = `${greeting(order, locale)} ${t("we've received your payment and your order is being prepared.")}`
  const body = paragraph(intro) +
    section(t('Your items'), `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`) + totals.html +
    delivery.html + section(t('Payment'), paragraph(t('Paid online by card.')).replace('margin:0 0 12px', 'margin:0')) +
    `<p style="margin:28px 0 0;text-align:center;font-size:16px;font-style:italic;color:${c.text};">${escapeHtml(t('Thank you for your purchase!'))}</p>` +
    `<p style="margin:16px 0 0;color:${c.muted};font-size:12px;">${escapeHtml(contactLine(locale))}</p>`
  const text = [
    heading, '', intro, '', t('Order {number}', { number }), '',
    ...orderTotals(order).lines.map(l => `${l.quantity} x ${l.name}${l.options.length ? ` (${l.options.join(', ')})` : ''}`), '',
    ...totals.plain, '', `${delivery.title}:`, ...(delivery.method ? [delivery.method] : []), ...delivery.where, '', contactLine(locale),
  ].join('\n')
  return { subject: t('Order {number} confirmed — Meister & Meister Dive', { number }), html: layout({ locale, preheader: t('Thank you for your order.'), heading, subtitle: t('Order {number}', { number }), date: receiptDate(order.date_created_gmt || order.date_created), hero: heroImage(order), body }), text }
}

export function buildOrderCompleted(order: EmailOrder, locale: Locale): BuiltEmail {
  const t = (s: string, v?: Record<string, string | number>) => translate(locale, s, v)
  const number = orderNumber(order)
  const pickup = isPickup(order)
  const tracking = pickup ? [] : extractTracking(order)
  const delivery = deliveryHtml(order, locale)
  const heading = pickup ? t('Your order is ready for pickup') : t('Your order is on its way')
  const intro = `${greeting(order, locale)} ${pickup ? t('your order {number} is ready to collect from our store.', { number }) : t('your order {number} has been dispatched.', { number })}`
  const trackingHtml = tracking.length ? section(t('Tracking'), tracking.map(entry =>
    `<p style="margin:0 0 4px;">${entry.carrier ? `<strong style="color:${c.text};">${escapeHtml(entry.carrier)}</strong> · ` : ''}${escapeHtml(t('Tracking number: {number}', { number: entry.number }))}</p>${entry.url ? button(entry.url, t('Track your parcel')) : ''}`).join('')) : ''
  const itemLines = orderTotals(order).lines
  const body = paragraph(intro) + trackingHtml + delivery.html +
    section(t('Your items'), `<p style="margin:0;">${linesHtml(itemLines.map(l => `${l.quantity} × ${l.name}${l.options.length ? ` (${l.options.join(', ')})` : ''}`))}</p>`) +
    `<p style="margin:28px 0 0;text-align:center;font-size:16px;font-style:italic;color:${c.text};">${escapeHtml(t('Thank you for your purchase!'))}</p>` +
    `<p style="margin:16px 0 0;color:${c.muted};font-size:12px;">${escapeHtml(contactLine(locale))}</p>`
  const text = [
    heading, '', intro, '',
    ...(tracking.length ? [`${t('Tracking')}:`, ...tracking.flatMap(e => [`${e.carrier ? `${e.carrier}: ` : ''}${t('Tracking number: {number}', { number: e.number })}`, ...(e.url ? [e.url] : [])]), ''] : []),
    `${delivery.title}:`, ...(delivery.method ? [delivery.method] : []), ...delivery.where, '',
    ...itemLines.map(l => `${l.quantity} x ${l.name}`), '', contactLine(locale),
  ].join('\n')
  const subject = pickup ? t('Your order {number} is ready for pickup', { number }) : t('Your order {number} is on its way', { number })
  return { subject, html: layout({ locale, preheader: heading, heading, subtitle: t('Order {number}', { number }), date: receiptDate(order.date_created_gmt || order.date_created), hero: heroImage(order), body }), text }
}
