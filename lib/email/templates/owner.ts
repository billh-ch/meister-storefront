import { emailTheme as c } from '../config'
import { addressLines, escapeHtml, formatMoney, layout, linesHtml, paragraph, section } from '../html'
import { orderNumber, orderTotals, type EmailOrder } from '../order'
import type { BuiltEmail } from './customer'

/** Internal alert for the shop owner. English only, plain and scannable. */
export function buildOwnerAlert(order: EmailOrder): BuiltEmail {
  const number = orderNumber(order)
  const totals = orderTotals(order)
  const money = (cents: number) => formatMoney(cents, order.currency, 'en')
  const customer = [[order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(' '), order.billing?.email, order.billing?.phone].filter(Boolean) as string[]
  const coupon = order.coupon_lines?.map(line => line.code).filter(Boolean).join(', ')
  const method = order.shipping_lines?.[0]?.method_title
  const items = totals.lines.map(l => `${l.quantity} × ${l.name}${l.options.length ? ` (${l.options.join(', ')})` : ''} — ${money(l.gross)}`)
  const body = paragraph(`A new paid order has been placed: ${number}, total ${money(totals.totalCents)}.`) +
    section('Customer', `<p style="margin:0;">${linesHtml(customer.length ? customer : ['(no contact details on the order)'])}</p>`) +
    section('Items', `<p style="margin:0;">${linesHtml(items)}</p>`) +
    section('Delivery', `<p style="margin:0;">${method ? `<strong style="color:#FFFFFF;">${escapeHtml(method)}</strong><br>` : ''}${linesHtml(addressLines(order.shipping))}</p>`) +
    (coupon ? section('Discount code', paragraph(`${coupon} (−${money(totals.discountCents)})`)) : '') +
    `<p style="margin:24px 0 0;color:${c.muted};">Open the order in WooCommerce to fulfil it.</p>`
  const text = [`New order ${number} — ${money(totals.totalCents)}`, '', ...customer, '', ...items, '', method ?? '', ...addressLines(order.shipping), ...(coupon ? ['', `Discount code: ${coupon}`] : [])].join('\n')
  return { subject: `New order ${number} — ${money(totals.totalCents)}`, html: layout({ locale: 'en', preheader: `New order ${number}`, heading: `New order ${number}`, body, footer: false }), text }
}
