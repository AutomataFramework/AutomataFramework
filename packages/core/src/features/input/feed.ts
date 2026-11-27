import type { Inputs } from '../game/game.ts'

/** A play's runs: how many ticks, and the inputs held for all of them. */
type Runs = [ticks: number, inputs: Inputs][]

/**
 * Lets something other than a person drive a running game (the tools do, to play a recording in a real browser).
 * `next` is called once a tick with what the keys, touch and pad gave; while a feed is on it answers with the fed
 * inputs instead. Fed runs go one tick at a time and the feed lets go after the last run.
 */
export function createFeed() {
  let held: Inputs | null = null
  let queue: Runs = []
  let current: Inputs | null = null
  let left = 0
  return {
    /** Holds these inputs for every tick from now on, until `hold(null)`. */
    hold(inputs: Inputs | null): void {
      held = inputs
      queue = []
      left = 0
      current = null
    },
    /** Plays these runs from the next tick, then lets go. */
    runs(runs: Runs): void {
      queue = structuredClone(runs)
      left = 0
      current = null
    },
    next(real: () => Inputs): Inputs {
      while (left === 0) {
        const run = queue.shift()
        if (!run) {
          current = null
          return held ?? real()
        }
        left = run[0]
        current = run[1]
      }
      left -= 1
      return current ?? held ?? real()
    },
    /** True while fed runs are still playing. */
    busy: (): boolean => left > 0 || queue.length > 0,
  }
}
