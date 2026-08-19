/**
 * Mock/fallback data layer. Product shapes here (`Product`) are the contract
 * `lib/woocommerce` maps real WooCommerce REST data into — this file's
 * `products` array is also the fallback used when NEXT_PUBLIC_USE_MOCK_DATA
 * is set or the WooCommerce API is unreachable.
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
  /** Empty when the product has no photo in WooCommerce — 9 currently don't. */
  image: string
  swatches: string[]
  category: string
  stockStatus: StockStatus
  onSale: boolean
  /** True only when variants genuinely differ in price, so `price` is a floor. */
  priceFrom: boolean
}

/* ----------------------------------------------------------------
   Product detail types

   `ProductDetail extends Product` rather than widening `Product` with
   optional fields: the listing components (ProductCard, ProductCarousel,
   CategoriesSection) stay untouched and a ProductDetail remains assignable
   anywhere a Product is expected, while the PDP gets non-optional fields
   with no defensive `?.` chains.
   ---------------------------------------------------------------- */

export type StockStatus = 'instock' | 'outofstock' | 'onbackorder'

export interface ProductImage {
  src: string
  alt: string
}

export interface ProductAttribute {
  name: string
  values: string[]
  /** True when WooCommerce marks this attribute as "used for variations". */
  isVariationAxis: boolean
}

export interface ProductVariant {
  id: string
  price: number
  regularPrice: number
  onSale: boolean
  stockStatus: StockStatus
  image: string | null
  /** e.g. `{ "Μέγεθος": "L" }`. Empty when the WP variation data is incomplete. */
  attributes: Record<string, string>
}

export interface ProductDetail extends Product {
  gallery: ProductImage[]
  descriptionHtml: string
  shortDescriptionHtml: string
  sku: string
  stockQuantity: number | null
  regularPrice: number
  salePrice: number | null
  attributes: ProductAttribute[]
  variants: ProductVariant[]
  weight: string
  dimensions: { length: string; width: string; height: string }
}

/* ----------------------------------------------------------------
   Mock gallery

   A real WooCommerce product carries several photos, but a mock `Product`
   carries exactly one — and ProductGallery only draws its tile grid at two
   or more images. A one-image mock gallery therefore hides the entire
   tile-selection UI from anyone browsing on the fallback data, which is
   every visitor to the deployed site while the store is local-only.

   So the mock re-frames its single Unsplash shot into several crops. They
   are the same photograph, not different angles — this exists to exercise
   the gallery layout, not to look like real product photography.
   ---------------------------------------------------------------- */

/** imgix params Unsplash honours; each yields a visibly different framing. */
const MOCK_GALLERY_FRAMINGS: readonly { params: string; label: string }[] = [
  { params: 'fit=crop&crop=entropy', label: 'main view' },
  { params: 'fit=crop&crop=left', label: 'left detail' },
  { params: 'fit=crop&crop=right', label: 'right detail' },
  { params: 'fit=crop&crop=top', label: 'top detail' },
  { params: 'flip=h', label: 'reverse view' },
]

const MOCK_GALLERY_SIZE = 'w=800&h=800&q=80'

/**
 * Non-Unsplash images (the local `/images/...` category art) come back as a
 * single-entry gallery: the query params would be inert on them, so five
 * identical tiles would be worse than one honest image.
 */
function buildMockGallery(image: string, productName: string): ProductImage[] {
  if (!image) return []

  if (!image.includes('images.unsplash.com')) {
    return [{ src: image, alt: productName }]
  }

  const [baseUrl] = image.split('?')

  return MOCK_GALLERY_FRAMINGS.map(({ params, label }) => ({
    src: `${baseUrl}?${MOCK_GALLERY_SIZE}&${params}`,
    alt: `${productName} — ${label}`,
  }))
}

/**
 * Widens a mock `Product` into a `ProductDetail` so every mock slug still
 * has a working PDP when WooCommerce is unreachable. `options` on the mock
 * products is a "S / M / L"-style string, which becomes a single display-only
 * attribute — mock data has no variants to resolve against.
 */
