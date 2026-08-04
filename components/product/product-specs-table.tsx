import type { ProductDetail } from '@/lib/mock-data'

interface ProductSpecsTableProps {
  product: ProductDetail
}

const MONO = 'var(--font-space-mono), monospace'

interface SpecRow {
  label: string
  value: string
}

function buildRows(product: ProductDetail): SpecRow[] {
  const rows: SpecRow[] = []

  if (product.sku) rows.push({ label: 'SKU', value: product.sku })

  for (const attribute of product.attributes) {
    rows.push({ label: attribute.name, value: attribute.values.join(' · ') })
  }

  if (product.weight) rows.push({ label: 'Weight', value: `${product.weight} kg` })

  const { length, width, height } = product.dimensions
  if (length || width || height) {
    rows.push({
      label: 'Dimensions',
      value: [length, width, height].filter(Boolean).join(' × ') + ' cm',
    })
  }

  return rows
}

/**
 * Returns `null` when there is nothing to show, so the page can drop the
 * whole accordion rather than render an empty one.
 */
export default function ProductSpecsTable({ product }: ProductSpecsTableProps) {
  const rows = buildRows(product)
  if (rows.length === 0) return null

  return (
    <dl className="text-sm" style={{ fontFamily: MONO }}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col gap-1 border-b border-[#333333] py-3 last:border-b-0 sm:flex-row sm:gap-4"
        >
          {/* Fixed label column rather than a fraction: at full page width a
              1/3 split leaves a gulf between label and value. */}
          <dt className="font-bold text-white sm:w-56 sm:flex-shrink-0">
            {row.label}
          </dt>
          <dd className="min-w-0 text-[#CCCCCC]">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
