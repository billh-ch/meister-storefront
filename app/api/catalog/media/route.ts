import { fetchProducts } from '@/lib/woocommerce/queries/get-products'
import { projectPublishedMedia } from '@/lib/images/public-media'

export const dynamic = 'force-dynamic'

/** Public, bounded input for the build-time image generator. No customer data. */
export async function GET() {
  try {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') throw new Error('No published catalog in sample mode')
    const products = await fetchProducts({ requireComplete: true })
    return Response.json({ version: 1, images: projectPublishedMedia(products, process.env.NEXT_PUBLIC_WC_URL ?? '') }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    })
  } catch {
    return Response.json({ error: 'Public product media is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
