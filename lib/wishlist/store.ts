import { GUEST_KEY, normalizeIds, pendingKey } from './model'

export interface AccountWishlist { customerId: number | null; ids: string[] }
export interface WishlistSnapshot extends AccountWishlist { ready: boolean; syncing: boolean; error: string; message: string }
interface Dependencies {
  read(key: string): string | null
  write(key: string, value: string): void
  load(): Promise<AccountWishlist>
  change(customerId: number, additions: string[], removals: string[]): Promise<AccountWishlist>
}
type Pending = Record<string, boolean>
const INITIAL: WishlistSnapshot = { customerId: null, ids: [], ready: false, syncing: false, error: '', message: '' }
const apply = (ids: string[], pending: Pending) => [...new Set([...ids, ...Object.keys(pending).filter(id => pending[id])])].filter(id => pending[id] !== false)

/** One serialized sync queue per mounted storefront. Only product IDs are persisted. */
export class WishlistStore {
  private state = INITIAL
  private listeners = new Set<() => void>()
  private queue = Promise.resolve()
  private guest: string[] = []
  private guestDirty = false
  private pending = new Map<number, Pending>()
  private generation = 0
  private storageError = ''
  private deps: Dependencies
  constructor(deps: Dependencies) { this.deps = deps }
  getSnapshot = () => this.state
  getServerSnapshot = () => INITIAL
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<WishlistSnapshot>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(listener => listener())
  }
  private read(key: string): unknown {
    try { return JSON.parse(this.deps.read(key) ?? 'null') }
    catch { this.storageError = 'Your browser could not read saved wishlist changes.'; return null }
  }
  private write(key: string, value: unknown) {
    try { this.deps.write(key, JSON.stringify(value)) }
    catch { this.storageError = 'Your browser could not save these changes for your next visit.' }
  }
  private writeGuest() {
    try {
      this.deps.write(GUEST_KEY, JSON.stringify(this.guest))
      this.guestDirty = false
    } catch {
      this.guestDirty = true
      this.storageError = 'Your browser could not save these changes for your next visit.'
    }
  }
  private changes(customerId: number): Pending {
    const raw = this.read(pendingKey(customerId))
    const fromStorage: Pending = {}
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [id, saved] of Object.entries(raw)) if (normalizeIds([id]).length && typeof saved === 'boolean') fromStorage[id] = saved
    }
    const changes = { ...fromStorage, ...this.pending.get(customerId) }
    this.pending.set(customerId, changes)
    return changes
  }
  /** Immediately hide the previous account while a navigation rechecks the session. */
  invalidate = () => { this.generation++; this.update({ ...INITIAL }); return this.sync() }
  toggle = (id: string) => {
    if (!this.state.ready || !normalizeIds([id]).length) return
    const saved = !this.state.ids.includes(id)
    this.storageError = ''
    const { customerId } = this.state
    if (customerId === null) {
      if (saved && this.guest.length >= 200) { this.update({ error: 'Your guest wishlist is full. Sign in to save more products.' }); return }
      this.guest = apply(this.guest, { [id]: saved })
      this.writeGuest()
    } else {
      const pending = this.changes(customerId)
      pending[id] = saved
      this.write(pendingKey(customerId), pending)
    }
    this.update({ ids: apply(this.state.ids, { [id]: saved }), error: this.storageError, message: saved ? 'Added to wishlist.' : 'Removed from wishlist.' })
    if (customerId !== null) void this.sync()
  }
  sync = (): Promise<void> => {
    this.queue = this.queue.then(() => this.run())
    return this.queue
  }
  private async run() {
    const generation = this.generation
    this.storageError = ''
    this.update({ syncing: true })
    try {
      const account = await this.deps.load()
      if (generation !== this.generation) return
      if (this.guestDirty) this.writeGuest()
      const rawGuest = this.guestDirty ? null : this.read(GUEST_KEY)
      if (rawGuest !== null) this.guest = normalizeIds(rawGuest)
      const { customerId } = account
      if (customerId === null) {
        this.update({ customerId, ids: this.guest, ready: true, error: this.storageError })
        return
      }
      const pending = this.changes(customerId)
      const guest = [...this.guest]
      const desired: Pending = Object.fromEntries(guest.map(id => [id, true]))
      Object.assign(desired, pending) // A pending removal takes priority over a failed guest merge.
      this.update({ customerId, ids: apply(account.ids, desired), ready: true })
      let result = account
      const entries = Object.entries(desired)
      for (let offset = 0; offset < entries.length; offset += 200) {
        const batch = entries.slice(offset, offset + 200)
        result = await this.deps.change(customerId, batch.filter(([, saved]) => saved).map(([id]) => id), batch.filter(([, saved]) => !saved).map(([id]) => id))
        if (generation !== this.generation) return
        if (result.customerId !== customerId) throw Error('Account changed')
      }
      // Acknowledge only the snapshot written; newer clicks remain in the journal.
      const remaining = this.changes(customerId)
      for (const [id, saved] of Object.entries(pending)) if (remaining[id] === saved) delete remaining[id]
      this.write(pendingKey(customerId), remaining)
      const latestGuest = this.guestDirty ? null : this.read(GUEST_KEY)
      if (latestGuest !== null) this.guest = normalizeIds(latestGuest)
      this.guest = this.guest.filter(id => !guest.includes(id))
      this.writeGuest()
      this.update({ customerId, ids: apply(result.ids, remaining), ready: true, error: this.storageError })
    } catch {
      if (generation === this.generation) this.update({ error: 'Could not sync your wishlist. Your changes are kept for retry.' })
    } finally {
      if (generation === this.generation) this.update({ syncing: false })
    }
  }
}
