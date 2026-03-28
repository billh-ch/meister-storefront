'use client'

import Image from 'next/image'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ProductCard from './product-card'
import {
  type CategoryDetail,
  type Product,
} from '@/lib/mock-data'

/* ----------------------------------------------------------------
   useSlideWidth — responsive carousel slide sizing
   ---------------------------------------------------------------- */

function useSlideWidth() {
  const [slideWidth, setSlideWidth] = useState('33.333%')

  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) setSlideWidth('85%')
      else if (window.innerWidth < 1024) setSlideWidth('50%')
      else setSlideWidth('33.333%')
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return slideWidth
}

/* ================================================================
   CategoriesSection — single flat component, no z-index
   ================================================================ */

interface CategoriesSectionProps {
  categoryDetails: readonly CategoryDetail[]
  products: readonly Product[]
}

export default function CategoriesSection({
  categoryDetails,
  products,
}: CategoriesSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [openAccordion, setOpenAccordion] = useState<number | null>(null)
  const active = categoryDetails[activeIndex]

  // Reset accordion when tab changes
  useEffect(() => {
    setOpenAccordion(null)
  }, [activeIndex])

  // -- Carousel state --
  const filtered = useMemo(
    () => products.filter((p) => p.category === active.slug),
    [products, active.slug],
  )

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

  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(0, true)
      emblaApi.reInit()
    }
  }, [emblaApi, active.slug])

  const slideWidth = useSlideWidth()

  return (
    <section
      className="w-full py-10 md:py-16"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label="Category showcase"
    >
      {/* ── TABS ── */}
      <div className="overflow-x-auto px-4 md:px-10">
        <div
          className="flex justify-start sm:justify-center"
          style={{ borderBottom: '1px solid #444444' }}
        >
          {categoryDetails.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className="shrink-0 whitespace-nowrap px-5 py-3 text-sm sm:px-8 sm:py-4 sm:text-base md:px-10 md:py-5 md:text-xl lg:text-2xl"
              style={{
                fontFamily: 'var(--font-dela-gothic), sans-serif',
                color: i === activeIndex ? '#FFFFFF' : '#666666',
                backgroundColor: i === activeIndex ? '#2A2A25' : 'transparent',
                borderTop: i === activeIndex ? '1px solid #444444' : '1px solid transparent',
                borderLeft: i === activeIndex ? '1px solid #444444' : '1px solid transparent',
                borderRight: i === activeIndex ? '1px solid #444444' : '1px solid transparent',
                borderBottom: i === activeIndex ? '1px solid #2A2A25' : '1px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── SPLIT LAYOUT ── */}
      <div
        className="mt-6 flex flex-col md:mt-10 lg:flex-row"
        style={{ minHeight: '400px' }}
      >
        {/* Left — image with crossfade */}
        <div
          className="relative h-[250px] w-full overflow-hidden sm:h-[300px] md:h-[400px] lg:h-auto lg:w-1/2"
          style={{ border: '1px solid #FFD700' }}
        >
          {categoryDetails.map((tab, i) => (
            <div
              key={tab.id}
              className="category-image"
              data-active={i === activeIndex ? 'true' : 'false'}
            >
              <Image
                src={tab.image}
                alt={tab.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority={i === 0}
                loading={i === 0 ? undefined : 'lazy'}
              />
            </div>
          ))}
        </div>

        {/* Right — content */}
        <div
          className="flex w-full flex-col justify-center px-4 py-8 sm:px-6 md:px-10 md:py-10 lg:w-1/2 lg:px-16"
          style={{ border: '1px solid #FFD700', backgroundColor: '#1B1B18' }}
        >
          {/* Marquee */}
          <div
            className="w-full overflow-hidden border-y border-[#333333] py-2 sm:py-3"
            aria-hidden="true"
          >
            <div className="animate-marquee whitespace-nowrap">
              {[0, 1].map((half) => (
                <span key={half} className="inline-block">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <span
                      key={j}
                      className="pr-6 text-xs font-bold tracking-[0.2em] text-[#FFD700] uppercase sm:pr-8 sm:text-sm"
                      style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                    >
                      {active.marqueeText} •{' '}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          {/* Tagline */}
          <h2
            className="mt-4 text-xl leading-tight text-white sm:text-2xl md:text-3xl lg:text-4xl"
            style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
          >
            {active.tagline}
          </h2>

          {/* Accordions */}
          <div className="mt-6 md:mt-8">
            {active.accordionItems.map((item, i) => {
              const isOpen = openAccordion === i
              return (
                <div key={i} style={{ borderTop: '1px solid #333333' }}>
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(isOpen ? null : i)}
                    className="flex w-full items-center justify-between py-4 text-left text-sm font-bold md:py-5 md:text-base"
                    style={{
                      fontFamily: 'var(--font-space-mono), monospace',
                      color: isOpen ? '#FFD700' : '#FFFFFF',
                    }}
                    aria-expanded={isOpen}
                  >
                    <span className="pr-4">{item.headline}</span>
                    <span
                      className="accordion-chevron flex-shrink-0 text-lg text-[#FFD700]"
                      data-open={isOpen ? 'true' : 'false'}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                  <div
                    className="accordion-content"
                    data-open={isOpen ? 'true' : 'false'}
                  >
                    <div>
                      <p
                        className="pb-5 text-xs leading-relaxed text-[#999999] sm:text-sm"
                        style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                      >
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── CATEGORY PRODUCTS ── */}
      {filtered.length > 0 && (
        <div className="mt-8 md:mt-12">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between px-4 sm:mb-6 sm:px-6 md:px-10">
            <h3
              className="text-lg text-white sm:text-xl md:text-2xl"
              style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
            >
              FROM THIS CATEGORY
            </h3>
            <Link
              href={`/${active.slug}`}
              className="flex items-center justify-center px-4 py-2 text-xs font-bold tracking-wider text-white uppercase transition-opacity hover:opacity-80 sm:px-8 sm:py-3"
              style={{
                border: '3px solid #FFD700',
                backgroundColor: '#1B1B18',
                fontFamily: 'var(--font-space-mono), monospace',
              }}
            >
              VIEW ALL
            </Link>
          </div>

          {/* Carousel */}
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex" style={{ touchAction: 'pan-y pinch-zoom' }}>
                {filtered.map((product) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 px-1 sm:px-0"
                    style={{ width: slideWidth }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>

            {/* Arrows */}
            <button
              type="button"
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-[#444444] bg-[#1B1B18]/80 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-30 sm:left-3 sm:h-11 sm:w-11"
              aria-label="Show previous products"
              disabled={!canScrollPrev}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-[#444444] bg-[#1B1B18]/80 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-30 sm:right-3 sm:h-11 sm:w-11"
              aria-label="Show next products"
              disabled={!canScrollNext}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
