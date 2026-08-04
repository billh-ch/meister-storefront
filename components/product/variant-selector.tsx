'use client'

import type { ProductAttribute } from '@/lib/mock-data'

interface VariantSelectorProps {
  attributes: ProductAttribute[]
  /** Current selection, keyed by attribute name. */
  selected: Record<string, string>
  onSelect: (attributeName: string, value: string) => void
  /** Attribute names the shopper hasn't chosen yet, highlighted after a failed ADD. */
  missing: string[]
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * One labelled row of chips per variation axis.
 *
 * Chip labels come straight from WooCommerce, so they render in Greek
 * (Μέγεθος: S / M / L) — correct for a Greek catalogue even though the
 * surrounding UI is in English.
 *
 * Selection is marked with a gold fill *and* a checkmark: colour alone
 * fails for colour-blind shoppers and reads as decoration to many others.
 */
export default function VariantSelector({
  attributes,
  selected,
  onSelect,
  missing,
}: VariantSelectorProps) {
  if (attributes.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      {attributes.map((attribute) => {
        const isMissing = missing.includes(attribute.name)

        return (
          <fieldset key={attribute.name} className="border-0 p-0">
            <legend
              className="mb-2 flex flex-wrap items-baseline gap-2 text-sm font-bold tracking-wide text-white uppercase"
              style={{ fontFamily: MONO }}
            >
              <span>{attribute.name}</span>
              {selected[attribute.name] ? (
                <span className="font-normal normal-case text-[#CCCCCC]">
                  {selected[attribute.name]}
                </span>
              ) : (
                <span
                  className="font-normal normal-case"
                  style={{ color: isMissing ? '#FF6B6B' : '#999999' }}
                >
                  {isMissing ? 'Please choose one' : 'Choose one'}
                </span>
              )}
            </legend>

            <div className="flex flex-wrap gap-2">
              {attribute.values.map((value) => {
                const isSelected = selected[attribute.name] === value

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSelect(attribute.name, value)}
                    aria-pressed={isSelected}
                    className="flex min-h-[48px] cursor-pointer items-center gap-2 px-4 py-2 text-base transition-colors"
                    style={{
                      fontFamily: MONO,
                      border: isSelected
                        ? '2px solid #FFD700'
                        : `1px solid ${isMissing ? '#FF6B6B' : '#555555'}`,
                      backgroundColor: isSelected ? '#FFD700' : 'transparent',
                      color: isSelected ? '#1B1B18' : '#FFFFFF',
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    {isSelected && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {value}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
