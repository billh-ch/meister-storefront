/** Outage fallback content must never resolve as a real purchasable ID. */
export function asUnavailableProductPreview<T extends { id: string }>(product: T): T {
  return { ...product, id: `preview:${product.id}` }
}
