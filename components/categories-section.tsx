'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type Category } from '@/lib/mock-data'

interface CategoriesSectionProps {
  categories: Category[]
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <article
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        width: '400px',
        height: '670px',
        border: '1px solid #000000',
      }}
    >
      {/* White inner border */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ border: '10px solid #ffffff' }}
        aria-hidden="true"
      />

      {/* Image */}
      <div className="absolute inset-0">
        <Image
          src={category.image}
          alt={category.name}
          fill
          sizes="400px"
          className="object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Bottom content — left aligned */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between p-6">
        <h3
          className="text-lg text-white md:text-xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
        >
          {category.name}
        </h3>
        <Link
          href={`/${category.slug}`}
          className="btn-gold flex-shrink-0 px-6 py-2.5 text-xs font-bold tracking-wider uppercase"
        >
          VIEW
        </Link>
      </div>
    </article>
  )
}

export default function CategoriesSection({ categories }: CategoriesSectionProps) {
  const doubled = [...categories, ...categories]

  return (
    <section
      className="w-full overflow-hidden"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label="Product categories"
    >
      {/* Marquee — pauses on hover */}
      <div className="group">
        <div className="flex w-max animate-categories-marquee group-hover:[animation-play-state:paused]">
          {doubled.map((category, i) => (
            <CategoryCard key={`${category.id}-${i}`} category={category} />
          ))}
        </div>
      </div>
    </section>
  )
}
