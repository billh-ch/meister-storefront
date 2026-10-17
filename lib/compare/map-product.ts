import 'server-only'
import { mapProduct } from '@/lib/woocommerce/mappers/map-product'
import type { WcProductDetail } from '@/lib/woocommerce/queries/get-product-by-slug'
import type { CompareProduct } from './model'
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

export function mapCompareProduct(raw: WcProductDetail, locale: string = 'en'): CompareProduct {
  return {
    ...mapProduct({ ...raw, attributes: raw.attributes.filter(attribute => attribute.visible) }, locale),
    priceKnown: raw.price.trim() !== '' && Number.isFinite(Number(raw.price)) && Number(raw.price) >= 0,
    sku: raw.sku ?? '', weight: raw.weight ?? '',
    dimensions: raw.dimensions ?? { length: '', width: '', height: '' },
    attributes: raw.attributes.filter(attribute => attribute.visible && attribute.options.some(value => value.trim())).map(attribute => ({
      key: attribute.id > 0 ? `wc:${attribute.id}` : `custom:${normalize(attribute.name)}`,
      name: attribute.name.trim(), values: attribute.options.map(value => value.trim()).filter(Boolean),
    })),
  }
}
