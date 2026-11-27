import type { State } from '../game/game.ts'

const offset = 0xcbf29ce484222325n
const prime = 0x100000001b3n
const mask = 0xffffffffffffffffn

const sorted = (_key: string, value: unknown): unknown => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
  return Object.fromEntries(Object.entries(value).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

/** A 64-bit FNV-1a of the state's JSON with its keys sorted, as 16 hex digits. The same state always gives the same text. */
export function hashState(state: State<unknown>): string {
  let hash = offset
  for (const byte of new TextEncoder().encode(JSON.stringify(state, sorted) ?? 'undefined')) {
    hash = ((hash ^ BigInt(byte)) * prime) & mask
  }
  return hash.toString(16).padStart(16, '0')
}
