import type { ZodType } from 'zod'
import { envelopeSchema, manifestSchema } from './manifest.ts'

/** Every schema this package knows, by name. A game adds its own kinds with `defineKind`. */
export const schemas: Record<string, ZodType> = { manifest: manifestSchema, envelope: envelopeSchema }

const kinds = new Map<string, ZodType>()

/** A game's own kind of content file. A file of a kind nobody defined is checked for its first three lines only. */
export function defineKind(kind: string, schema: ZodType): void {
  kinds.set(kind, schema)
  schemas[`kind:${kind}`] = schema
}

export const kindSchema = (kind: string): ZodType | undefined => kinds.get(kind)
