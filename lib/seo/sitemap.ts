import { canonicalProductUrl, getPublicSiteUrl, isIndexingAllowed } from './site'
type Environment = Parameters<typeof getPublicSiteUrl>[0]
type SitemapProduct = { id: string; slug: string }

export function buildSitemapUrls(products: SitemapProduct[], categories: string[], env: Environment = process.env): string[] {
  if (!isIndexingAllowed(env)) return []
  if (products.some(product => !/^\d+$/.test(product.id) || !product.slug)) {
    throw new Error('Sitemaps require real published products.')
  }
  const site = getPublicSiteUrl(env)
  return [...new Set([
    site.href, new URL('/shop', site).href,
    ...categories.map(slug => new URL(`/${encodeURIComponent(slug)}`, site).href),
    ...products.map(product => canonicalProductUrl(product.slug, env)),
  ])]
}

function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
}

/** An explicit route response lets outages return retryable 503/no-store,
 * instead of caching an empty or mock-derived sitemap as a success. Catalog
 * fetches are cached; XML has no independent CDN copy that could outlive a
 * signed product-deletion invalidation. */
export async function sitemapResponse(
  loadProducts: () => Promise<SitemapProduct[]>,
  categories: string[],
  env: Environment = process.env,
): Promise<Response> {
  try {
    const products = isIndexingAllowed(env) ? await loadProducts() : []
    const urls = buildSitemapUrls(products, categories, env)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`).join('\n')}\n</urlset>`
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': isIndexingAllowed(env) ? 'no-store' : 'private, no-store' } })
  } catch {
    return new Response('Sitemap temporarily unavailable. Please retry later.', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60', 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}
