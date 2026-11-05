import type Stripe from 'stripe'
import type { PromotionQuote } from './schema'

type MonetaryQuote = Pick<PromotionQuote, 'lines' | 'shipping' | 'methods' | 'shippingId' | 'total'>
/** Project Woo's gross discounted snapshot; Stripe must not calculate another tax/discount. */
export function stripePromotionLines(quote: MonetaryQuote): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const item = (name: string, quantity: number, amount: number) => ({ quantity, price_data: { currency: 'eur', product_data: { name }, unit_amount: amount } })
  const title = (line: MonetaryQuote['lines'][number]) => {
    const choices = Object.entries(line.attributes ?? {}).map(([key, value]) => `${key}: ${value}`).join(', ')
    return choices ? `${line.name} (${choices})` : line.name
  }
  let lines = quote.lines.flatMap(line => {
    const low = Math.floor(line.total / line.quantity)
    const highCount = line.total % line.quantity
    return [ ...(highCount ? [item(title(line), highCount, low + 1)] : []), ...(line.quantity > highCount ? [item(title(line), line.quantity - highCount, low)] : []) ]
  })
  // Stripe permits 100 payment-mode lines; a 50-line odd-cent cart can otherwise need 101.
  if (lines.length > 99) lines = quote.lines.map(line => item(`${line.quantity} × ${title(line)}`, 1, line.total))
  lines.push(item(quote.methods.find(method => method.id === quote.shippingId)?.title ?? 'Delivery', 1, quote.shipping))
  if (lines.reduce((sum, line) => sum + line.quantity * line.price_data.unit_amount, 0) !== quote.total) throw new Error('Payment snapshot does not balance')
  return lines
}
