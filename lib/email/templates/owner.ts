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

const REASON_LABELS: Record<string, string> = {
  ordered_by_mistake: 'Ordered by mistake', changed_mind: 'Changed their mind', found_cheaper: 'Found a better price',
  delivery_too_slow: 'Delivery takes too long', other: 'Other reason', none: 'No reason given',
}

/** The customer cancelled from their account; Stripe has already refunded them. */
export function buildOwnerCancelAlert(order: EmailOrder, cancel: { amountCents: number; refundId: string; reason: string; problems: string[] }): BuiltEmail {
  const number = orderNumber(order)
  const money = (cents: number) => formatMoney(cents, order.currency, 'en')
  const reason = REASON_LABELS[cancel.reason] ?? cancel.reason
  const customer = [[order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(' '), order.billing?.email].filter(Boolean) as string[]
  const items = orderTotals(order).lines.map(l => `${l.quantity} × ${l.name}${l.options.length ? ` (${l.options.join(', ')})` : ''}`)
  const action = cancel.problems.length ? 'Action needed' : 'No action needed'
  const body = paragraph(`The customer cancelled order ${number} from their account and was refunded ${money(cancel.amountCents)} in Stripe (${cancel.refundId}). Do not ship it.`) +
    (cancel.problems.length ? section('Action needed', `<p style="margin:0;color:#FF6B6B;">${linesHtml(cancel.problems)}</p>`) : '') +
    section('Reason', paragraph(reason)) +
    section('Customer', `<p style="margin:0;">${linesHtml(customer.length ? customer : ['(no contact details on the order)'])}</p>`) +
    section('Items', `<p style="margin:0;">${linesHtml(items)}</p>`)
  const text = [`Order ${number} cancelled by the customer — ${money(cancel.amountCents)} refunded (${cancel.refundId}). Do not ship it.`, '',
    ...(cancel.problems.length ? ['ACTION NEEDED:', ...cancel.problems, ''] : []), `Reason: ${reason}`, '', ...customer, '', ...items].join('\n')
  const subject = `Order ${number} cancelled by customer — ${action}`
  return { subject, html: layout({ locale: 'en', preheader: subject, heading: `Order ${number} cancelled`, body, footer: false }), text }
}
