import type { ProductDetail, ProductVariant } from '@/lib/mock-data'

/** Resolve saved selections against today's catalog without changing the
 * cookie identity used by quantity/removal controls or guessing missing choices. */
export function resolveCartSelection(
  product: ProductDetail,
  variationId?: string,
  selectedOptions?: Record<string, string>,
): { variant: ProductVariant | null; attributes: Record<string, string>; issue?: string } {
  const axes = product.attributes.filter(axis => axis.isVariationAxis)
  if (product.type === 'simple' && variationId) {
    return { variant: null, attributes: {}, issue: 'These product options have changed. Please remove this saved item and add it again.' }
  }
  let variant = product.variants.find(candidate => candidate.id === variationId) ?? null
  const attributes: Record<string, string> = {}
  const invalid: string[] = []
  for (const axis of axes) {
    const pinned = variant?.attributes[axis.name]
    const saved = selectedOptions?.[axis.name]
    const value = pinned || saved
    if (!value || !axis.values.includes(value) || (pinned && saved && pinned !== saved)) {
      invalid.push(axis.name)
    }
    if (value) attributes[axis.name] = value
  }
  if (invalid.length) {
    return { variant, attributes, issue: `Please choose valid options for ${invalid.join(', ')}.` }
  }
  if (product.type === 'variable' && !variant) {
    const usable = product.variants.filter(candidate => Object.keys(candidate.attributes).length > 0)
    const matches = usable.filter(candidate => axes.every(axis => {
      const pinned = candidate.attributes[axis.name]
      return !pinned || pinned === attributes[axis.name]
    }))
    const specificity = (candidate: ProductVariant) => axes.filter(axis => candidate.attributes[axis.name]).length
    const best = Math.max(...matches.map(specificity))
    const candidates = matches.filter(candidate => specificity(candidate) === best)
    if (candidates.length === 1) variant = candidates[0]
    // Legacy WooCommerce products can have empty variation metadata. With
    // every axis chosen, the Store API can still resolve the parent itself.
    else if (usable.length || variationId || !axes.length || product.priceFrom || new Set(product.variants.map(candidate => candidate.price)).size > 1) {
      return { variant, attributes, issue: 'These options have changed. Please choose the product options again.' }
    }
  }
  return { variant, attributes }
}
