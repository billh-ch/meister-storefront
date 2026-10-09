'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState, type ReactNode } from 'react'
import type { Product } from '@/lib/mock-data'

export default function ProductCardImages({ product, children }: { product: Product; children?: ReactNode }) {
  const images = product.gallery?.length ? product.gallery : product.image ? [{ src: product.image, alt: product.name }] : []
  const multiple = images.length > 1
  const track = useRef<HTMLDivElement>(null)
  const gesture = useRef({ x: 0, y: 0, dragged: false })
  const [selected, setSelected] = useState(0)
  const goTo = (index: number) => {
    const element = track.current
    if (!element) return
    const target = Math.max(0, Math.min(images.length - 1, index))
    element.scrollTo({ left: target * element.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  const dotStart = Math.max(0, Math.min(selected - 2, images.length - 5))

  return (
    <div className="relative aspect-square w-full overflow-hidden"
      data-product-image-gallery={multiple ? 'multiple' : 'single'} data-image-index={selected}
      role={multiple ? 'group' : undefined} aria-label={multiple ? `${product.name} photos` : undefined} tabIndex={multiple ? 0 : undefined}
      onKeyDown={event => {
        if (!multiple || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        event.stopPropagation()
        goTo(event.key === 'Home' ? 0 : event.key === 'End' ? images.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1))
      }}
      onPointerDown={event => { gesture.current = { x: event.clientX, y: event.clientY, dragged: false } }}
      onPointerMove={event => {
        if (Math.abs(event.clientX - gesture.current.x) > 8 || Math.abs(event.clientY - gesture.current.y) > 8) gesture.current.dragged = true
      }}
      onPointerCancel={() => { gesture.current.dragged = true }}
      onClickCapture={event => {
        if (multiple && event.detail > 0 && gesture.current.dragged) { event.preventDefault(); event.stopPropagation() }
      }}>
      {images.length ? (
        <div ref={track} data-photo-track className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={event => {
            const element = event.currentTarget
            if (element.clientWidth) setSelected(Math.round(element.scrollLeft / element.clientWidth))
          }}>
          {images.map((image, index) => (
            <Link key={`${image.src}-${index}`} href={`/products/${product.slug}`} draggable={false}
              className="relative h-full w-full shrink-0 snap-start" tabIndex={index === selected ? 0 : -1}
              aria-label={`View ${product.name}${multiple ? ` — photo ${index + 1}` : ''}`}>
              <Image src={image.src} alt={image.alt || product.name} fill draggable={false}
                sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 30vw" className="object-cover" loading="lazy" />
            </Link>
          ))}
        </div>
      ) : (
        <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`} className="hatching-bg absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="text-xs tracking-widest text-[#999999]">NO IMAGE AVAILABLE</span>
          <span className="text-[10px] text-[#666666]">{product.name}</span>
        </Link>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,rgba(27,27,24,0.6)_100%)]" aria-hidden="true" />
      {children}
      {multiple && <>
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-2" aria-hidden="true">
          {images.slice(dotStart, dotStart + 5).map((image, index) => <span key={`${image.src}-${index}`} data-image-dot className={`h-1.5 w-1.5 rounded-full ${dotStart + index === selected ? 'bg-[#FFD700]' : 'bg-white/70'}`} />)}
        </div>
        <button type="button" aria-label="Previous photo" disabled={selected === 0} onClick={() => goTo(selected - 1)} className="absolute top-1/2 left-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/40 bg-black/60 text-xl text-white disabled:opacity-30 md:flex">‹</button>
        <button type="button" aria-label="Next photo" disabled={selected === images.length - 1} onClick={() => goTo(selected + 1)} className="absolute top-1/2 right-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/40 bg-black/60 text-xl text-white disabled:opacity-30 md:flex">›</button>
        <p className="sr-only" aria-live="polite">Photo {selected + 1} of {images.length}</p>
      </>}
    </div>
  )
}
