import type { KeyValue } from '@automataframework/core'

/** What a player can change. Each `setting` a screen file names is one of these keys. */
export type Settings = {
  language: string
  master: number
  music: number
  effects: number
  mute: boolean
  textSize: number
  contrast: number
  motion: number
  frameCounter: boolean
}
export type SettingName = keyof Settings

const defaults = (language: string): Settings => ({
  language,
  master: 80,
  music: 60,
  effects: 80,
  mute: false,
  textSize: 0,
  contrast: 0,
  motion: 0,
  frameCounter: false,
})

/**
 * The player's settings, kept in the browser under `automata:<game id>:settings`. A first visit takes the language the
 * browser asks for, when the game has it. A value of the wrong kind in storage is thrown away, never trusted.
 */
export function createSettings(
  store: KeyValue,
  gameId: string,
  languages: string[],
  browserLanguages: readonly string[],
) {
  const key = `automata:${gameId}:settings`
  const first = languages[0] ?? 'en'
  const asked = browserLanguages.map((l) => l.toLowerCase().split('-')[0]).find((l) => l && languages.includes(l))
  const base = defaults(asked ?? first)
  let current: Settings = { ...base }
  try {
    const raw = store.get(key)
    const saved = raw === null ? {} : (JSON.parse(raw) as Record<string, unknown>)
    for (const name of Object.keys(base) as SettingName[]) {
      if (typeof saved[name] === typeof base[name]) (current as Record<string, unknown>)[name] = saved[name]
    }
    if (!languages.includes(current.language)) current.language = base.language
  } catch {
    current = { ...base }
  }
  const listeners = new Set<(settings: Settings) => void>()
  return {
    all: (): Settings => current,
    get: <K extends SettingName>(name: K): Settings[K] => current[name],
    set<K extends SettingName>(name: K, value: Settings[K]): void {
      current = { ...current, [name]: value }
      try {
        store.set(key, JSON.stringify(current))
      } catch {
        // The browser would not keep it (private mode, storage full): the choice still holds for this visit.
      }
      for (const listener of listeners) listener(current)
    },
    subscribe(listener: (settings: Settings) => void): () => void {
      listeners.add(listener)
      listener(current)
      return () => void listeners.delete(listener)
    },
  }
}
