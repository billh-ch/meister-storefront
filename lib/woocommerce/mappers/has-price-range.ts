/**
 * Whether a product's price spans a range rather than sitting at one figure.
 *
 * The REST payload can't answer this directly: `price` on a variable parent is
 * just the lowest variant, and `regular_price` comes back empty. WooCommerce's
 * own rendered `price_html` is the only field that shows it, because
 * `wc_format_price_range()` joins the two figures with an `&ndash;`.
 *
 * Detecting the separator rather than counting amounts matters: a discounted
 * product also renders two amounts, as `<del>old</del> <ins>new</ins>`, and
 * counting would read every sale as a range.
 */
export function hasPriceRange(priceHtml: string | undefined): boolean {
  if (!priceHtml) return false
  return priceHtml.includes('&ndash;') || priceHtml.includes('–')
}
