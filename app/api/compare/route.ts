import { queryLocale } from '@/lib/i18n/request'
import { translate } from '@/lib/i18n'
import { fetchCompareCatalog } from '@/lib/compare/catalog'
import { normalizeIds } from '@/lib/wishlist/model'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request) {
  const locale = queryLocale(request)
  if (!locale.success) return Response.json({ error: 'Invalid language selection.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } })
  const t = (source: string) => translate(locale.data, source)
  const raw = new URL(request.url).searchParams.get('ids')?.split(',') ?? []
  const ids = normalizeIds(raw)
  if (!ids.length || ids.length > 4 || ids.length !== raw.length) return Response.json({ error: t('Choose up to four unique products.') }, { status: 400, headers })
  try { return Response.json(await fetchCompareCatalog(ids, locale.data), { headers }) }
  catch { return Response.json({ error: t('Could not load products for comparison. Please retry.') }, { status: 503, headers }) }
}
