import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { recordPlay } from '@automataframework/core'
import { z } from 'zod'
import { ok } from '../../lib/result.ts'
import { loadCode, readRuns, startInput } from './play.ts'
import type { Io } from './registry.ts'

const nextName = (dir: string): string => {
  let n = 1
  while (existsSync(join(dir, `play-${n}.json`))) n += 1
  return `play-${n}`
}

export const record = {
  summary: 'Play the game from a list of inputs and keep it as a play, so it can be played again after a change.',
  input: z.object({
    inputs: z.string().describe('The inputs as JSON runs of ticks, or a file in the game holding them.'),
    name: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/, 'use small letters, numbers and dashes')
      .optional()
      .describe('A name for the play. It is saved as plays/<name>.json.'),
    ...startInput,
  }),
  async run(input: { inputs: string; name?: string | undefined; seed: number; players: number }, io: Io) {
    const code = await loadCode(io.cwd)
    if (!code.ok) return code
    const runs = readRuns(io.cwd, input.inputs, input.players)
    if (!runs.ok) return runs
    const recording = recordPlay(code.value.game, input, { game: code.value.manifest.id, build: '' })
    for (const [ticks, inputs] of runs.value) for (let n = 0; n < ticks; n += 1) recording.push(inputs)
    const dir = join(io.cwd, 'plays')
    mkdirSync(dir, { recursive: true })
    const name = input.name ?? nextName(dir)
    const play = { ...recording.finish(), id: name }
    writeFileSync(join(dir, `${name}.json`), `${JSON.stringify(play)}\n`)
    io.say(`Kept the play as plays/${name}.json. It ends at tick ${play.end.tick}.`)
    return ok({ file: `plays/${name}.json`, end: play.end })
  },
}
