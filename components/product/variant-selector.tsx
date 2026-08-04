'use client'

import { useId } from 'react'
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
 * Above this many options, chips stop being scannable and become a wall.
 * In this catalogue only Πέλμα (foot pocket, 29 options across 8 products)
 * crosses it; the next largest axis is Belt Color at 11, where seeing every
 * colour at once is genuinely useful.
 */
const DROPDOWN_THRESHOLD = 12

/**
 * One labelled row per variation axis — chips for a handful of options, a
 * dropdown once there are too many to scan.
 *
 * The dropdown is a real `<select>`. It's styled to match the design, but
 * the element stays native so a phone opens its own full-screen picker and
 * keyboard users get type-to-jump and arrow keys for free. A custom
 * dropdown would look marginally better and be measurably harder to use,
 * which is the wrong trade for this page's audience.
 *
 * Option labels come straight from WooCommerce, so they render in Greek
 * (Μέγεθος: S / M / L) — correct for a Greek catalogue even though the
 * surrounding UI is in English.
 */
export default function VariantSelector({
  attributes,
  selected,
  onSelect,
  missing,
}: VariantSelectorProps) {
  const baseId = useId()

  if (attributes.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      {attributes.map((attribute, index) => {
        const isMissing = missing.includes(attribute.name)
        const chosen = selected[attribute.name]
        const fieldId = `${baseId}-${index}`
        const label = (
          <AxisLabel attribute={attribute} chosen={chosen} isMissing={isMissing} />
        )

        if (attribute.values.length > DROPDOWN_THRESHOLD) {
          return (
            <div key={attribute.name}>
              <label htmlFor={fieldId} className="mb-2 block">
                {label}
              </label>

              <div className="relative">
                <select
                  id={fieldId}
                  value={chosen ?? ''}
                  onChange={(event) => onSelect(attribute.name, event.target.value)}
                  className="h-14 w-full cursor-pointer appearance-none pr-12 pl-4 text-base"
                  style={{
                    fontFamily: MONO,
                    backgroundColor: '#1B1B18',
                    color: chosen ? '#FFFFFF' : '#999999',
                    border: chosen
                      ? '2px solid #FFD700'
                      : `1px solid ${isMissing ? '#FF6B6B' : '#555555'}`,
                  }}
                >
                  <option value="" disabled>
                    Choose {attribute.name}…
                  </option>
                  {attribute.values.map((value) => (
                    <option
                      key={value}
                      value={value}
                      // Set explicitly: several browsers render the open
                      // list with system colours, not the select's own.
                      style={{ backgroundColor: '#1B1B18', color: '#FFFFFF' }}
                    >
                      {value}
                    </option>
                  ))}
                </select>

                {/* appearance-none drops the OS arrow but keeps the native
                    picker, so the affordance is redrawn here. */}
                <span
                  className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#FFD700]"
                  aria-hidden="true"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>
          )
        }

        return (
          <fieldset key={attribute.name} className="border-0 p-0">
            <legend className="mb-2">{label}</legend>

            <div className="flex flex-wrap gap-2">
              {attribute.values.map((value) => {
                const isSelected = chosen === value

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
                    {/* Selection is marked by a checkmark as well as the gold
                        fill: colour alone fails for colour-blind shoppers. */}
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

interface AxisLabelProps {
  attribute: ProductAttribute
  chosen: string | undefined
  isMissing: boolean
}

function AxisLabel({ attribute, chosen, isMissing }: AxisLabelProps) {
  return (
    <span
      className="flex flex-wrap items-baseline gap-2 text-sm font-bold tracking-wide text-white uppercase"
      style={{ fontFamily: MONO }}
    >
      <span>{attribute.name}</span>
      {chosen ? (
        <span className="font-normal normal-case text-[#CCCCCC]">{chosen}</span>
      ) : (
        <span
          className="font-normal normal-case"
          style={{ color: isMissing ? '#FF6B6B' : '#999999' }}
        >
          {isMissing ? 'Please choose one' : 'Choose one'}
        </span>
      )}
    </span>
  )
}
