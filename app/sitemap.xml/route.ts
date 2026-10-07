import { allCategories } from '@/lib/categories'
import { getPublishedProducts } from '@/lib/woocommerce'
import { sitemapResponse } from '@/lib/seo/sitemap'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  return sitemapResponse(getPublishedProducts, allCategories.map(category => category.slug))
}
