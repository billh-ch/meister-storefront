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
        border: '10px solid #ffffff',
      }}
    >
      {/* Image */}
      <div className="absolute inset-0">
        <Image
          src={category.image}
          alt={category.name}
          fill
          sizes="400px"
          className="object-cover"
        />
        {/* Gradient overlay for legibility */}
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
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-6">
        <h3
          className="text-2xl text-white md:text-3xl"
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
  // Double the array for seamless infinite loop
  const doubled = [...categories, ...categories]

  return (
    <section
      className="w-full overflow-hidden py-16"
      style={{ backgroundColor: '#1B1B18' }}
      aria-label="Product categories"
    >
      <h2
        className="mb-10 px-6 text-3xl text-white md:px-10 md:text-5xl"
        style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
      >
        CATEGORIES
      </h2>

      {/* Marquee container — pauses on hover */}
      <div className="group">
        <div className="flex w-max animate-categories-marquee gap-6 group-hover:[animation-play-state:paused]">
          {doubled.map((category, i) => (
            <CategoryCard key={`${category.id}-${i}`} category={category} />
          ))}
        </div>
      </div>
    </section>
  )
}
