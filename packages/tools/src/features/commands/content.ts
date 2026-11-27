import { schemas } from '@automataframework/core'
import { z } from 'zod'
import { ok } from '../../lib/result.ts'
import { loadCode } from './play.ts'
import type { Io } from './registry.ts'

export const content = {
  summary: 'List the content files, each with its kind and the shape it must have.',
  input: z.object({}),
  async run(_input: object, io: Io) {
    // The game's code is loaded too, because a game adds its own kinds of file when it starts.
    const code = await loadCode(io.cwd)
    if (!code.ok) return code
    const files = code.value.manifest.content.map((entry) => {
      const schema = schemas[`kind:${entry.kind}`] ?? schemas['envelope']
      const shape = schema ? z.toJSONSchema(schema, { io: 'input' }) : {}
      return { id: entry.id, kind: entry.kind, path: `public/${entry.path}`, schema: shape }
    })
    for (const f of files) io.say(`${f.id}: a "${f.kind}" file, ${f.path}`)
    if (files.length === 0) io.say('The game lists no content files in public/automata.json.')
    return ok(files)
  },
}
