import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { isSoftware, openGame } from '../browser/open.ts'
import { fail, ok } from '../../lib/result.ts'
import type { Io } from './registry.ts'
import { notBuilt } from './shot.ts'

type Stats = {
  fps: number
  lowest: number
  updateMs: number
  drawMs: number
  renderMs: number
  calls: Record<string, number>
}

const floor = 30
const parts = {
  updateMs: "the game's update",
  drawMs: "the game's draw calls",
  renderMs: 'putting the picture on the screen',
} as const

// The frame counter counts each kind of draw call; a person knows them by the function they called.
const callNames: Record<string, string> = {
  sprite: 'drawSprite',
  rect: 'drawRect',
  circle: 'drawCircle',
  line: 'drawLine',
  text: 'drawText',
}

/** The part that took longest on average, and the draw call made most, in plain words. */
export function costliest(samples: Stats[]): string {
  const mean = (key: keyof typeof parts): number => samples.reduce((sum, s) => sum + s[key], 0) / (samples.length || 1)
  const part = (Object.keys(parts) as (keyof typeof parts)[]).toSorted((a, b) => mean(b) - mean(a))[0] ?? 'drawMs'
  const calls: Record<string, number> = {}
  for (const s of samples) for (const [name, n] of Object.entries(s.calls)) calls[name] = Math.max(calls[name] ?? 0, n)
  const [call, count] = Object.entries(calls).toSorted(([, a], [, b]) => b - a)[0] ?? []
  const most = call ? `, with ${count} ${callNames[call] ?? call} calls a frame` : ''
  return `${parts[part]} (${mean(part).toFixed(1)} ms a frame${most})`
}

export const smooth = {
  summary: 'Check the game stays smooth on a slow phone: at least 30 frames a second.',
  input: z.object({
    seconds: z.coerce.number().int().min(3).max(60).default(10).describe('How long to watch the game.'),
  }),
  async run(input: { seconds: number }, io: Io) {
    if (!existsSync(join(io.cwd, 'dist', 'index.html'))) return notBuilt
    // The floor phone: a small screen, and its main chip about 4 times slower than a computer's.
    const opened = await openGame(io.cwd, io.env, io.say, { size: 'phone', slowCpu: 4 })
    try {
      if (isSoftware(opened.renderer))
        return fail([
          {
            file: '',
            line: 0,
            message: 'Not measured: this computer has no graphics chip, so the number would be wrong.',
            fix: 'Run it on a computer with a graphics chip.',
          },
        ])
      const samples: Stats[] = []
      const read = (): Promise<Stats> =>
        opened.page.evaluate(
          () => (window as unknown as Record<string, { stats(): Stats }>)['__automata']?.stats() as Stats,
        )
      // The frame counter leaves out its first 2 seconds, while the page warms up.
      for (let waited = 0; waited < (input.seconds + 2) * 1000; waited += 250) {
        // oxlint-disable-next-line no-await-in-loop -- one reading every quarter second, in order
        await opened.page.waitForTimeout(250)
        // oxlint-disable-next-line no-await-in-loop
        samples.push(await read())
      }
      const last = samples.at(-1)
      const lowest = last?.lowest || last?.fps || 0
      const cost = costliest(samples)
      if (lowest < floor) {
        return fail([
          {
            file: '',
            line: 0,
            message: `It drops to ${lowest} frames a second, under ${floor}. The most time goes to ${cost}.`,
            fix: 'Draw less each frame, or do less in update, then check again.',
          },
        ])
      }
      io.say(`Smooth: at least ${lowest} frames a second on a slow phone. The most time goes to ${cost}.`)
      return ok({ lowest, renderer: opened.renderer })
    } finally {
      await opened.close()
    }
  },
}
