'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SORT_CHOICES, type SortOption } from '@/lib/collection'

interface SortSelectProps {
  /** The path this collection lives at, e.g. `/accessories` or `/shop`. */
  basePath: string
  currentSort: SortOption
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * A native `<select>` rather than a custom dropdown: this needs to work with
 * no design risk for a control that exists purely to set one query param,
 * and it comes with keyboard/screen-reader behaviour for free.
 */
export default function SortSelect({ basePath, currentSort }: SortSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams)
    params.set('sort', event.target.value)
    // Changing sort re-pages the list, so a page 3 selection from the old
    // order shouldn't silently show page 3 of the new one.
    params.delete('page')
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <label
      className="flex items-center gap-2 text-xs text-[#999999] sm:text-sm"
      style={{ fontFamily: MONO }}
    >
      SORT
      <select
        value={currentSort}
        onChange={handleChange}
        className="cursor-pointer bg-transparent px-2 py-1.5 text-white uppercase"
        style={{ border: '1px solid #444444', fontFamily: MONO }}
      >
        {SORT_CHOICES.map((choice) => (
          <option key={choice.value} value={choice.value} style={{ backgroundColor: '#1B1B18' }}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  )
}
