import { z } from 'zod'
import { defineKind } from '../content/kinds.ts'

/** What one thing a player can do. A stick action's `keys` are four: left, right, up, down. */
export type Action = {
  id: string
  label: string
  kind: 'button' | 'stick'
  keys: string[]
  pad: string[]
  canTap?: boolean
}
/** The `controls` content kind: every action, and each player's own keys where they differ. Formats may change. */
export type Controls = { format: 1; id: string; actions: Action[]; players: { keys?: Record<string, string[]> }[] }
/** One player's bindings: key codes and pad inputs for each action, and the actions set to tap on, tap off. */
export type Bindings = { keys: Record<string, string[]>; pad: Record<string, string[]>; tap: string[] }

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, 'use small letters, numbers and dashes, starting with a letter')

export const controlsSchema = z
  .looseObject({
    format: z.literal(1),
    id,
    actions: z
      .array(
        z.object({
          id,
          label: z.string().min(1),
          kind: z.enum(['button', 'stick']),
          keys: z.array(z.string().min(1)),
          pad: z.array(z.string().min(1)),
          canTap: z.boolean().optional(),
        }),
      )
      .min(1),
    players: z.array(z.object({ keys: z.record(z.string(), z.array(z.string())).optional() })),
  })
  .superRefine((controls, context) => {
    const seen = new Set<string>()
    for (const [index, action] of controls.actions.entries()) {
      if (seen.has(action.id))
        context.addIssue({ code: 'custom', path: ['actions', index, 'id'], message: 'is used twice' })
      seen.add(action.id)
      if (action.kind === 'stick' && action.keys.length !== 0 && action.keys.length !== 4)
        context.addIssue({
          code: 'custom',
          path: ['actions', index, 'keys'],
          message: 'a stick needs four keys: left, right, up, down',
        })
    }
  })

defineKind('controls', controlsSchema)

/** The bindings a game starts with: one per entry of `players` (one when there are none), each with its own keys. */
export function defaultBindings(controls: Controls): Bindings[] {
  return Array.from({ length: Math.max(1, controls.players.length) }, (_, player) => {
    const own = controls.players[player]?.keys ?? {}
    return {
      keys: Object.fromEntries(controls.actions.map((action) => [action.id, own[action.id] ?? action.keys])),
      pad: Object.fromEntries(controls.actions.map((action) => [action.id, action.pad])),
      tap: [],
    }
  })
}
