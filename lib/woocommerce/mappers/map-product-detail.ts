import type {
  ProductAttribute,
  ProductDetail,
  ProductVariant,
} from '@/lib/mock-data'
import { sanitizeProductHtml } from '@/lib/sanitize'
import type {
  WcProductDetail,
  WcVariation,
} from '../queries/get-product-by-slug'
import { mapCategorySlug } from './category-map'
import { hasPriceRange } from './has-price-range'
import { resolveImageUrl } from './resolve-image-url'
import { toStockStatus } from './stock-status'

/**
 * Kept separate from `map-product.ts` on purpose: the listing mapper runs
 * ~50x per homepage render and must stay cheap, while this one runs HTML
 * sanitisation and must never end up on that path.
 */

function toNumber(raw: string): number {
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapVariant(variation: WcVariation): ProductVariant {
  const price = toNumber(variation.price)

  return {
    id: String(variation.id),
    price,
    // Same empty-string fallback as the parent: WooCommerce leaves
    // regular_price blank on plenty of variations.
    regularPrice: variation.regular_price
      ? toNumber(variation.regular_price)
      : price,
    onSale: variation.on_sale,
    stockStatus: toStockStatus(variation.stock_status),
    image: variation.image?.src ? resolveImageUrl(variation.image.src) : null,
    // Normalised to { attributeName: chosenOption } so the selector can match
    // a combination directly. WooCommerce returns `attributes: []` on some
    // variations whose data was never re-saved in WP admin — those simply
    // never match, and the buy box falls back to the parent's values.
    attributes: Object.fromEntries(
      variation.attributes.map((attribute) => [attribute.name, attribute.option]),
    ),
  }
}

function mapAttributes(wc: WcProductDetail): ProductAttribute[] {
  return wc.attributes
    .filter((attribute) => attribute.options.length > 0)
    .map((attribute) => ({
      name: attribute.name,
      values: attribute.options,
      isVariationAxis: attribute.variation,
    }))
}

/**
 * On variable parents WooCommerce leaves `regular_price` and `sale_price`
 * empty while `price` holds the lowest variant price — so a discounted
 * variable product would show no strike-through and no saving at all
 * (every on-sale product in this catalogue is variable).
 *
 * Recovering it from the variants: the parent's `price` is the lowest
 * variant price, so the variant quoting that same price is the one the
 * headline refers to, and its `regular_price` is the "before" figure.
 * Falls back to `price` when nothing lines up, which renders as "not on
 * sale" rather than as "0,00 €".
 */
function deriveRegularPrice(
  price: number,
  wc: WcProductDetail,
  variations: WcVariation[],
): number {
  if (wc.regular_price) return toNumber(wc.regular_price)
  if (!wc.on_sale || variations.length === 0) return price

  const headline =
    variations.find(
      (variation) => variation.on_sale && toNumber(variation.price) === price,
    ) ?? variations.find((variation) => variation.on_sale)

  const regular = headline?.regular_price ? toNumber(headline.regular_price) : 0
  return regular > price ? regular : price
}

/**
 * "From €X" belongs on a product whose variants genuinely cost different
 * amounts, not on every variable product — most of this catalogue is variable
 * while quoting one price across every size, and prefixing those would promise
 * a cheaper option that doesn't exist.
 *
 * The variants are already loaded here, so their prices answer it exactly.
 * `price_html` is the fallback for a variable product whose variations failed
 * to load, and matches what the listing mapper does with the same field.
 */
function derivePriceFrom(
  wc: WcProductDetail,
  variations: WcVariation[],
): boolean {
  if (variations.length > 0) {
    const prices = variations.map((variation) => toNumber(variation.price))
    return Math.min(...prices) !== Math.max(...prices)
  }

  return hasPriceRange(wc.price_html)
}

export function mapProductDetail(
  wc: WcProductDetail,
  variations: WcVariation[] = [],
): ProductDetail {
  const price = toNumber(wc.price)
  const regularPrice = deriveRegularPrice(price, wc, variations)
  const salePrice = wc.sale_price ? toNumber(wc.sale_price) : null

  const gallery = wc.images.map((image) => ({
    src: resolveImageUrl(image.src),
    alt: image.alt?.trim() || wc.name,
  }))

  return {
    id: String(wc.id),
    slug: wc.slug,
    name: wc.name,
    price,
    options: '',
    image: gallery[0]?.src ?? '',
    swatches: [],
    category: mapCategorySlug(wc.categories.map((category) => category.id)),
    type: wc.type === 'variable' ? 'variable' : 'simple',

    gallery,
    descriptionHtml: sanitizeProductHtml(wc.description),
    shortDescriptionHtml: sanitizeProductHtml(wc.short_description),
    sku: wc.sku,
    stockStatus: toStockStatus(wc.stock_status),
    stockQuantity: wc.stock_quantity,
    regularPrice,
    salePrice,
    // Trust WooCommerce's computed flag rather than comparing prices —
    // scheduled sales make a price comparison wrong at the edges.
    onSale: wc.on_sale,
    priceFrom: derivePriceFrom(wc, variations),
    attributes: mapAttributes(wc),
    variants: variations.map(mapVariant),
    weight: wc.weight ?? '',
    dimensions: wc.dimensions ?? { length: '', width: '', height: '' },
  }
}
