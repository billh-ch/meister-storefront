'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  hasActiveFilters,
  type FacetData,
  type FilterParams,
} from '@/lib/collection'

interface FilterPanelProps {
  /** The path this collection lives at, e.g. `/fins` or `/shop`. */
  basePath: string
  facets: FacetData
  active: FilterParams
}

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

type ListKey = 'brand' | 'category'

/**
 * Left-column filter controls for the collection pages. Every control just
 * rewrites the URL query string (same pattern as `SortSelect`); the server
 * component re-renders the filtered list. Below `lg` the whole panel collapses
 * behind a FILTERS button.
 */
export default function FilterPanel({ basePath, facets, active }: FilterPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)

  // Price inputs are uncontrolled + read via refs on commit. `priceFormKey`
  // remounts them (resetting `defaultValue`) whenever the active price range
  // changes from outside this form — CLEAR ALL, a removed chip, the back
  // button — without a setState-in-effect sync.
  const minRef = useRef<HTMLInputElement>(null)
  const maxRef = useRef<HTMLInputElement>(null)
  const priceFormKey = `${active.minPrice ?? ''}-${active.maxPrice ?? ''}`

  const pushParams = (params: URLSearchParams) => {
    // Any filter change re-pages the list, so a page 3 selection shouldn't
    // carry into a now-shorter result set.
    params.delete('page')
    const query = params.toString()
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  const toggleInList = (key: ListKey, value: string) => {
    const params = new URLSearchParams(searchParams)
    const current = (params.get(key) ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]
    if (next.length > 0) params.set(key, next.join(','))
    else params.delete(key)
    pushParams(params)
  }

  const setScalar = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    pushParams(params)
  }

  const commitPrice = () => {
    const params = new URLSearchParams(searchParams)
    const clean = (raw: string | undefined): string | null => {
      const trimmed = (raw ?? '').trim()
      if (!trimmed) return null
      const parsed = Number.parseInt(trimmed, 10)
      return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : null
    }
    const min = clean(minRef.current?.value)
    const max = clean(maxRef.current?.value)
    if (min) params.set('minPrice', min)
    else params.delete('minPrice')
    if (max) params.set('maxPrice', max)
    else params.delete('maxPrice')
    pushParams(params)
  }

  const activeCount =
    active.brands.length +
    active.categories.length +
    (active.minPrice != null || active.maxPrice != null ? 1 : 0) +
    (active.onSale ? 1 : 0)

  return (
    <div style={{ fontFamily: MONO }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mb-4 flex w-full items-center justify-between border border-[#444444] px-3 py-2 text-xs text-white uppercase lg:hidden"
      >
        <span>Filters{activeCount > 0 ? ` (${activeCount})` : ''}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      <div className={`${open ? 'block' : 'hidden'} lg:block`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            className="text-sm text-white uppercase"
            style={{ fontFamily: DISPLAY, fontWeight: 700 }}
          >
            Filters
          </h2>
          {hasActiveFilters(active) && (
            <Link
              href={basePath}
              className="text-xs text-[#999999] underline transition-colors hover:text-[#FFD700]"
            >
              Clear all
            </Link>
          )}
        </div>

        {facets.categories.length > 0 && (
          <FilterGroup title="Category">
            {facets.categories.map((category) => (
              <CheckRow
                key={category.value}
                label={`${category.label} (${category.count})`}
                checked={active.categories.includes(category.value)}
                onChange={() => toggleInList('category', category.value)}
              />
            ))}
          </FilterGroup>
        )}

        {facets.brands.length > 0 && (
          <FilterGroup title="Brand">
            {facets.brands.map((brand) => (
              <CheckRow
                key={brand.value}
                label={`${brand.value} (${brand.count})`}
                checked={active.brands.includes(brand.value)}
                onChange={() => toggleInList('brand', brand.value)}
              />
            ))}
          </FilterGroup>
        )}

        <FilterGroup title="Price (EUR)">
          <form
            key={priceFormKey}
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              commitPrice()
            }}
          >
            <input
              ref={minRef}
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={active.minPrice ?? ''}
              onBlur={commitPrice}
              placeholder={String(facets.priceBounds.min)}
              aria-label="Minimum price"
              className="w-full min-w-0 border border-[#444444] bg-transparent px-2 py-1.5 text-xs text-white"
              style={{ fontFamily: MONO }}
            />
            <span className="shrink-0 text-xs text-[#999999]">to</span>
            <input
              ref={maxRef}
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={active.maxPrice ?? ''}
              onBlur={commitPrice}
              placeholder={String(facets.priceBounds.max)}
              aria-label="Maximum price"
              className="w-full min-w-0 border border-[#444444] bg-transparent px-2 py-1.5 text-xs text-white"
              style={{ fontFamily: MONO }}
            />
            <button type="submit" className="sr-only">
              Apply price range
            </button>
          </form>
        </FilterGroup>

        <FilterGroup title="Offers">
          <CheckRow
            label="On sale only"
            checked={active.onSale}
            onChange={() => setScalar('sale', active.onSale ? null : '1')}
          />
        </FilterGroup>
      </div>
    </div>
  )
}

function FilterGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5 border-t border-[#222222] pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-xs tracking-wide text-[#999999] uppercase">{title}</h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer"
        style={{ accentColor: '#FFD700' }}
      />
      <span>{label}</span>
    </label>
  )
}
