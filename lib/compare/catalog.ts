import { wcFetch } from '@/lib/woocommerce/client'
import { mapCompareProduct, type CompareProduct, type MeasurementUnits } from './model'
import type { WcProductDetail } from '@/lib/woocommerce/queries/get-product-by-slug'
import { products as mockProducts, toMockProductDetail } from '@/lib/mock-data'

export async function fetchCompareCatalog(ids: string[]): Promise<{ products: CompareProduct[]; units: MeasurementUnits }> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') return {
    products: mockProducts.filter(product => ids.includes(product.id)).map(product => {
      const detail = toMockProductDetail(product)
      return { ...detail, attributes: detail.attributes.map(attribute => ({ ...attribute, key: `custom:${attribute.name.trim().toLowerCase()}` })) }
    }), units: { weight: 'kg', dimensions: 'cm' },
  }
  const raw = await wcFetch<WcProductDetail[]>('/products', { include: ids.join(','), status: 'publish', per_page: '4' }, { revalidate: 30, tags: ['products'] })
  const products = raw.filter(product => product.status === 'publish').map(mapCompareProduct)
  const units: MeasurementUnits = {}
  if (products.some(product => product.weight || Object.values(product.dimensions).some(Boolean))) {
    try {
      const settings = await wcFetch<{ id: string; value: string }[]>('/settings/products', {}, { revalidate: 30, tags: ['products'] })
      const weight = settings.find(setting => setting.id === 'woocommerce_weight_unit')?.value
      const dimensions = settings.find(setting => setting.id === 'woocommerce_dimension_unit')?.value
      if (weight && ['kg', 'g', 'lbs', 'oz'].includes(weight)) units.weight = weight
      if (dimensions && ['m', 'cm', 'mm', 'in', 'yd'].includes(dimensions)) units.dimensions = dimensions
    } catch { /* Omit unverified units; catalog comparison remains available. */ }
  }
  return { products, units }
}
