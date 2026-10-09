export interface WishlistMeta { key: string; value: boolean }
export const GUEST_KEY = 'mm_wishlist_guest'
export const pendingKey = (customerId: number) => `mm_wishlist_pending_${customerId}`

export function normalizeIds(input: unknown): string[] {
  return Array.isArray(input) ? [...new Set(input.filter((id): id is string => typeof id === 'string' && /^[1-9]\d{0,14}$/.test(id)))] : []
}

export function readWishlistMetadata(input: unknown): string[] {
  const saved = new Map<string, boolean>()
  if (Array.isArray(input)) for (const entry of input) {
    if (!entry || typeof entry.key !== 'string' || !entry.key.startsWith('mm_wishlist_')) continue
    const id = entry.key.slice('mm_wishlist_'.length)
    if (normalizeIds([id]).length) saved.set(id, entry.value === true || entry.value === 1 || entry.value === '1')
  }
  return [...saved].filter(([, value]) => value).map(([id]) => id)
}

export function wishlistMetadata(ids: string[], saved: boolean): WishlistMeta[] {
  return normalizeIds(ids).map(id => ({ key: `mm_wishlist_${id}`, value: saved }))
}
