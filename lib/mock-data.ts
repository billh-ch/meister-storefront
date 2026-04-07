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
  category: string
}

export interface Testimonial {
  id: string
  name: string
  rating: number
  quote: string
}

export interface AccordionItem {
  readonly headline: string
  readonly body: string
}

export interface CategoryDetail {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly label: string
  readonly tagline: string
  readonly marqueeText: string
  readonly image: string
  readonly accordionItems: readonly AccordionItem[]
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
  // --- FINS ---
  {
    id: 'p1',
    slug: 'carbon-blade-fins',
    name: 'Carbon Blade Freediving Fins',
    price: 349,
    options: 'S / M / L / XL',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
    swatches: ['#969696', '#E8510C', '#FF0000'],
    category: 'fins',
  },
  {
    id: 'p7',
    slug: 'fiberglass-fins',
    name: 'Fiberglass Freediving Fins',
    price: 219,
    options: 'S / M / L / XL',
    image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=600&q=80',
    swatches: ['#969696', '#4A5568'],
    category: 'fins',
  },
  {
    id: 'p8',
    slug: 'training-fins',
    name: 'Pool Training Fins',
    price: 129,
    options: 'S / M / L',
    image: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?w=600&q=80',
    swatches: ['#1B1B18', '#E8510C'],
    category: 'fins',
  },
  {
    id: 'p9',
    slug: 'carbon-pro-fins',
    name: 'Carbon Pro Competition Fins',
    price: 489,
    options: 'M / L / XL',
    image: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=600&q=80',
    swatches: ['#1B1B18', '#969696', '#FF0000'],
    category: 'fins',
  },
  // --- SUITS ---
  {
    id: 'p4',
    slug: 'wetsuit-3mm',
    name: 'Camouflage Wetsuit 3mm',
    price: 289,
    options: 'XS / S / M / L',
    image: 'https://images.unsplash.com/photo-1537519883498-f7e6d8df3ef6?w=600&q=80',
    swatches: ['#969696', '#4A5568'],
    category: 'suits',
  },
  {
    id: 'p10',
    slug: 'wetsuit-5mm',
    name: 'Open Cell Wetsuit 5mm',
    price: 389,
    options: 'S / M / L / XL',
    image: 'https://images.unsplash.com/photo-1601024445121-e5b82f020549?w=600&q=80',
    swatches: ['#1B1B18', '#4A5568'],
    category: 'suits',
  },
  {
    id: 'p11',
    slug: 'rashguard',
    name: 'UV Protection Rashguard',
    price: 69,
    options: 'XS / S / M / L / XL',
    image: 'https://images.unsplash.com/photo-1564415637254-92c66292cd64?w=600&q=80',
    swatches: ['#1B1B18', '#969696', '#E8510C'],
    category: 'suits',
  },
  {
    id: 'p12',
    slug: 'hood-3mm',
    name: 'Neoprene Hood 3mm',
    price: 49,
    options: 'S / M / L',
    image: 'https://images.unsplash.com/photo-1682695796954-bad0d0f59ff1?w=600&q=80',
    swatches: ['#1B1B18'],
    category: 'suits',
  },
  // --- ACCESSORIES ---
  {
    id: 'p2',
    slug: 'roller-speargun-90cm',
    name: 'Roller Speargun 90cm',
    price: 529,
    options: '90cm / 110cm',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80',
    swatches: ['#969696', '#1B1B18'],
    category: 'accessories',
  },
  {
    id: 'p3',
    slug: 'low-volume-mask',
    name: 'Low-Volume Freediving Mask',
    price: 119,
    options: 'Clear / Dark',
    image: 'https://images.unsplash.com/photo-1512101176959-07636cac869c?w=600&q=80',
    swatches: ['#969696', '#1B1B18', '#E8510C'],
    category: 'accessories',
  },
  {
    id: 'p5',
    slug: 'weight-belt',
    name: 'Rubber Weight Belt',
    price: 69,
    options: 'Standard / Long',
    image: 'https://images.unsplash.com/photo-1530870110042-98b2cb110834?w=600&q=80',
    swatches: ['#1B1B18', '#969696'],
    category: 'accessories',
  },
  {
    id: 'p6',
    slug: 'dive-knife',
    name: 'Titanium Dive Knife',
    price: 89,
    options: 'Left / Right hand',
    image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
    swatches: ['#969696', '#E8510C'],
    category: 'accessories',
  },
  // --- MERCH ---
  {
    id: 'p13',
    slug: 'meister-tee',
    name: 'Meister Logo Tee',
    price: 39,
    options: 'S / M / L / XL',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    swatches: ['#1B1B18', '#969696'],
    category: 'merch',
  },
  {
    id: 'p14',
    slug: 'meister-hoodie',
    name: 'Meister Heavyweight Hoodie',
    price: 79,
    options: 'S / M / L / XL',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80',
    swatches: ['#1B1B18', '#4A5568'],
    category: 'merch',
  },
  {
    id: 'p15',
    slug: 'meister-cap',
    name: 'Meister Dive Cap',
    price: 29,
    options: 'One Size',
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600&q=80',
    swatches: ['#1B1B18', '#969696', '#E8510C'],
    category: 'merch',
  },
  {
    id: 'p16',
    slug: 'meister-drybag',
    name: 'Meister Dry Bag 20L',
    price: 49,
    options: '20L / 40L',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    swatches: ['#1B1B18', '#E8510C'],
    category: 'merch',
  },
]

