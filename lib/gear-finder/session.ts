import { QUESTIONS, FIN_QUESTIONS } from './reference'
import type { Answers, Mode, Question } from './types'
export interface FinderSession { answers: Answers; step: number; results: boolean; showAll: boolean }
export type FinderSessions = Record<Mode, FinderSession>
const empty = (): FinderSession => ({ answers: {}, step: 0, results: false, showAll: false })
const serverState: FinderSessions = { wetsuits: empty(), fins: empty() }
const KEY = 'meister_gear_finder_v1'
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>
function validSession(value: unknown, questions: Question[]): FinderSession {
  if (!value || typeof value !== 'object') return empty()
  const input = value as Partial<FinderSession>
  const answers: Answers = {}
  for (const q of questions) {
    const answer = input.answers?.[q.id]
    if (q.options.some(option => option[0] === answer)) answers[q.id] = answer!
  }
  const missing = questions.findIndex(q => !answers[q.id])
  const maxStep = missing === -1 ? questions.length - 1 : missing
  const step = typeof input.step === 'number' && Number.isInteger(input.step) ? Math.max(0, Math.min(input.step, maxStep)) : 0
  return { answers, step, results: input.results === true && missing === -1, showAll: input.showAll === true }
}
/** Tab-session only; no personal data, accounts or cross-tab tracking. */
export function createFinderStore(storage?: Storage) {
  let state = serverState
  try {
    const raw = storage?.getItem(KEY)
    if (raw && raw.length < 20000) {
      const saved = JSON.parse(raw)
      state = { wetsuits: validSession(saved?.wetsuits, QUESTIONS), fins: validSession(saved?.fins, FIN_QUESTIONS) }
    }
  } catch { /* Storage can be blocked; the in-memory quiz still works. */ }
  const listeners = new Set<() => void>()
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => state,
    getServerSnapshot: () => serverState,
    update(mode: Mode, session: FinderSession) {
      state = { ...state, [mode]: session }
      try { storage?.setItem(KEY, JSON.stringify(state)) } catch {}
      listeners.forEach(listener => listener())
    },
  }
}
export function browserFinderStore() {
  try { return createFinderStore(window.sessionStorage) } catch { return createFinderStore() }
}