export function toMockProductDetail(product: Product): ProductDetail {
  const sizeValues = product.options
    .split('/')
    .map((value) => value.trim())
    .filter(Boolean)

  return {
    ...product,
    gallery: buildMockGallery(product.image, product.name),
    descriptionHtml: `<p>${product.name} — premium diving equipment, hand-picked by the Meister team. Live product details are unavailable right now, so this is placeholder copy.</p>`,
    shortDescriptionHtml: '',
    sku: product.id.toUpperCase(),
    stockQuantity: null,
    // `product` already carries stockStatus, onSale and priceFrom via the
    // spread above — re-stating them here would silently discard the seeded
    // out-of-stock, backorder and sale states.
    regularPrice: product.price,
    salePrice: null,
    attributes:
      sizeValues.length > 0
        ? [{ name: 'Options', values: sizeValues, isVariationAxis: false }]
        : [],
    variants: [],
    weight: '',
    dimensions: { length: '', width: '', height: '' },
  }
}

/* ----------------------------------------------------------------
   Static PDP copy — storefront design data, same as categoryDetails
   ---------------------------------------------------------------- */

export interface TrustItem {
  readonly id: string
  readonly title: string
  readonly detail: string
  /** Optional link, e.g. `tel:` for the support line. */
  readonly href?: string
}

/** Free-shipping threshold in EUR. Placeholder — confirm with the shop. */
export const FREE_SHIPPING_THRESHOLD = 80

/** Shop support line. Placeholder — confirm with the shop. */
export const SUPPORT_PHONE = '+30 210 000 0000'

export const trustItems: readonly TrustItem[] = [
  {
    id: 'shipping',
    title: 'FREE SHIPPING',
    detail: `On orders over ${FREE_SHIPPING_THRESHOLD}€ within Greece`,
  },
  {
    id: 'returns',
    title: '14-DAY RETURNS',
    detail: 'Changed your mind? Send it back, no questions',
  },
  {
    id: 'secure',
    title: 'SECURE CHECKOUT',
    detail: 'Encrypted payment, your card details stay private',
  },
  {
    id: 'help',
    title: 'NEED HELP?',
    detail: SUPPORT_PHONE,
    href: `tel:${SUPPORT_PHONE.replace(/\s/g, '')}`,
  },
]

export const shippingReturnsCopy = [
  {
    headline: 'Delivery',
    body: `Orders placed before 14:00 ship the same working day. Delivery within Greece takes 1–3 working days. Shipping is free on orders over ${FREE_SHIPPING_THRESHOLD}€; below that a flat rate applies at checkout.`,
  },
  {
    headline: 'Returns',
    body: 'You have 14 days from delivery to return an unused item in its original packaging. Contact us first and we will send you the return instructions. Refunds are issued to the original payment method.',
  },
  {
    headline: 'Not sure about sizing?',
    body: `Call us on ${SUPPORT_PHONE}. We dive this gear ourselves and would rather spend five minutes on the phone than have you send something back.`,
  },
] as const

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

/**
 * Formats a price number to a Greek-locale EUR string, e.g. 249 → "249,00 €".
 * Note the trailing symbol, the comma decimal separator, and the U+00A0
 * non-breaking space before "€" — never string-split the result, and give
 * every price element `whitespace-nowrap` so it can't break mid-value.
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(price)
}

/**
 * Everything a mock product declares by hand. The three merchandising flags
 * are optional here and defaulted below, so a seed only mentions one when it
 * deliberately differs — which keeps the list readable and means adding a
 * fourth flag later doesn't mean touching all sixteen entries.
 */
type MockProductSeed = Omit<Product, 'stockStatus' | 'onSale' | 'priceFrom'> &
  Partial<Pick<Product, 'stockStatus' | 'onSale' | 'priceFrom'>>

/**
 * A handful of seeds carry non-default states on purpose. The deployed stable
 * link runs on mock data, so without them the out-of-stock, backorder, sale
 * and "From" treatments would be invisible to anyone reviewing the site.
 */
const productSeeds: MockProductSeed[] = [
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
    priceFrom: true,
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
    stockStatus: 'outofstock',
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
    onSale: true,
    priceFrom: true,
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
    stockStatus: 'onbackorder',
    priceFrom: true,
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
    // Deliberately empty — stands in for the 9 live products WooCommerce has
    // no photo for, so the placeholder tile is visible in mock mode too.
    image: '',
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

/** Seeds spread last so an explicit flag always wins over its default. */
export const products: Product[] = productSeeds.map((seed) => ({
  stockStatus: 'instock',
  onSale: false,
  priceFrom: false,
  ...seed,
}))

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
    image: '/images/accessories-category-image.jpg',
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