export const categoryDetails: readonly CategoryDetail[] = [
  {
    id: 'cd1',
    slug: 'fins',
    name: 'FINS',
    label: '01 — DIVING FINS',
    tagline: 'Built for the Water. Shaped by Obsession.',
    marqueeText: 'Meister Carbon Diving Fins',
    image: '/images/diving-fins-category-image.jpg',
    accordionItems: [
      {
        headline: 'The Meister Approach',
        body: 'Every fin Meister makes begins the same way — with a question. How does the ocean actually move? How does a body respond under pressure? The answers live in the blade, the rail, the angle of the foot pocket. Not theory. Years of it.',
      },
      {
        headline: 'Carbon That Earns Its Place',
        body: "We don't add carbon fiber to say we use carbon fiber. Each layer is placed with intent — angle, thickness, sequence — to deliver a return of energy that feels less like equipment and more like instinct.",
      },
      {
        headline: 'The Foot Pocket Is Not an Afterthought',
        body: 'Most manufacturers design the blade and fit the pocket around it. We do the opposite. Where your foot meets the fin is where power is either transferred or lost. Ours loses nothing.',
      },
    ],
  },
  {
    id: 'cd2',
    slug: 'suits',
    name: 'SUITS',
    label: '02 — DIVING SUITS',
    tagline: 'Second Skin. First Choice.',
    marqueeText: 'Meister Diving Suits',
    image: '/images/diving-suits-category-image.jpg',
    accordionItems: [
      {
        headline: 'Designed to Disappear',
        body: "A suit that fits right disappears. You stop thinking about warmth, about drag, about the seam across your shoulder. You start thinking about depth. That's what Meister suits are made for — to get out of your way.",
      },
      {
        headline: 'Precision Cuts. No Compromise on Movement.',
        body: "The ocean demands full range — every stroke, every turn, every ascent. Our suits are patterned around movement first, then sealed for protection. The result is a suit that moves before you ask it to.",
      },
      {
        headline: 'Warmth You Can Trust at Depth',
        body: "Cold water doesn't negotiate. Our neoprene is selected for thermal consistency, not just thickness — because how a suit performs at 5 meters means nothing if it fails at 25.",
      },
    ],
  },
  {
    id: 'cd3',
    slug: 'accessories',
    name: 'ACCESSORIES',
    label: '03 — ACCESSORIES',
    tagline: 'The Details That Make a Difference.',
    marqueeText: 'Accessories',
    image: '/images/accessories-category-image.HEIC',
    accordionItems: [
      {
        headline: 'The Things That Decide a Dive',
        body: "A mask strap that doesn't slip. A bag that drains completely. A glove that doesn't cost you feel. These aren't small things — they're the things that quietly decide how a dive goes. Meister accessories exist because we've had enough bad ones.",
      },
      {
        headline: 'Designed Around Real Dives',
        body: "Not photoshoots. Not spec sheets. The accessories we make came out of conversations with people who dive seriously — in cold water, on long boats, before early mornings. Everything here has a reason.",
      },
    ],
  },
  {
    id: 'cd4',
    slug: 'merch',
    name: 'MERCH',
    label: '04 — MERCH',
    tagline: 'Wear It Like You Mean It.',
    marqueeText: 'Meister Merch',
    image: '/images/meister-merch-category-image.png',
    accordionItems: [
      {
        headline: 'For the Salt-Stained',
        body: "This isn't branded sportswear. It's for the people who come home salt-stained and already thinking about the next one. Cut clean, made to last, and quiet enough that only the right people recognize it.",
      },
      {
        headline: "Craft Doesn't Clock Out",
        body: 'The same care that goes into our fins goes into the fabric we put our name on. Because if it carries the Meister mark, it has to be worth wearing.',
      },
    ],
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
