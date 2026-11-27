import { expect, test } from 'bun:test'
import { createSettings } from '../../../src/features/settings/settings.ts'

const memory = (start: Record<string, string> = {}) => {
  const data = new Map(Object.entries(start))
  return {
    get: (k: string) => data.get(k) ?? null,
    set: (k: string, v: string) => void data.set(k, v),
    remove: (k: string) => void data.delete(k),
    data,
  }
}

test('a first visit takes the browser language when the game has it, else the game first language', () => {
  expect(createSettings(memory(), 'g', ['en', 'es'], ['es-MX']).get('language')).toBe('es')
  expect(createSettings(memory(), 'g', ['en', 'es'], ['fr-FR']).get('language')).toBe('en')
})

test('a change is kept under the game id and comes back next visit', () => {
  const store = memory()
  createSettings(store, 'g', ['en'], []).set('textSize', 2)
  expect(store.data.has('automata:g:settings')).toBe(true)
  expect(createSettings(store, 'g', ['en'], []).get('textSize')).toBe(2)
})

test('a value of the wrong kind, a language the game lacks or broken text is thrown away', () => {
  const wrong = memory({ 'automata:g:settings': JSON.stringify({ textSize: 'big', language: 'xx', mute: true }) })
  const settings = createSettings(wrong, 'g', ['en'], [])
  expect(settings.get('textSize')).toBe(0)
  expect(settings.get('language')).toBe('en')
  expect(settings.get('mute')).toBe(true)
  expect(createSettings(memory({ 'automata:g:settings': '{nope' }), 'g', ['en'], []).get('master')).toBe(80)
})

test('listeners hear changes, and a browser that will not keep them still holds them for the visit', () => {
  const store = {
    get: () => null,
    remove: () => undefined,
    set: () => {
      throw new Error('full')
    },
  }
  const settings = createSettings(store, 'g', ['en'], [])
  const heard: number[] = []
  settings.subscribe((s) => heard.push(s.master))
  settings.set('master', 10)
  expect(heard).toEqual([80, 10])
  expect(settings.get('master')).toBe(10)
})
