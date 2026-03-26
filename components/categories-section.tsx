'use client'

import Image from 'next/image'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProductCard from './product-card'
import {
  type CategoryDetail,
  type AccordionItem,
  type Product,
} from '@/lib/mock-data'

/* ================================================================
   TabBar — horizontal tabs with gold sliding underline
   ================================================================ */

function TabBar({
  tabs,
  activeIndex,
  onTabChange,
}: {
  tabs: readonly CategoryDetail[]
  activeIndex: number
  onTabChange: (i: number) => void
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

  useEffect(() => {
    function measure() {
      const el = tabRefs.current[activeIndex]
      if (el) {
        setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
      }
    }
    measure()
    // Recalculate after fonts load
    document.fonts.ready.then(measure)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeIndex])

  return (
    <div className="relative flex gap-6 overflow-x-auto px-6 md:gap-10 md:px-10">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={(el) => { tabRefs.current[i] = el }}
          onClick={() => onTabChange(i)}
          className="whitespace-nowrap pb-4 text-xl transition-colors duration-200 md:text-3xl lg:text-4xl"
          style={{
            fontFamily: 'var(--font-dela-gothic), sans-serif',
            color: i === activeIndex ? '#FFD700' : '#666666',
          }}
        >
          {tab.name}
        </button>
      ))}

      {/* Sliding gold underline */}
      <div
        className="pointer-events-none absolute bottom-0 h-[3px]"
        style={{
          left: underline.left,
          width: underline.width,
          backgroundColor: '#FFD700',
          transition: 'left 0.3s ease, width 0.3s ease',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

/* ================================================================
   CategoryImage — all images stacked, crossfade via data-active
   ================================================================ */

function CategoryImage({
  tabs,
  activeIndex,
}: {
  tabs: readonly CategoryDetail[]
  activeIndex: number
}) {
  return (
    <div className="relative h-[300px] w-full overflow-hidden lg:h-auto lg:w-1/2">
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          className="category-image"
          data-active={i === activeIndex}
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
  )
}

/* ================================================================
   Accordion — clean headlines with thin dividers + rotating chevron
   ================================================================ */

function Accordion({
  items,
  activeTab,
}: {
  items: readonly AccordionItem[]
  activeTab: string
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  // Reset when tab changes
  useEffect(() => {
    setOpenIndex(null)
  }, [activeTab])

  return (
    <div className="mt-8">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i} style={{ borderTop: '1px solid #333333' }}>
            <button
              className="flex w-full items-center justify-between py-5 text-left text-sm font-bold text-white transition-colors hover:text-[#FFD700] md:text-base"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              {item.headline}
              <span
                className="accordion-chevron ml-4 flex-shrink-0 text-lg text-[#FFD700]"
                data-open={isOpen}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div className="accordion-content" data-open={isOpen}>
              <div>
                <p
                  className="pb-5 text-sm leading-relaxed text-[#999999]"
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
  )
}

/* ================================================================
   CategoryProducts — filtered product carousel + VIEW ALL
   ================================================================ */

function useSlideWidth() {
  const [slideWidth, setSlideWidth] = useState('33.333%')

  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) {
        setSlideWidth('100%')
      } else if (window.innerWidth < 1024) {
        setSlideWidth('50%')
      } else {
        setSlideWidth('33.333%')
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return slideWidth
}

function CategoryProducts({
  products,
  categorySlug,
}: {
  products: readonly Product[]
  categorySlug: string
}) {
  const filtered = useMemo(
    () => products.filter((p) => p.category === categorySlug),
    [products, categorySlug],
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

  // Reinit carousel when products change
  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(0, true)
      emblaApi.reInit()
    }
  }, [emblaApi, categorySlug])

  const slideWidth = useSlideWidth()

  if (filtered.length === 0) return null

  return (
    <div className="mt-12">
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between px-6 md:px-10">
        <h3
          className="text-xl text-white md:text-2xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
        >
          FROM THIS CATEGORY
        </h3>
        <Link
          href={`/${categorySlug}`}
          className="hidden items-center justify-center px-8 py-3 text-xs font-bold tracking-wider text-white uppercase transition-opacity hover:opacity-80 sm:flex"
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
          <div className="flex" style={{ touchAction: 'pan-y' }}>
            {filtered.map((product) => (
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

        {/* Left arrow */}
        <button
          onClick={scrollPrev}
          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[#444444] bg-[#1B1B18]/80 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-30"
          aria-label="Show previous products"
          disabled={!canScrollPrev}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Right arrow */}
        <button
          onClick={scrollNext}
          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[#444444] bg-[#1B1B18]/80 text-white backdrop-blur-sm transition-colors hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-30"
          aria-label="Show next products"
          disabled={!canScrollNext}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ================================================================
   Main CategoriesSection
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
  const active = categoryDetails[activeIndex]

  return (
    <section
      className="w-full py-16"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label="Category showcase"
    >
      {/* Tab bar */}
      <TabBar
        tabs={categoryDetails}
        activeIndex={activeIndex}
        onTabChange={setActiveIndex}
      />

      {/* Split layout */}
      <div className="mt-10 flex flex-col lg:flex-row" style={{ minHeight: '500px' }}>
        {/* Left — image */}
        <CategoryImage tabs={categoryDetails} activeIndex={activeIndex} />

        {/* Right — content */}
        <div className="flex w-full flex-col justify-center px-6 py-10 md:px-10 lg:w-1/2 lg:px-16">
          {/* Label */}
          <span
            className="text-xs tracking-[0.25em] text-[#FFD700] uppercase"
            style={{ fontFamily: 'var(--font-space-mono), monospace' }}
          >
            {active.label}
          </span>

          {/* Tagline */}
          <h2
            className="mt-4 text-3xl leading-tight text-white md:text-4xl lg:text-5xl"
            style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
          >
            {active.tagline}
          </h2>

          {/* Accordions */}
          <Accordion items={active.accordionItems} activeTab={active.id} />
        </div>
      </div>

      {/* Category products carousel */}
      <CategoryProducts
        products={products}
        categorySlug={active.slug}
      />
    </section>
  )
}
