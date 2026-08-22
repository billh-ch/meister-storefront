/** Fired on `window` whenever a cart Server Action succeeds, so the navbar's
 *  count badge can refetch immediately instead of waiting for its next mount. */
export const CART_UPDATED_EVENT = 'mm:cart-updated'

export function notifyCartUpdated(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT))
}
