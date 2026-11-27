import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  type Content,
  type Game,
  type Inputs,
  type Result,
  hashState,
  loadGame,
  newState,
  step,
} from '@automataframework/core'
import { z } from 'zod'
import { fail, ok } from '../../lib/result.ts'
import type { Io } from './registry.ts'

export type Loaded = Content & { game: Game<unknown> }

const problem = (file: string, message: string, fix: string): Result<never> => fail([{ file, line: 1, message, fix }])

/** The game's content files, then its code from `src/game.ts`, which runs in plain Node with no screen. */
export async function loadCode(cwd: string): Promise<Result<Loaded>> {
  const loaded = await loadGame((path) => readFile(join(cwd, 'public', path), 'utf8'))
  if (!loaded.ok) return fail(loaded.problems.map((p) => ({ ...p, file: `public/${p.file}` })))
  const file = join(cwd, 'src', 'game.ts')
  const fix = 'Put the game in src/game.ts, as `export const game = { init, update, draw }`.'
  if (!existsSync(file)) return problem('src/game.ts', 'The game code is not there.', fix)
  let code: { game?: Game<unknown> }
  try {
    code = (await import(pathToFileURL(file).href)) as { game?: Game<unknown> }
  } catch (error) {
    const why = (error instanceof Error ? error.message : String(error)).split('\n')[0]
    return problem('src/game.ts', `The game code stopped before it could start: ${why}`, 'Fix that, then try again.')
  }
  if (typeof code.game?.update !== 'function' || typeof code.game.init !== 'function')
    return problem('src/game.ts', 'It does not share a game with `init` and `update`.', fix)
  return ok({ ...loaded.value, game: code.game })
}

const playerInput = z.object({
  down: z.array(z.string()).default([]),
  sticks: z.record(z.string(), z.tuple([z.number(), z.number()])).default({}),
})
const runsSchema = z.array(
  z.tuple([z.number().int().positive(), z.union([playerInput.transform((one) => [one]), z.array(playerInput)])]),
)
export type Runs = [ticks: number, inputs: Inputs][]

/**
 * Inputs as runs of ticks: `[[30, { "down": ["right"] }], [10, {}]]` holds right for 30 ticks, then nothing for 10.
 * A run may list one input per player. `text` is that JSON, or the name of a file in the game's folder that holds it.
 */
export function readRuns(cwd: string, text: string | undefined, players: number): Result<Runs> {
  if (text === undefined) return ok([])
  const fromFile = !text.trim().startsWith('[')
  let json: unknown
  try {
    json = JSON.parse(fromFile ? readFileSync(join(cwd, text), 'utf8') : text)
  } catch {
    return problem(
      fromFile ? text : '',
      fromFile ? `I could not read the inputs in ${text}.` : 'The inputs are not plain JSON.',
      'Write them like [[30, { "down": ["right"] }], [10, {}]].',
    )
  }
  const runs = runsSchema.safeParse(json)
  if (!runs.success)
    return problem(
      fromFile ? text : '',
      'The inputs are not in the right shape.',
      'Write them like [[30, { "down": ["right"] }], [10, {}]].',
    )
  const none = { down: [], sticks: {} }
  return ok(runs.data.map(([ticks, inputs]) => [ticks, Array.from({ length: players }, (_, i) => inputs[i] ?? none)]))
}

export const startInput = {
  seed: z.coerce.number().int().default(1).describe('The seed the game starts from.'),
  players: z.coerce.number().int().min(1).max(8).default(1).describe('How many players.'),
}

export const play = {
  summary: 'Play the game with no screen: give it inputs and a number of ticks, and see where it ends.',
  input: z.object({
    ticks: z.coerce.number().int().min(1).max(1_000_000).optional().describe('How many ticks to play. 60 is a second.'),
    inputs: z.string().optional().describe('The inputs as JSON runs of ticks, or a file in the game holding them.'),
    ...startInput,
  }),
  async run(input: { ticks?: number | undefined; inputs?: string | undefined; seed: number; players: number }, io: Io) {
    const code = await loadCode(io.cwd)
    if (!code.ok) return code
    const runs = readRuns(io.cwd, input.inputs, input.players)
    if (!runs.ok) return runs
    const ticks = input.ticks ?? (runs.value.reduce((sum, [n]) => sum + n, 0) || 60)
    const idle: Inputs = Array.from({ length: input.players }, () => ({ down: [], sticks: {} }))
    const each = runs.value.flatMap(([n, inputs]) => Array.from({ length: n }, () => inputs))
    let state = newState(code.value.game, { players: input.players, seed: input.seed })
    for (let t = 0; t < ticks && state.outcome === null; t += 1) state = step(code.value.game, state, each[t] ?? idle)
    const ended =
      state.outcome === null
        ? `It is still going at tick ${state.tick}.`
        : `It ended in a ${state.outcome} at tick ${state.tick}.`
    io.say(ended)
    io.say(JSON.stringify(state.game))
    return ok({ tick: state.tick, outcome: state.outcome, hash: hashState(state), state })
  },
}
