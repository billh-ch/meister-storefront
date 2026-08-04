'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  formatPrice,
  type ProductDetail,
  type ProductVariant,
  type StockStatus,
} from '@/lib/mock-data'
import ProductGallery from './product-gallery'
import ProductTrustStrip from './product-trust-strip'
import VariantSelector from './variant-selector'
import QuantityStepper from './quantity-stepper'

interface ProductBuyBoxProps {
  product: ProductDetail
}

const MONO = 'var(--font-space-mono), monospace'
const DISPLAY = 'var(--font-dela-gothic), sans-serif'

/* ----------------------------------------------------------------
   Variant resolution
   ---------------------------------------------------------------- */

/**
 * Finds the variant matching the current selection.
 *
 * This is deliberately forgiving. Some variations in this store come back
 * from WooCommerce with `attributes: []` because their data was never
 * re-saved in WP admin — they can never match, so they are skipped and the
 * parent product's price, stock, and image stand instead. An empty string
 * on an axis is WooCommerce's "any value" wildcard and matches anything.
 *
 * The upshot: selection always works, and the moment the WP data is cleaned
 * up these pages get more accurate with no code change.
 */
function resolveVariant(
  variants: ProductVariant[],
  axisNames: string[],
  selected: Record<string, string>,
): ProductVariant | null {
  if (variants.length === 0 || axisNames.length === 0) return null
  if (axisNames.some((name) => !selected[name])) return null

  return (
    variants.find((variant) => {
      if (Object.keys(variant.attributes).length === 0) return false
      return axisNames.every((name) => {
        const option = variant.attributes[name]
        return option === '' || option === selected[name]
      })
    }) ?? null
  )
}

/* ----------------------------------------------------------------
   Stock presentation — words first, colour second, dot third
   ---------------------------------------------------------------- */

interface StockDisplay {
  label: string
  color: string
}

const LOW_STOCK_THRESHOLD = 5

function describeStock(status: StockStatus, quantity: number | null): StockDisplay {
  if (status === 'outofstock') {
    return { label: 'OUT OF STOCK', color: '#FF6B6B' }
  }

  if (status === 'onbackorder') {
    return { label: 'AVAILABLE ON BACKORDER — SHIPS LATER', color: '#FFD700' }
  }

  if (quantity !== null && quantity > 0 && quantity <= LOW_STOCK_THRESHOLD) {
    return { label: `ONLY ${quantity} LEFT`, color: '#FFD700' }
  }

  return { label: 'IN STOCK — SHIPS IN 1–2 DAYS', color: '#4ADE80' }
}

/* ================================================================
   ProductBuyBox

   Owns selection, quantity, and confirmation state for the whole page,
   and renders the gallery and the sticky mobile bar itself. Keeping all
   three in one component means one source of truth — no context, no
   portal, no state synchronisation between siblings.
   ================================================================ */

