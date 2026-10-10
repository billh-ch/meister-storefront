export const COMPARE_KEY = 'mm_compare_v1'
export interface CompareSelection { id: string; name: string; category: string }
interface Snapshot { items: CompareSelection[]; ready: boolean; message: string; error: string }
const INITIAL: Snapshot = { items: [], ready: false, message: '', error: '' }
const categories = new Set(['fins', 'suits', 'guns', 'accessories', 'merch'])
export function normalizeSelection(input: unknown): CompareSelection[] {
  if (!Array.isArray(input)) return []
  const result: CompareSelection[] = []
  for (const item of input) {
    if (!item || typeof item.id !== 'string' || !/^[1-9]\d{0,14}$/.test(item.id) || typeof item.name !== 'string' || !item.name.trim() || !categories.has(item.category)) continue
    if (result.some(selected => selected.id === item.id) || (result.length && result[0].category !== item.category)) continue
    result.push({ id: item.id, name: item.name.slice(0, 200), category: item.category })
    if (result.length === 4) break
  }
  return result
}
export class CompareStore {
  private state = INITIAL
  private pending = new Map<string, CompareSelection | null>()
  private reset = false
  private listeners = new Set<() => void>()
  private storage: { read(): string | null; write(value: string): void }
  constructor(storage: { read(): string | null; write(value: string): void }) { this.storage = storage }
  getSnapshot = () => this.state
  getServerSnapshot = () => INITIAL
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(patch: Partial<Snapshot>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()) }
  private read() { return normalizeSelection(JSON.parse(this.storage.read() ?? '[]')) }
  private flush() {
    try {
      const current = new Map((this.reset ? [] : this.read()).map(item => [item.id, item]))
      for (const [id, item] of this.pending) { if (item) current.set(id, item); else current.delete(id) }
      const items = [...current.values()]
      // Conflicting categories or capacity cannot be merged without losing a selection.
      if (items.length > 4 || new Set(items.map(item => item.category)).size > 1) {
        this.update({ error: 'Another tab changed your comparison. Remove a product or clear the selection before saving these changes.' })
        return
      }
      try {
        this.storage.write(JSON.stringify(items))
        this.pending.clear(); this.reset = false
        this.update({ items, ready: true, error: '' })
      } catch {
        this.update({ ready: true, error: 'Your browser could not remember this comparison for your next visit.' })
      }
    } catch { this.update({ ready: true, error: 'Your browser could not restore or save the comparison.' }) }
  }
  hydrate = () => {
    if (this.pending.size || this.reset) { this.flush(); return }
    try { this.update({ items: this.read(), ready: true, error: '' }) }
    catch { this.update({ ready: true, error: 'Your browser could not restore the saved comparison.' }) }
  }
  toggle = (product: CompareSelection) => {
    if (!this.state.ready || !normalizeSelection([product]).length) return
    this.hydrate()
    if (this.state.items.some(item => item.id === product.id)) { this.remove(product.id); return }
    if (this.state.items.length >= 4) { this.update({ message: 'You can compare up to four products. Remove one to add another.' }); return }
    if (this.state.items.length && this.state.items[0].category !== product.category) { this.update({ message: 'Compare products from the same category. Clear your list to compare a different category.' }); return }
    const [item] = normalizeSelection([product])
    this.pending.set(item.id, item)
    this.update({ items: [...this.state.items, item], message: `${item.name} added to comparison.` })
    this.flush()
  }
  remove = (id: string) => {
    this.pending.set(id, null)
    this.update({ items: this.state.items.filter(item => item.id !== id), message: 'Product removed from comparison.' })
    this.flush()
  }
  clear = () => {
    this.pending.clear(); this.reset = true
    this.update({ items: [], message: 'Comparison cleared.' })
    this.flush()
  }
  reconcile = (products: CompareSelection[]) => {
    this.hydrate()
    const items = this.state.items.map(item => {
      const fresh = products.find(product => product.id === item.id)
      return fresh && normalizeSelection([fresh]).length ? { id: item.id, name: fresh.name.slice(0, 200), category: fresh.category } : item
    })
    for (const item of items) {
      const previous = this.state.items.find(previous => previous.id === item.id)
      if (previous?.name !== item.name || previous.category !== item.category) this.pending.set(item.id, item)
    }
    if (!this.pending.size) return
    this.update({ items })
    this.flush()
  }
}
