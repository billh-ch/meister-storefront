import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import ProductCarousel from '@/components/product-carousel'
import ProductBreadcrumbs from '@/components/product/product-breadcrumbs'
import ProductBuyBox from '@/components/product/product-buy-box'
import ProductSpecsTable from '@/components/product/product-specs-table'
import AccordionItem from '@/components/product/accordion-item'
import { getProductBySlug, getProducts } from '@/lib/woocommerce'
import { shippingReturnsCopy, type ProductDetail, type StockStatus } from '@/lib/mock-data'

interface ProductPageProps {
  // `params` is a Promise in Next 16 and must be awaited. The generated
  // `PageProps<'/products/[slug]'>` helper only exists once `next dev` or
  // `next typegen` has seen this route, so the shape is written out here.
  params: Promise<{ slug: string }>
}

/** Product details: ISR 30s, matching the cache strategy in mock-data.ts. */
export const revalidate = 30

/** Slugs beyond the prerendered set render on demand rather than 404ing. */
export const dynamicParams = true

/**
 * WooCommerce returns Greek slugs already percent-encoded (WordPress stores
 * them that way in `post_name`), while Next expects *decoded* param values
 * here and percent-encodes them itself when building the path. Handing the
 * encoded form straight through would double-encode it and prerender
 * `/products/%25ce%25bc…`, which no real request ever hits.
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  // fetchProducts caps at per_page=50, so the remaining catalogue renders
  // on first request and is cached from then on.
  const products = await getProducts()
  return products.map((product) => ({ slug: decodeSlug(product.slug) }))
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  // Deduped with the page's own call by request memoisation — not a second fetch.
  const product = await getProductBySlug(slug)

  if (!product) {
    return { title: 'Product not found — Meister' }
  }

  const description =
    stripTags(product.shortDescriptionHtml || product.descriptionHtml).slice(0, 160) ||
    `${product.name} — premium diving equipment from Meister, Athens.`

  return {
    title: `${product.name} — Meister`,
    description,
    openGraph: {
      title: `${product.name} — Meister`,
      description,
      type: 'website',
      images: product.gallery[0] ? [{ url: product.gallery[0].src }] : undefined,
    },
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const SCHEMA_AVAILABILITY: Record<StockStatus, string> = {
  instock: 'https://schema.org/InStock',
  outofstock: 'https://schema.org/OutOfStock',
  onbackorder: 'https://schema.org/BackOrder',
}

function buildJsonLd(product: ProductDetail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: stripTags(product.descriptionHtml).slice(0, 500),
    image: product.gallery.map((image) => image.src),
    ...(product.sku && { sku: product.sku }),
    brand: { '@type': 'Brand', name: 'Meister' },
    offers: {
      '@type': 'Offer',
      // Raw number, never the formatted string — that one is Greek-locale
      // formatted with a comma decimal separator.
      price: product.price,
      priceCurrency: 'EUR',
      availability: SCHEMA_AVAILABILITY[product.stockStatus],
    },
  }
}

const RELATED_LIMIT = 8

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  // Must run before anything that could open a Suspense boundary: once the
  // response starts streaming, Next can only inject `noindex` instead of
  // returning a real 404 status. This is also why there is no loading.tsx.
  if (!product) notFound()

  const allProducts = await getProducts()
  const related = allProducts
    .filter((candidate) => candidate.category === product.category)
    .filter((candidate) => candidate.slug !== product.slug)
    .slice(0, RELATED_LIMIT)

  const specs = <ProductSpecsTable product={product} />

  return (
    <main style={{ backgroundColor: '#1B1B18' }}>
      <Navbar />

      {/* pb-24 below lg keeps the sticky add-to-cart bar off the footer */}
      <div className="pb-24 lg:pb-0">
        <ProductBreadcrumbs
          categorySlug={product.category}
          productName={product.name}
        />

        <div className="mx-auto max-w-[1400px] px-4 pb-12 sm:px-6 md:px-10">
          <ProductBuyBox product={product} />

          {/* ── Details ── */}
          <div className="mt-12 max-w-3xl lg:mt-16">
            {product.descriptionHtml && (
              <AccordionItem title="DESCRIPTION" defaultOpen>
                <div
                  className="product-prose"
                  // Sanitised server-side in lib/sanitize.ts before it was
                  // cached — this string never contains untrusted markup.
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              </AccordionItem>
            )}

            {specs && <AccordionItem title="SPECIFICATIONS">{specs}</AccordionItem>}

            <AccordionItem title="SHIPPING & RETURNS">
              <div className="product-prose">
                {shippingReturnsCopy.map((section) => (
                  <div key={section.headline}>
                    <h3>{section.headline}</h3>
                    <p>{section.body}</p>
                  </div>
                ))}
              </div>
            </AccordionItem>
          </div>
        </div>

        <ProductCarousel
          products={related}
          title="YOU MAY ALSO LIKE"
          viewAllHref={`/${product.category}`}
          ariaLabel="Related products"
        />
      </div>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(product)) }}
      />
    </main>
  )
}
