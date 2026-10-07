import type { Metadata, MetadataRoute } from 'next'
import sanitizeHtml from 'sanitize-html'
import { decodeHTML } from 'entities'
import { canonicalProductUrl, getPublicSiteUrl, isIndexingAllowed } from './site'

type Environment = Parameters<typeof getPublicSiteUrl>[0]
const SOCIAL_IMAGE = '/images/hero-sectio-image.JPEG'

export function plainTextDescription(html: string, maxLength: number): string {
  const text = decodeHTML(sanitizeHtml(html.replace(/<\/?(?:p|li|h[1-6]|div|br|tr)\b[^>]*>/gi, ' '), {
    allowedTags: [], allowedAttributes: {},
  })).replace(/\s+/g, ' ').trim()
  return Array.from(text).slice(0, Math.max(0, maxLength)).join('').trim()
}

interface PageMetadataInput {
  title: string
  description: string
  path: string
  image?: string
  noindex?: boolean
}

export function buildPageMetadata(input: PageMetadataInput, env: Environment = process.env): Metadata {
  const url = new URL(input.path, getPublicSiteUrl(env)).href
  const image = new URL(input.image || SOCIAL_IMAGE, getPublicSiteUrl(env)).href
  const index = isIndexingAllowed(env) && !input.noindex
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: { index, follow: true },
    openGraph: { title: input.title, description: input.description, type: 'website', siteName: 'Meister', url, images: [{ url: image }] },
    twitter: { card: 'summary_large_image', title: input.title, description: input.description, images: [image] },
  }
}

interface CollectionMetadataInput extends PageMetadataInput {
  currentPage: number
  searchParams: Record<string, string | string[] | undefined>
}

export function buildCollectionMetadata(input: CollectionMetadataInput, env: Environment = process.env): Metadata {
  const filtered = ['sort', 'brand', 'category', 'minPrice', 'maxPrice', 'sale']
    .some(key => Boolean(input.searchParams[key]?.length))
  const page = Math.max(1, input.currentPage)
  const paginated = !filtered && page > 1
  return buildPageMetadata({
    ...input,
    title: paginated ? input.title.replace(' — Meister', ` — Page ${page} — Meister`) : input.title,
    path: paginated ? `${input.path}?page=${page}` : input.path,
    noindex: input.noindex || filtered,
  }, env)
}

interface ProductMetadataInput {
  id: string
  slug: string
  name: string
  shortDescriptionHtml: string
  descriptionHtml: string
  gallery: { src: string }[]
}

export function buildProductMetadata(product: ProductMetadataInput, env: Environment = process.env): Metadata {
  const description = plainTextDescription(product.shortDescriptionHtml || product.descriptionHtml, 160) ||
    `${product.name} — diving and spearfishing equipment from Meister.`
  return buildPageMetadata({
    title: `${product.name} — Meister`,
    description,
    path: canonicalProductUrl(product.slug, env),
    image: product.gallery[0]?.src,
    noindex: !/^\d+$/.test(product.id),
  }, env)
}

export function buildRobots(env: Environment = process.env): MetadataRoute.Robots {
  if (!isIndexingAllowed(env)) return { rules: { userAgent: '*', disallow: '/' } }
  // Let crawlers see the noindex tags on search/cart/auth pages; blocking
  // those URLs here would prevent an already indexed URL being removed.
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: new URL('/sitemap.xml', getPublicSiteUrl(env)).href }
}

export const categoryMetadata: Record<string, { title: string; description: string }> = {
  fins: { title: 'Freediving Fins & Carbon Blades — Meister', description: 'Browse freediving fins, carbon blades and foot pockets at Meister. Compare equipment and choose the available options for your setup.' },
  suits: { title: 'Freediving & Spearfishing Wetsuits — Meister', description: 'Explore freediving and spearfishing wetsuits at Meister. View product specifications and available sizing and thickness options.' },
  guns: { title: 'Spearguns & Spearfishing Equipment — Meister', description: 'Browse spearguns at Meister. Compare models, specifications and available options for your spearfishing equipment.' },
  accessories: { title: 'Diving & Spearfishing Accessories — Meister', description: 'Explore diving and spearfishing accessories at Meister. Find equipment and product details to complete your diving setup.' },
  merch: { title: 'Meister Merchandise — Meister', description: 'Browse Meister merchandise and explore available products, prices and options.' },
}
