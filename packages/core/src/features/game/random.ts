import type { State } from './game.ts'

/** A seeded number from 0 up to (not including) 1. The seed lives in the state, so a saved game keeps its dice. */
export function random(state: State<unknown>): number {
  state.seed = (state.seed + 0x6d2b79f5) | 0
  let t = state.seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
