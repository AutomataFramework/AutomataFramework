import type { KeyValue } from './saves.ts'

/** The browser's local storage, or plain memory for this visit when the browser refuses (private mode, storage full). */
export function browserStore(): KeyValue {
  const memory = new Map<string, string>()
  const fallback: KeyValue = {
    get: (key) => memory.get(key) ?? null,
    set: (key, value) => void memory.set(key, value),
    remove: (key) => void memory.delete(key),
  }
  try {
    const storage = globalThis.localStorage
    const probe = 'automata:probe'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return {
      get: (key) => storage.getItem(key),
      set: (key, value) => storage.setItem(key, value),
      remove: (key) => storage.removeItem(key),
    }
  } catch {
    return fallback
  }
}
