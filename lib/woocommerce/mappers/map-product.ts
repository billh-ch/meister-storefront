import type { Product } from '@/lib/mock-data'
import type { WcProduct } from '../queries/get-products'
import { mapCategorySlug } from './category-map'
import { hasPriceRange } from './has-price-range'
import { resolveImageUrl } from './resolve-image-url'
import { toStockStatus } from './stock-status'

export function mapProduct(product: WcProduct): Product {
  return {
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    price: Number.parseFloat(product.price) || 0,
    // Phase 1 (homepage): variations aren't fetched, so size/color options
    // and swatches stay empty. ProductCard renders both defensively.
    options: '',
    // Empty for the products with no photo in WooCommerce — ProductCard
    // renders its placeholder rather than handing an empty src to next/image.
    image: resolveImageUrl(product.images[0]?.src ?? ''),
    swatches: [],
    category: mapCategorySlug(product.categories.map(c => c.id)),
    stockStatus: toStockStatus(product.stock_status),
    // WooCommerce's computed flag, not a price comparison — scheduled sales
    // make a comparison wrong at the edges.
    onSale: product.on_sale,
    priceFrom: hasPriceRange(product.price_html),
    // Only 'variable' unlocks real per-attribute selection on the PDP;
    // WooCommerce's other types (grouped/external) aren't modeled anywhere
    // else in this codebase, so they fall back to 'simple' — same as today.
    type: product.type === 'variable' ? 'variable' : 'simple',
  }
}
