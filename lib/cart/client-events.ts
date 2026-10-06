/** Fired on `window` whenever a cart Server Action succeeds, so the navbar's
 *  count badge can refetch immediately instead of waiting for its next mount. */
export const CART_UPDATED_EVENT = 'mm:cart-updated'
export const CART_OPEN_EVENT = 'mm:cart-open'

/** Returns false before the drawer mounts, retaining the header link fallback. */
export function openCartDrawer(): boolean {
  if (typeof window === 'undefined') return false
  return !window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT, { cancelable: true }))
}

export function notifyCartAdded(): void {
  notifyCartUpdated()
  openCartDrawer()
}

export function notifyCartUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT))
}
