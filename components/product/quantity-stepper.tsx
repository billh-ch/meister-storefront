'use client'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

const MONO = 'var(--font-space-mono), monospace'

/**
 * Three 56px cells. The native number-input spinners are suppressed rather
 * than styled: they render at roughly 12px, which is unusable for the
 * audience this page is built for, and the -/+ buttons replace them.
 */
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next))

  return (
    <div>
      <label
        htmlFor="product-quantity"
        className="mb-2 block text-xs font-bold tracking-wide text-white uppercase"
        style={{ fontFamily: MONO }}
      >
        Quantity
      </label>

      <div className="flex w-fit items-stretch" style={{ border: '1px solid #555555' }}>
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label="Decrease quantity"
          className="flex h-12 w-12 cursor-pointer items-center justify-center text-xl text-white transition-colors hover:bg-[#2A2A25] disabled:cursor-not-allowed disabled:text-[#555555] disabled:hover:bg-transparent"
        >
          −
        </button>

        <input
          id="product-quantity"
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10)
            onChange(Number.isNaN(parsed) ? min : clamp(parsed))
          }}
          className="h-12 w-14 border-x border-[#555555] bg-transparent text-center text-base font-bold text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ fontFamily: MONO }}
        />

        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label="Increase quantity"
          className="flex h-14 w-14 cursor-pointer items-center justify-center text-2xl text-white transition-colors hover:bg-[#2A2A25] disabled:cursor-not-allowed disabled:text-[#555555] disabled:hover:bg-transparent"
        >
          +
        </button>
      </div>
    </div>
  )
}
