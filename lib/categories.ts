/**
 * The five real storefront categories — everything a `/[category]` route,
 * the navbar, and breadcrumbs need to know a category exists.
 *
 * Deliberately separate from `categoryDetails` in `lib/mock-data.ts`, which
 * holds the richer tagline/marquee/accordion/image data for only the four
 * categories curated into the homepage's showcase tabs. This registry
 * answers "does this category page exist"; `categoryDetails` answers "is
 * this one of the four homepage tabs." `guns` is deliberately only in this
 * one — Meister resells that gear rather than manufacturing it, and the
 * homepage showcase represents Meister's own lines.
 */
export interface CategoryInfo {
  slug: string
  name: string
}

export const allCategories: readonly CategoryInfo[] = [
  { slug: 'fins', name: 'FINS' },
  { slug: 'suits', name: 'SUITS' },
  { slug: 'guns', name: 'GUNS' },
  { slug: 'accessories', name: 'ACCESSORIES' },
  { slug: 'merch', name: 'MERCH' },
]

export function findCategory(slug: string): CategoryInfo | undefined {
  return allCategories.find((category) => category.slug === slug)
}
