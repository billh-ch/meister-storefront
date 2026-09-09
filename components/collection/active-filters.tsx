'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { FilterParams } from '@/lib/collection'

interface ActiveFiltersProps {
  basePath: string
  active: FilterParams
  /** slug -> display label, so a category chip reads "FINS" not "fins". */
  categoryLabels?: Record<string, string>
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * A row of removable chips summarising every active filter. Each chip rewrites
 * the URL to drop just its own value; the whole row disappears when nothing is
 * filtered.
 */
export default function ActiveFilters({
  basePath,
  active,
  categoryLabels,
}: ActiveFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const pushParams = (params: URLSearchParams) => {
    params.delete('page')
    const query = params.toString()
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  const removeFromList = (key: 'brand' | 'category', value: string) => {
    const params = new URLSearchParams(searchParams)
    const next = (params.get(key) ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((item) => item !== value)
    if (next.length > 0) params.set(key, next.join(','))
    else params.delete(key)
    pushParams(params)
  }

  const removeKeys = (...keys: string[]) => {
    const params = new URLSearchParams(searchParams)
    for (const key of keys) params.delete(key)
    pushParams(params)
  }

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  for (const brand of active.brands) {
    chips.push({
      key: `brand:${brand}`,
      label: brand,
      onRemove: () => removeFromList('brand', brand),
    })
  }

  for (const slug of active.categories) {
    chips.push({
      key: `category:${slug}`,
      label: categoryLabels?.[slug] ?? slug,
      onRemove: () => removeFromList('category', slug),
    })
  }

  if (active.minPrice != null || active.maxPrice != null) {
    const label =
      active.minPrice != null && active.maxPrice != null
        ? `EUR ${active.minPrice} to ${active.maxPrice}`
        : active.minPrice != null
          ? `from EUR ${active.minPrice}`
          : `up to EUR ${active.maxPrice}`
    chips.push({
      key: 'price',
      label,
      onRemove: () => removeKeys('minPrice', 'maxPrice'),
    })
  }

  if (active.onSale) {
    chips.push({ key: 'sale', label: 'On sale', onRemove: () => removeKeys('sale') })
  }

  if (chips.length === 0) return null

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2"
      style={{ fontFamily: MONO }}
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="flex items-center gap-1.5 border border-[#444444] px-2 py-1 text-xs text-white transition-colors hover:border-[#FFD700] hover:text-[#FFD700]"
        >
          <span>{chip.label}</span>
          <span aria-hidden="true">×</span>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
    </div>
  )
}
