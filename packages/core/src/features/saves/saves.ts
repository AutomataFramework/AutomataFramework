import { z } from 'zod'
import { type Problem, type Result, fail, ok } from '../../lib/result.ts'
import { problem } from '../content/problems.ts'
import type { State } from '../game/game.ts'
import { upgrade } from '../upgrade/upgrade.ts'

/** Where saves go. The browser's version is `browserStore` in `@automataframework/core/browser`. */
export type KeyValue = {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export const slots = ['auto', '1', '2', '3'] as const

const stateSchema = z.looseObject({
  tick: z.number(),
  seed: z.number(),
  players: z.array(z.looseObject({ id: z.number() })),
  outcome: z.union([z.literal('win'), z.literal('lose'), z.null()]),
  game: z.unknown(),
})
const fileSchema = z.looseObject({
  format: z.literal(1),
  id: z.string(),
  game: z.string(),
  savedAt: z.number(),
  tick: z.number(),
  state: stateSchema,
})
type SaveFile = z.infer<typeof fileSchema>

const cannotKeep = (): Problem[] => [
  problem(
    'this device',
    1,
    "This device can't keep saves right now.",
    'Free some space or leave private browsing, then save again.',
  ),
]

const known = (slot: string): boolean => (slots as readonly string[]).includes(slot)
const label = (slot: string): string => `save slot ${slot}`

const noSlot = (slot: string): Result<never> =>
  fail([problem(label(slot), 1, `There is no save slot "${slot}".`, `Use one of: ${slots.join(', ')}.`)])

export function createSaves(store: KeyValue, gameId: string, now: () => number) {
  const keyOf = (slot: string): string => `automata:${gameId}:save:${slot}`

  const stored = (slot: string): string | null => {
    try {
      return store.get(keyOf(slot))
    } catch {
      return null
    }
  }

  /** Text to a checked save file for this game, or one plain problem. */
  function parse(slot: string, text: string): Result<SaveFile> {
    const where = label(slot)
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return fail([
        problem(where, 1, 'This save is damaged and cannot be read.', 'Pick another save, or start a new game.'),
      ])
    }
    const upgraded = upgrade('save', json)
    if (!upgraded.ok) return upgraded
    const checked = fileSchema.safeParse(upgraded.value)
    if (!checked.success)
      return fail([
        problem(where, 1, 'This is not a save this game can read.', 'Pick another save, or start a new game.'),
      ])
    if (checked.data.game !== gameId)
      return fail([problem(where, 1, 'This save is from another game.', 'Import a save made by this game.')])
    return ok(checked.data)
  }

  function put(slot: string, file: SaveFile): Result<true> {
    try {
      store.set(keyOf(slot), JSON.stringify(file))
      return ok(true)
    } catch {
      return fail(cannotKeep())
    }
  }

  return {
    /** The slots that hold a save that can be read, in slot order. A damaged one is left out. */
    list(): { slot: string; savedAt: number; tick: number }[] {
      return slots.flatMap((slot) => {
        const text = stored(slot)
        const file = text === null ? undefined : parse(slot, text)
        return file?.ok ? [{ slot, savedAt: file.value.savedAt, tick: file.value.tick }] : []
      })
    },
    write(slot: string, state: State<unknown>): Result<true> {
      if (!known(slot)) return noSlot(slot)
      return put(slot, { format: 1, id: `${gameId}-${slot}`, game: gameId, savedAt: now(), tick: state.tick, state })
    },
    read(slot: string): Result<State<unknown>> {
      if (!known(slot)) return noSlot(slot)
      const text = stored(slot)
      if (text === null)
        return fail([problem(label(slot), 1, 'Nothing is saved here yet.', 'Pick a slot that has a save.')])
      const file = parse(slot, text)
      return file.ok ? ok(file.value.state as State<unknown>) : file
    },
    /** The slot's save as plain JSON text, for a person to keep; empty when the slot holds nothing. */
    exportSlot(slot: string): string {
      return known(slot) ? (stored(slot) ?? '') : ''
    },
    /** Checks `text` first and writes only if it is a save of this game at a format this game knows. */
    importInto(slot: string, text: string): Result<true> {
      if (!known(slot)) return noSlot(slot)
      const file = parse(slot, text)
      return file.ok ? put(slot, { ...file.value, id: `${gameId}-${slot}` }) : file
    },
    canStore(): boolean {
      const key = `automata:${gameId}:probe`
      try {
        store.set(key, '1')
        store.remove(key)
        return true
      } catch {
        return false
      }
    },
  }
}
