import { type Product, formatPrice } from '@/lib/mock-data'
import { mapProduct } from '@/lib/woocommerce/mappers/map-product'
import type { WcProductDetail } from '@/lib/woocommerce/queries/get-product-by-slug'

export interface CompareAttribute { key: string; name: string; values: string[] }
export interface CompareProduct extends Product {
  priceKnown?: boolean
  sku: string
  attributes: CompareAttribute[]
  weight: string
  dimensions: { length: string; width: string; height: string }
}
export interface MeasurementUnits { weight?: string; dimensions?: string }
export interface ComparisonRow { key: string; label: string; values: string[]; different: boolean }
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
const valuesKey = (values: string[]) => JSON.stringify([...new Set(values.map(normalize).filter(Boolean))].sort())
const positive = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0

export function mapCompareProduct(raw: WcProductDetail): CompareProduct {
  return {
    ...mapProduct({ ...raw, attributes: raw.attributes.filter(attribute => attribute.visible) }), priceKnown: raw.price.trim() !== '' && Number.isFinite(Number(raw.price)) && Number(raw.price) >= 0, sku: raw.sku ?? '', weight: raw.weight ?? '',
    dimensions: raw.dimensions ?? { length: '', width: '', height: '' },
    attributes: raw.attributes.filter(attribute => attribute.visible && attribute.options.some(value => value.trim())).map(attribute => ({
      key: attribute.id > 0 ? `wc:${attribute.id}` : `custom:${normalize(attribute.name)}`,
      name: attribute.name.trim(), values: attribute.options.map(value => value.trim()).filter(Boolean),
    })),
  }
}

export function buildComparisonRows(products: CompareProduct[], units: MeasurementUnits): ComparisonRow[] {
  const rows: ComparisonRow[] = []
  const add = (key: string, label: string, values: string[], normalized = values.map(normalize)) => {
    if (!values.some(Boolean)) return
    rows.push({ key, label, values: values.map(value => value || 'Not specified'), different: products.length > 1 && new Set(normalized).size > 1 })
  }
  add('price', 'Price', products.map(product => product.priceKnown !== false && product.price >= 0 ? `${product.priceFrom ? 'From ' : ''}${formatPrice(product.price)}` : ''))
  add('brand', 'Brand', products.map(product => product.brand ?? ''))
  add('availability', 'Availability', products.map(product => ({ instock: 'In stock', onbackorder: 'Available to order', outofstock: 'Out of stock' })[product.stockStatus]))
  add('sku', 'SKU', products.map(product => product.sku))
  const attributes = new Map<string, string>()
  for (const product of products) for (const attribute of product.attributes) {
    if (attribute.values.some(value => value.trim()) && !attributes.has(attribute.key)) attributes.set(attribute.key, attribute.name)
  }
  for (const [key, label] of attributes) {
    const options = products.map(product => product.attributes.filter(attribute => attribute.key === key).flatMap(attribute => attribute.values).filter(value => value.trim()))
    add(key, label, options.map(values => [...new Set(values)].join(' · ')), options.map(valuesKey))
  }
  if (units.weight) add('weight', `Weight (${units.weight})`, products.map(product => positive(product.weight) ? product.weight : ''))
  if (units.dimensions) add('dimensions', `Shipping dimensions (${units.dimensions})`, products.map(product => [
    ['L', product.dimensions.length], ['W', product.dimensions.width], ['H', product.dimensions.height],
  ].filter(([, value]) => positive(value)).map(([axis, value]) => `${axis} ${value}`).join(' × ')))
  return rows
}