export default function ProductBuyBox({ product }: ProductBuyBoxProps) {
  const variationAxes = useMemo(
    () => product.attributes.filter((attribute) => attribute.isVariationAxis),
    [product.attributes],
  )
  const axisNames = useMemo(
    () => variationAxes.map((attribute) => attribute.name),
    [variationAxes],
  )

  const [selected, setSelected] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [missing, setMissing] = useState<string[]>([])
  const [confirmation, setConfirmation] = useState('')
  const [ctaVisible, setCtaVisible] = useState(true)

  const ctaRef = useRef<HTMLButtonElement | null>(null)

  const activeVariant = useMemo(
    () => resolveVariant(product.variants, axisNames, selected),
    [product.variants, axisNames, selected],
  )

  const price = activeVariant?.price ?? product.price
  const regularPrice = activeVariant?.regularPrice ?? product.regularPrice
  const onSale = activeVariant?.onSale ?? product.onSale
  const stockStatus = activeVariant?.stockStatus ?? product.stockStatus
  // "From" only makes sense while the shopper hasn't narrowed to one variant.
  const showFrom = product.priceFrom && !activeVariant

  const stock = describeStock(stockStatus, activeVariant ? null : product.stockQuantity)
  const isPurchasable = stockStatus !== 'outofstock'

  const savingPercent =
    onSale && regularPrice > price
      ? Math.round(((regularPrice - price) / regularPrice) * 100)
      : 0

  /* Sticky mobile bar visibility — driven by the real CTA leaving the
     viewport, so the bar never double-renders alongside it. */
  useEffect(() => {
    const node = ctaRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => setCtaVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -80px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  /* Changing what you're buying clears the confirmation — leaving "Added to
     cart" up would be a lie. Done in the event handlers rather than an
     effect on [selected, quantity]: an effect would fire a second render
     pass after every click for a value we already know at click time. */
  const handleSelect = useCallback((attributeName: string, value: string) => {
    setSelected((current) => ({ ...current, [attributeName]: value }))
    setMissing((current) => current.filter((name) => name !== attributeName))
    setConfirmation('')
  }, [])

  const handleQuantityChange = useCallback((next: number) => {
    setQuantity(next)
    setConfirmation('')
  }, [])

  const handleAddToCart = useCallback(() => {
    const unchosen = axisNames.filter((name) => !selected[name])

    // Explicit failure: silently doing nothing is the single most confusing
    // outcome for a shopper who isn't sure what the page expects of them.
    if (unchosen.length > 0) {
      setMissing(unchosen)
      setConfirmation(`Please choose ${unchosen.join(' and ')} first`)
      return
    }

    setMissing([])
    setConfirmation(`Added to cart — ${quantity} × ${product.name}`)
  }, [axisNames, selected, quantity, product.name])

  const isError = confirmation.startsWith('Please choose')

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        {/* ── Gallery ── */}
        <div>
          <ProductGallery
            images={product.gallery}
            productName={product.name}
            activeImage={activeVariant?.image ?? null}
          />
        </div>

        {/* ── Buy box ──
            lg:self-start is required: grid items stretch by default, which
            would leave a sticky element no room to travel. top-24 clears
            the sticky navbar. */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <h1
            className="text-xl leading-tight text-white sm:text-2xl lg:text-3xl"
            style={{ fontFamily: DISPLAY, fontWeight: 800 }}
          >
            {product.name}
          </h1>

          {/* Price */}
          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              {showFrom && (
                <span
                  className="text-xs text-[#999999]"
                  style={{ fontFamily: MONO }}
                >
                  FROM
                </span>
              )}
              <span
                className="whitespace-nowrap text-2xl font-bold text-[#FFD700] sm:text-3xl"
                style={{ fontFamily: MONO }}
              >
                {formatPrice(price)}
              </span>

              {savingPercent > 0 && (
                <>
                  <span
                    className="whitespace-nowrap text-base text-[#999999] line-through"
                    style={{ fontFamily: MONO }}
                  >
                    {formatPrice(regularPrice)}
                  </span>
                  <span
                    className="px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#1B1B18] uppercase"
                    style={{ fontFamily: MONO, backgroundColor: '#FFD700' }}
                  >
                    Save {savingPercent}%
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-[#999999]" style={{ fontFamily: MONO }}>
              VAT included
            </p>
          </div>

          {/* Stock — words carry the meaning, the dot only reinforces it */}
          <p
            className="flex items-center gap-2 text-xs font-bold tracking-wide"
            style={{ fontFamily: MONO, color: stock.color }}
          >
            <span
              className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: stock.color }}
              aria-hidden="true"
            />
            {stock.label}
          </p>

          {product.shortDescriptionHtml && (
            <div
              className="product-prose"
              dangerouslySetInnerHTML={{ __html: product.shortDescriptionHtml }}
            />
          )}

          <VariantSelector
            attributes={variationAxes}
            selected={selected}
            onSelect={handleSelect}
            missing={missing}
          />

          <QuantityStepper value={quantity} onChange={handleQuantityChange} />

          <div>
            <button
              ref={ctaRef}
              type="button"
              onClick={handleAddToCart}
              disabled={!isPurchasable}
              className="btn-gold flex h-12 w-full cursor-pointer items-center justify-center text-sm tracking-[0.1em] uppercase"
            >
              {isPurchasable ? 'Add to cart' : 'Out of stock'}
            </button>

            {/* One live region for both the failure and the success message */}
            <p
              aria-live="polite"
              className="mt-2 min-h-[1.25rem] text-xs"
              style={{ fontFamily: MONO, color: isError ? '#FF6B6B' : '#4ADE80' }}
            >
              {confirmation}
            </p>
          </div>

          <ProductTrustStrip />
        </div>
      </div>

      {/* ── Sticky mobile add-to-cart bar ──
          On a phone the real CTA sits roughly 1.5 screens above the
          description, so it is off-screen for most of the page. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 px-4 py-3 transition-transform duration-200 lg:hidden"
        style={{
          backgroundColor: '#1B1B18',
          borderTop: '1px solid #444444',
          transform: ctaVisible ? 'translateY(100%)' : 'translateY(0)',
        }}
        aria-hidden={ctaVisible}
      >
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[11px] text-[#CCCCCC]"
            style={{ fontFamily: MONO }}
          >
            {product.name}
          </p>
          <p
            className="whitespace-nowrap text-sm font-bold text-[#FFD700]"
            style={{ fontFamily: MONO }}
          >
            {showFrom ? 'FROM ' : ''}
            {formatPrice(price)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!isPurchasable}
          // Hidden from the tab order while the bar is off-screen, so
          // keyboard users don't land on an invisible control.
          tabIndex={ctaVisible ? -1 : 0}
          className="btn-gold flex h-11 flex-shrink-0 cursor-pointer items-center justify-center px-5 text-xs tracking-[0.1em] uppercase"
        >
          {isPurchasable ? 'Add' : 'Sold out'}
        </button>
      </div>
    </>
  )
}
