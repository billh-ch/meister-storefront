import { normalizeIds } from '@/lib/wishlist/model'
import { wcFetch } from '@/lib/woocommerce/client'
import { mapProduct } from '@/lib/woocommerce/mappers/map-product'
import type { WcProduct } from '@/lib/woocommerce/queries/get-products'
import { products as mockProducts } from '@/lib/mock-data'

const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('ids')?.split(',') ?? []
  const ids = normalizeIds(raw)
  if (!ids.length || ids.length > 40 || ids.length !== raw.length) {
    return Response.json({ error: 'Invalid product list.' }, { status: 400, headers })
  }
  try {
    const products = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
      ? mockProducts.filter(product => ids.includes(product.id))
      : (await wcFetch<WcProduct[]>('/products', { include: ids.join(','), per_page: '40', status: 'publish' }))
          .filter(product => product.status === 'publish').map(mapProduct)
    return Response.json({ products }, { headers })
  } catch {
    return Response.json({ error: 'Could not load saved products. Please retry.' }, { status: 503, headers })
  }
}
