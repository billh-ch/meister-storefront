import { HOME_PARAGRAPHS, informationPages, isPublicContentPath, markdownResponse, pageMarkdown, publishedPriceText } from '@/lib/agents/content'
import { getPublishedProducts, getPublishedProductBySlug } from '@/lib/woocommerce'
import { canonicalProductUrl, getPublicSiteUrl } from '@/lib/seo/site'
import { plainTextDescription } from '@/lib/seo/metadata'
import { allCategories, findCategory } from '@/lib/categories'
import { paginateProducts, parseFilters, parseSort } from '@/lib/collection'

export const dynamic = 'force-dynamic'
const literal = (value: string) => value.replace(/([\\`*_{}\[\]()#+.!|<>~-])/g, '\\$1')
const recovery = () => `\n\n[Meister documentation](${new URL('/docs', getPublicSiteUrl())}) · [Sitemap](${new URL('/sitemap.xml', getPublicSiteUrl())}) · [Agent guidance](${new URL('/llms.txt', getPublicSiteUrl())})\n`
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.searchParams.get('__agent_path') || '/'
  if (path.length > 4096 || !path.startsWith('/') || !isPublicContentPath(path)) return markdownResponse('# Public content only\n\nPrivate storefront operations are not available through Markdown.' + recovery(), 403)
  if (path === '/') return markdownResponse(`# Meister — Freediving & Spearfishing Equipment\n\n${HOME_PARAGRAPHS.join('\n\n')}\n\n## Equipment categories\n\n${allCategories.map(category => `- [${category.name}](${new URL('/' + category.slug, getPublicSiteUrl())})`).join('\n')}` + recovery())
  if (informationPages[path]) return markdownResponse(pageMarkdown(informationPages[path]))
  try {
    const productMatch = path.match(/^\/products\/([^/]+)\/?$/)
    if (productMatch) {
      let slug = productMatch[1]
      try { slug = decodeURIComponent(slug) } catch { /* Literal malformed slugs get a genuine lookup/404. */ }
      const product = await getPublishedProductBySlug(slug)
      if (!product) return markdownResponse('# Product not found\n\nThis product does not exist in the published catalog.' + recovery(), 404)
      const variants = product.variants.map(variant => `- ${literal(Object.entries(variant.attributes).map(([key,value]) => `${key}: ${value || 'any option'}`).join(', ') || 'Incomplete variation attributes')}: ${publishedPriceText(variant.price)}; ${variant.stockStatus}`)
      return markdownResponse(`# ${literal(product.name)}\n\n[Product page](${canonicalProductUrl(product.slug)})\n\nPrice: ${publishedPriceText(product.price, product.priceFrom)}\nStock: ${product.stockStatus}\n\n${literal(plainTextDescription(product.descriptionHtml || product.shortDescriptionHtml, 12000))}\n\n## Available options\n\n${product.attributes.map(attribute => `- ${literal(attribute.name)}: ${literal(attribute.values.join(', '))}`).join('\n') || 'No options published.'}\n\n## Variation records\n\n${variants.join('\n') || 'No variation records published.'}\n\nConfirm the complete selection and current price in the storefront before purchase.` + recovery())
    }
    const category = findCategory(path.slice(1))
    if (path === '/shop' || category) {
      const products = await getPublishedProducts()
      const params = Object.fromEntries(url.searchParams)
      const collection = paginateProducts(category ? products.filter(product => product.category === category.slug) : products, { page: params.page, sort: parseSort(params.sort), filters: parseFilters(params) })
      return markdownResponse(`# Meister ${category?.name || 'catalog'}\n\nPage ${collection.currentPage} of ${collection.totalPages}. Prices are in EUR; review complete selections on product pages.\n\n${collection.items.map(product => `- [${literal(product.name)}](${canonicalProductUrl(product.slug)}): ${publishedPriceText(product.price, product.priceFrom)}; ${product.stockStatus}`).join('\n') || 'No matching products.'}` + recovery())
    }
  } catch {
    return markdownResponse('# Catalog temporarily unavailable\n\nThe live product catalog could not be verified. Please try again later. Demo products have not been substituted.' + recovery(), 503)
  }
  return markdownResponse('# Page not found\n\nThe requested page does not exist. Use the documentation or sitemap to find published Meister content.' + recovery(), 404)
}
