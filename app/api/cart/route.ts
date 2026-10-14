import { queryLocale } from '@/lib/i18n/request'
import { translate } from '@/lib/i18n'
import { NextResponse } from 'next/server'
import { getCart } from '@/lib/cart/cookie'
import { resolveCartItems } from '@/lib/cart/resolve'

/** Private, server-priced cart summary. Never cache one shopper's cart. */
export async function GET(request: Request) {
  const locale = queryLocale(request)
  if (!locale.success) return Response.json({ error: 'Invalid language selection.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } })
  const t = (source: string) => translate(locale.data, source)
  try {
    const cart = await resolveCartItems(await getCart())
    return NextResponse.json({ ...cart, lines: cart.lines.map(line => ({ ...line, ...(line.checkoutIssue ? { checkoutIssue: t(line.checkoutIssue) } : {}) })) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json(
      { error: t('Could not verify your cart. Please try again.') },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
