import { fetchCompareCatalog } from '@/lib/compare/catalog'
import { normalizeIds } from '@/lib/wishlist/model'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('ids')?.split(',') ?? []
  const ids = normalizeIds(raw)
  if (!ids.length || ids.length > 4 || ids.length !== raw.length) return Response.json({ error: 'Choose up to four unique products.' }, { status: 400, headers })
  try { return Response.json(await fetchCompareCatalog(ids), { headers }) }
  catch { return Response.json({ error: 'Could not load products for comparison. Please retry.' }, { status: 503, headers }) }
}
