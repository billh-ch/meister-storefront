import { wcFetch } from '../client'
import type { WcImage, WcProduct } from './get-products'

export interface WcAttribute {
  id: number
  name: string
  /** WooCommerce's "used for variations" flag. */
  variation: boolean
  visible: boolean
  options: string[]
}

export interface WcDimensions {
  length: string
  width: string
  height: string
}

/** The fields the listing type omits, only fetched on the detail route. */
export interface WcProductDetail extends WcProduct {
  description: string
  short_description: string
  sku: string
  regular_price: string
  sale_price: string
  on_sale: boolean
  stock_status: string
  stock_quantity: number | null
  attributes: WcAttribute[]
  weight: string
  dimensions: WcDimensions
}

export interface WcVariationAttribute {
  id: number
  name: string
  option: string
}

export interface WcVariation {
  id: number
  price: string
  regular_price: string
  sale_price: string
  on_sale: boolean
  stock_status: string
  image?: WcImage
  attributes: WcVariationAttribute[]
}

/** ISR window for product details — matches the strategy noted in mock-data.ts. */
const DETAIL_REVALIDATE = 30

/**
 * WooCommerce can't fetch by slug on `/products/{id}`, so this filters the
 * collection endpoint instead and takes the single match.
 *
 * Returns `null` when no published product has that slug — callers must
 * treat that as a genuine 404, not as a transient failure.
 */
export async function fetchProductBySlug(
  slug: string,
): Promise<WcProductDetail | null> {
  const results = await wcFetch<WcProductDetail[]>(
    '/products',
    { slug, status: 'publish', per_page: '1' },
    { revalidate: DETAIL_REVALIDATE, tags: ['products', `product:${slug}`] },
  )

  return results[0] ?? null
}

/** Only called for `type === 'variable'` products. */
export async function fetchVariations(
  productId: number,
): Promise<WcVariation[]> {
  return wcFetch<WcVariation[]>(
    `/products/${productId}/variations`,
    { per_page: '100' },
    {
      revalidate: DETAIL_REVALIDATE,
      tags: ['products', `product:${productId}:variations`],
    },
  )
}
