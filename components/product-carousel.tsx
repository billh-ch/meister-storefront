'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import ProductCard from './product-card'
import { type Product } from '@/lib/mock-data'
import { useSlideWidth } from '@/lib/hooks/use-slide-width'

interface ProductCarouselProps {
  products: Product[]
  /** Section heading. Defaults to the homepage's "MOST WANTED". */
  title?: string
  /** Target of the VIEW ALL button. Pass `null` to hide the button. */
  viewAllHref?: string | null
  /** Accessible name for the section landmark. */
  ariaLabel?: string
}

export default function ProductCarousel({
  products,
  title = 'MOST WANTED',
  viewAllHref = '/shop',
  ariaLabel = 'Most wanted products',
}: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    slidesToScroll: 1,
  })

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }
    emblaApi.on('select', onSelect)
    onSelect()
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi])

  const slideWidth = useSlideWidth()

  // An empty rail is worse than no rail — the PDP passes a filtered list
  // that can legitimately come back empty for a lone product in a category.
  if (products.length === 0) return null

  return (
    <section
      className="w-full py-16"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label={ariaLabel}
    >
      {/* Section header */}
      <div className="mb-6 flex items-center justify-between px-4 sm:mb-8 sm:px-6 md:px-10">
        <h2
          className="text-2xl text-white sm:text-3xl md:text-5xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 800 }}
        >
          {title}
        </h2>

        {/* VIEW ALL button — thick yellow border, dark bg, white text */}
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center justify-center px-3 py-1.5 text-[10px] font-bold tracking-wider text-white uppercase transition-opacity hover:opacity-80 sm:px-5 sm:py-2 sm:text-xs"
            style={{
              border: '3px solid #FFD700',
              backgroundColor: '#1B1B18',
              fontFamily: 'var(--font-space-mono), monospace',
            }}
          >
            VIEW ALL
          </Link>
        )}
      </div>

      {/* Carousel with arrows inside */}
      <div className="relative">
        {/* Embla viewport */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex" style={{ touchAction: 'pan-y pinch-zoom' }}>
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0"
                style={{ width: slideWidth }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Left arrow — inside the slider */}
        <button
          onClick={scrollPrev}
          className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center border border-[#444444] bg-[#1B1B18]/80 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-30 sm:left-3 sm:h-11 sm:w-11"
          aria-label="Show previous products"
          disabled={!canScrollPrev}
        >
          <ChevronLeft />
        </button>

        {/* Right arrow — inside the slider */}
        <button
          onClick={scrollNext}
          className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center border border-[#444444] bg-[#1B1B18]/80 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-30 sm:right-3 sm:h-11 sm:w-11"
          aria-label="Show next products"
          disabled={!canScrollNext}
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  )
}

function ChevronLeft() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
