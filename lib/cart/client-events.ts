/** Fired on `window` whenever a cart Server Action succeeds, so the navbar's
 *  count badge can refetch immediately instead of waiting for its next mount. */
export const CART_UPDATED_EVENT = 'mm:cart-updated'
export const CART_OPEN_EVENT = 'mm:cart-open'
export const CART_ADDED_EVENT = 'mm:cart-added'
export interface CartAddedDetail { name: string; quantity: number }

/** Returns false before the drawer mounts, retaining the header link fallback. */
export function openCartDrawer(): boolean {
  if (typeof window === 'undefined') return false
  return !window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT, { cancelable: true }))
}

export function notifyCartAdded(name: string, quantity = 1): void {
  notifyCartUpdated()
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<CartAddedDetail>(CART_ADDED_EVENT, { detail: { name, quantity } }))
}

export function notifyCartUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT))
}
