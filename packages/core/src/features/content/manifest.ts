import { z } from 'zod'

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, 'use small letters, numbers and dashes, starting with a letter')

/** `automata.json`: what a game is and which files it loads. Formats may change. */
export const manifestSchema = z.object({
  format: z.literal(1),
  id,
  name: z.string().min(1),
  size: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  languages: z.array(z.string().min(2)).min(1),
  start: z.enum(['menu', 'play']),
  content: z.array(z.object({ id, kind: id, path: z.string().min(1) })),
  assets: z.array(z.object({ id, kind: z.enum(['image', 'sound', 'font']), path: z.string().min(1) })),
})
export type Manifest = z.infer<typeof manifestSchema>

/** What every content file starts with. */
export const envelopeSchema = z.looseObject({ format: z.number().int().positive(), id, kind: id })
