import { defineKind } from '@automataframework/core'
import { z } from 'zod'

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, 'use small letters, numbers and dashes, starting with a letter')
/** The name of a message. A word is never written out in a screen file; the words live in `messages/`. */
const word = z.string().min(1)
const event = z.string().regex(/^[a-z][a-z0-9-]*$/, 'use small letters, numbers and dashes, starting with a letter')

/** The settings a slider, steps or switch may change. Each is a key of `Settings`. */
const settingNames = [
  'language',
  'master',
  'music',
  'effects',
  'mute',
  'textSize',
  'contrast',
  'motion',
  'frameCounter',
] as const
const setting = z.enum(settingNames)

const button = z.object({
  type: z.literal('button'),
  id,
  label: word,
  does: event,
  /** The screen's main button is the first one that shows and says `main`. */
  main: z.boolean().optional(),
  /** Marks a row that opens another screen: it is shown with a ">" on the right. */
  opens: z.boolean().optional(),
  /** Shown on the right of the row. */
  shows: z.literal('language').optional(),
  /** Only with (or only without) a save to continue from. */
  when: z.enum(['has-save', 'no-save']).optional(),
})
const text = z.object({ type: z.literal('text'), words: word })
const image = z.object({ type: z.literal('image'), asset: id })
const slider = z.object({ type: z.literal('slider'), id, label: word, setting })
const steps = z.object({
  type: z.literal('steps'),
  id,
  label: word,
  setting,
  /** The name of each level, from the lowest. */
  levels: z.array(word).min(2),
})
const switchItem = z.object({ type: z.literal('switch'), id, label: word, setting })
const list = z.object({ type: z.literal('list'), from: z.enum(['saves', 'languages', 'controls', 'credits']) })
const item = z.discriminatedUnion('type', [button, text, image, slider, steps, switchItem, list])

/** The `screen` content kind. Formats may change. */
export const screenSchema = z.looseObject({
  format: z.literal(1),
  id,
  kind: z.literal('screen'),
  title: word.optional(),
  /** A small line over the title, such as the game's name. */
  above: word.optional(),
  /** `card` slides up as a sheet or sits in the middle; `splash` fills the screen and skips on any key or tap. */
  layout: z.enum(['card', 'splash']).optional(),
  /** Shows a "Back" button under the items. */
  back: z.boolean().optional(),
  items: z.array(item),
})

const where = z.enum(['top-left', 'top', 'top-right', 'bottom-left', 'bottom', 'bottom-right'])
/** The `hud` content kind. Formats may change. */
export const hudSchema = z.looseObject({
  format: z.literal(1),
  id,
  kind: z.literal('hud'),
  items: z.array(
    z.object({
      type: z.enum(['text', 'icon', 'bar']),
      /** A path into the game's state, such as `game.score`. A bar reads a number from 0 to 1. */
      shows: z.string().min(1),
      label: word,
      where,
      player: z.number().int().min(0).optional(),
    }),
  ),
})

const goTo = z.union([id, z.object({ ask: word, yes: id })])
/** The `flow` content kind. A state shows a screen, or plays the game and shows a HUD. Formats may change. */
export const flowSchema = z.looseObject({
  format: z.literal(1),
  id,
  kind: z.literal('flow'),
  start: id,
  screens: z.record(
    id,
    z.object({
      screen: id.optional(),
      hud: id.optional(),
      /** Milliseconds until `timeout` happens by itself. */
      after: z.number().int().positive().optional(),
      on: z.record(event, goTo),
    }),
  ),
})

const corner = z.object({ size: z.number().min(0), steep: z.number().min(1) })
const colour = z.string().min(1)
/** The `theme` content kind. Every key is optional: a missing one takes the shell's own look. Formats may change. */
export const themeSchema = z.looseObject({
  format: z.literal(1),
  id,
  kind: z.literal('theme'),
  colours: z
    .object({
      page: colour.optional(),
      words: colour.optional(),
      muted: colour.optional(),
      button: colour.optional(),
      buttonWords: colour.optional(),
      primary: colour.optional(),
      primaryWords: colour.optional(),
      line: colour.optional(),
      focus: colour.optional(),
      player: z.array(colour).optional(),
    })
    .optional(),
  fonts: z
    .object({ title: z.string().optional(), main: z.string().optional(), plain: z.string().optional() })
    .optional(),
  corners: z.object({ card: corner.optional(), button: corner.optional(), small: corner.optional() }).optional(),
  outline: z.number().min(0).optional(),
  pixelArt: z.boolean().optional(),
  playerMarks: z.array(z.string()).optional(),
})

/** The `credits` content kind. Formats may change. */
export const creditsSchema = z.looseObject({
  format: z.literal(1),
  id,
  kind: z.literal('credits'),
  lines: z.array(z.object({ role: word, names: z.array(z.string()) })),
})

export type Screen = z.infer<typeof screenSchema>
export type Item = Screen['items'][number]
export type Hud = z.infer<typeof hudSchema>
export type Flow = z.infer<typeof flowSchema>
export type Theme = z.infer<typeof themeSchema>
export type Credits = z.infer<typeof creditsSchema>

let defined = false
/** Teaches `/core` the shell's content kinds, so a mistake in one of its files is named with its file and line. */
export function defineShellKinds(): void {
  if (defined) return
  defined = true
  defineKind('screen', screenSchema)
  defineKind('hud', hudSchema)
  defineKind('flow', flowSchema)
  defineKind('theme', themeSchema)
  defineKind('credits', creditsSchema)
}
