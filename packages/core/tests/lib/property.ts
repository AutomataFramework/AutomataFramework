// A small property-test loop of our own (a library would be a new dependency): the same seed always makes the same cases.

/** A seeded number from 0 up to (not including) 1. */
function seeded(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Dice = {
  next(): number
  int(below: number): number
  pick<T>(items: readonly T[]): T
  /** Plain JSON data: numbers, text, true and false, null, lists and objects. */
  json(depth?: number): unknown
}

function dice(seed: number): Dice {
  const next = seeded(seed)
  const int = (below: number): number => Math.floor(next() * below)
  const words = ['a', 'b', 'score', 'hp', 'x', 'ünï', '', 'a b', '"q"', '\n']
  const json = (depth = 0): unknown => {
    const kind = int(depth > 2 ? 4 : 6)
    if (kind === 0) return int(2000) - 1000
    if (kind === 1) return Math.round((next() - 0.5) * 1e6) / 1e3
    if (kind === 2) return words[int(words.length)]
    if (kind === 3) return next() < 0.5 ? null : next() < 0.5
    if (kind === 4) return Array.from({ length: int(4) }, () => json(depth + 1))
    return Object.fromEntries(Array.from({ length: int(4) }, () => [words[int(words.length)] ?? 'k', json(depth + 1)]))
  }
  return { next, int, pick: (items) => items[int(items.length)] as never, json }
}

/** Runs `check` for each of `cases` cases (500 by default). A failure names the case, so it can be run again. */
export function forAll(check: (dice: Dice, index: number) => void, cases = 500, seed = 20261127): void {
  for (let index = 0; index < cases; index += 1) {
    try {
      check(dice(seed + index), index)
    } catch (error) {
      throw new Error(
        `Case ${index} (seed ${seed + index}) failed: ${error instanceof Error ? error.message : error}`,
        {
          cause: error,
        },
      )
    }
  }
}
