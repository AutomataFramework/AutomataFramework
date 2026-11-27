import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { openGame, sizes } from '../browser/open.ts'
import { fail, ok } from '../../lib/result.ts'
import type { Io } from './registry.ts'

// What every game in a browser shares on `window`.
type Game = Record<string, { state(): { tick: number } } | undefined>

export const notBuilt = fail([
  { file: 'dist', line: 1, message: 'The game is not built yet.', fix: 'Run npm run build, then try again.' },
])

export const shot = {
  summary: 'Open the built game in a browser and save a picture of it.',
  input: z.object({
    tick: z.coerce
      .number()
      .int()
      .min(0)
      .max(36_000)
      .default(0)
      .describe('Take the picture once the game reaches this tick.'),
    size: z.enum(['phone', 'tablet', 'computer']).default('phone').describe('The screen to look at it on.'),
    file: z
      .string()
      .regex(/\.png$/, 'end the name with .png')
      .optional()
      .describe('Where to save it in the game folder. shots/<size>-<tick>.png when left out.'),
  }),
  async run(input: { tick: number; size: keyof typeof sizes; file?: string | undefined }, io: Io) {
    if (!existsSync(join(io.cwd, 'dist', 'index.html'))) return notBuilt
    const opened = await openGame(io.cwd, io.env, io.say, { size: input.size })
    try {
      await opened.page.waitForFunction(
        (tick) => ((window as unknown as Game)['__automata']?.state().tick ?? 0) >= tick,
        input.tick,
        { timeout: 60_000 + input.tick * 50 },
      )
      const file = input.file ?? `shots/${input.size}-${input.tick}.png`
      mkdirSync(dirname(join(io.cwd, file)), { recursive: true })
      await opened.page.screenshot({ path: join(io.cwd, file) })
      io.say(`Saved a picture of the game on a ${input.size} as ${file}.`)
      return ok({ file })
    } finally {
      await opened.close()
    }
  },
}
