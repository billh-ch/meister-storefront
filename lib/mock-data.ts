/**
 * Mock data layer — replace with BigCommerce Storefront GraphQL API calls
 * when the store is connected. Use Catalyst's built-in fetch utilities and
 * structure queries with fragments for reusability.
 *
 * Cache strategy when live:
 *   - Product listings: ISR 60s
 *   - Product details:  ISR 30s
 *   - Cart:             no-store
 */

export interface Product {
  id: string
  slug: string
  name: string
  price: number
  options: string
  image: string
  swatches: string[]
}

export interface Testimonial {
  id: string
  name: string
  rating: number
  quote: string
}

/** Formats a price number to a EUR string, e.g. 249 → "€249.00" */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(price)
}

export const products: Product[] = [
  {
    id: 'p1',
    slug: 'carbon-blade-fins',
    name: 'Carbon Blade Freediving Fins',
    price: 349,
    options: 'S / M / L / XL',
    image:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
    swatches: ['#969696', '#E8510C', '#FF0000'],
  },
  {
    id: 'p2',
    slug: 'roller-speargun-90cm',
    name: 'Roller Speargun 90cm',
    price: 529,
    options: '90cm / 110cm',
    image:
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80',
    swatches: ['#969696', '#1B1B18'],
  },
  {
    id: 'p3',
    slug: 'low-volume-mask',
    name: 'Low-Volume Freediving Mask',
    price: 119,
    options: 'Clear / Dark',
    image:
      'https://images.unsplash.com/photo-1512101176959-07636cac869c?w=600&q=80',
    swatches: ['#969696', '#1B1B18', '#E8510C'],
  },
  {
    id: 'p4',
    slug: 'wetsuit-3mm',
    name: 'Camouflage Wetsuit 3mm',
    price: 289,
    options: 'XS / S / M / L',
    image:
      'https://images.unsplash.com/photo-1537519883498-f7e6d8df3ef6?w=600&q=80',
    swatches: ['#969696', '#4A5568'],
  },
  {
    id: 'p5',
    slug: 'weight-belt',
    name: 'Rubber Weight Belt',
    price: 69,
    options: 'Standard / Long',
    image:
      'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=600&q=80',
    swatches: ['#1B1B18', '#969696'],
  },
  {
    id: 'p6',
    slug: 'dive-knife',
    name: 'Titanium Dive Knife',
    price: 89,
    options: 'Left / Right hand',
    image:
      'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
    swatches: ['#969696', '#E8510C'],
  },
]

export interface Category {
  id: string
  slug: string
  name: string
  image: string
}

export const categories: Category[] = [
  {
    id: 'c1',
    slug: 'fins',
    name: 'FINS',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
  },
  {
    id: 'c2',
    slug: 'spearguns',
    name: 'SPEARGUNS',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
  },
  {
    id: 'c3',
    slug: 'masks',
    name: 'MASKS',
    image: 'https://images.unsplash.com/photo-1512101176959-07636cac869c?w=800&q=80',
  },
  {
    id: 'c4',
    slug: 'wetsuits',
    name: 'WETSUITS',
    image: 'https://images.unsplash.com/photo-1537519883498-f7e6d8df3ef6?w=800&q=80',
  },
  {
    id: 'c5',
    slug: 'accessories',
    name: 'ACCESSORIES',
    image: 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=800&q=80',
  },
  {
    id: 'c6',
    slug: 'knives',
    name: 'KNIVES',
    image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80',
  },
]

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Nikos Papadopoulos',
    rating: 5,
    quote:
      'Absolutely top-tier gear. The carbon fins transformed my freediving performance. Fast shipping from Athens and impeccable quality.',
  },
  {
    id: 't2',
    name: 'Sofia Andreou',
    rating: 5,
    quote:
      'I bought the roller speargun and it exceeded every expectation. The Meister team gave me expert advice and the equipment is exceptional.',
  },
  {
    id: 't3',
    name: 'Dimitris Vasilis',
    rating: 5,
    quote:
      'Best diving store in Greece. The wetsuit fits perfectly and arrived next day. Will definitely be my go-to for all future equipment.',
  },
]
