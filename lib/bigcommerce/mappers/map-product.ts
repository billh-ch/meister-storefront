import type { Product } from '@/lib/mock-data'
import type { BcProduct } from '../queries/get-products'

function extractSwatches(product: BcProduct): string[] {
  // Primary: collect hex colors from variant color options
  const variantHexColors = product.variants.edges
    .flatMap(e => e.node.options.edges)
    .filter(e => e.node.displayName.toLowerCase().includes('color'))
    .flatMap(e => e.node.values.edges)
    .flatMap(e => e.node.hexColors ?? [])
    .filter(Boolean)

  const unique = [...new Set(variantHexColors)]
  if (unique.length > 0) return unique

  // Fallback: custom field "swatchHexColors" — comma-separated hex codes
  // e.g. "#969696,#E8510C,#FF0000"
  const swatchField = product.customFields.edges.find(
    e => e.node.name === 'swatchHexColors',
  )
  if (swatchField) {
    return swatchField.node.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }

  return []
}

function extractOptions(product: BcProduct): string {
  // Prefer the "Size" option; fall back to the first available option
  const sizeOption =
    product.productOptions.edges.find(
      e => e.node.displayName.toLowerCase() === 'size',
    ) ?? product.productOptions.edges[0]

  if (!sizeOption?.node.values) return ''

  return sizeOption.node.values.edges.map(e => e.node.label).join(' / ')
}

function extractSlug(path: string): string {
  const trimmed = path.replace(/^\/|\/$/g, '')
  return trimmed.split('/').pop() ?? trimmed
}

function extractCategory(product: BcProduct): string {
  const firstCategory = product.categories.edges[0]?.node
  if (!firstCategory) return ''
  const trimmed = firstCategory.path.replace(/^\/|\/$/g, '')
  return trimmed.split('/').pop() ?? trimmed
}

export function mapProduct(bcProduct: BcProduct): Product {
  return {
    id: String(bcProduct.entityId),
    slug: extractSlug(bcProduct.path),
    name: bcProduct.name,
    price: bcProduct.prices?.price.value ?? 0,
    options: extractOptions(bcProduct),
    image: bcProduct.defaultImage?.url ?? '',
    swatches: extractSwatches(bcProduct),
    category: extractCategory(bcProduct),
  }
}
