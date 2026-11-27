import type { Problem, Result } from '@automataframework/core'
import { z } from 'zod'
import { check } from './check.ts'
import { content } from './content.ts'
import { link } from './link.ts'
import { play } from './play.ts'
import { record } from './record.ts'
import { replay } from './replay.ts'
import { shot } from './shot.ts'
import { smooth } from './smooth.ts'

/** What a command reaches outside itself: the game's folder, the environment, and where its words go. */
export type Io = { cwd: string; env: Record<string, string | undefined>; say(line: string): void }

/**
 * One thing the tools do. The command line and the MCP server are both built from `commands`, so a tool that is not
 * also a command cannot exist. `run` says its plain words through `io` and returns what it found.
 */
export type Command = {
  name: string
  tool: string
  summary: string
  input: z.ZodObject
  run(input: never, io: Io): Promise<Result<unknown>>
}

/** Keeps each command's input and `run` in step while the list holds them all as one type. */
const command = <I extends z.ZodObject>(c: {
  name: string
  tool: string
  summary: string
  input: I
  run(input: z.infer<I>, io: Io): Promise<Result<unknown>>
}): Command => c

export const commands: Command[] = [
  command({ name: 'check', tool: 'check_game', ...check }),
  command({ name: 'play', tool: 'play_game', ...play }),
  command({ name: 'shot', tool: 'take_screenshot', ...shot }),
  command({ name: 'record', tool: 'record_play', ...record }),
  command({ name: 'replay', tool: 'replay_plays', ...replay }),
  command({ name: 'content', tool: 'list_content', ...content }),
  command({ name: 'smooth', tool: 'check_smoothness', ...smooth }),
  command({ name: 'link', tool: 'make_link', ...link }),
]

/** A mistake as one line a person can act on. */
export const sayProblem = (p: Problem): string =>
  [p.file && `${p.file}, line ${p.line}:`, p.message, p.fix].filter(Boolean).join(' ')

/** `--ticks 120 --fix` as `{ ticks: '120', fix: true }`. Each command's input turns the words into numbers. */
function readFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i += 1) {
    const name = args[i]?.replace(/^--/, '') ?? ''
    const next = args[i + 1]
    if (next === undefined || next.startsWith('--')) flags[name] = true
    else {
      flags[name] = next
      i += 1
    }
  }
  return flags
}

/** Runs one command for a person or a tool. A wrong input is a plain sentence, never a stack trace. */
export async function runCommand(c: Command, raw: unknown, io: Io): Promise<Result<unknown>> {
  const input = c.input.safeParse(raw)
  if (!input.success) {
    const fix = `Try: npm run ${c.name}${c.name === 'check' ? '' : ' -- --help'}`
    return {
      ok: false,
      problems: input.error.issues.map((i) => ({
        file: '',
        line: 0,
        message: `"${i.path.join('.') || 'input'}" is not right: ${i.message}.`,
        fix,
      })),
    }
  }
  return c.run(input.data as never, io)
}

/** The `automata` command line. Exit code 0 when the command found nothing wrong. */
export async function main(args: string[], io: Io): Promise<number> {
  if (args[0] === 'mcp') {
    const { serve } = await import('./mcp.ts')
    await serve(commands)
    return 0
  }
  const c = commands.find((one) => one.name === args[0])
  const rest = args.slice(1)
  if (!c || rest.includes('--help')) {
    const list = c ? [c] : commands
    io.say(['What would you like to do?', ...list.map((one) => `  ${one.name}: ${one.summary}`)].join('\n'))
    if (c)
      for (const [name, field] of Object.entries(c.input.shape)) io.say(`    --${name}: ${field.description ?? ''}`)
    return args.length === 0 || c ? 0 : 1
  }
  const result = await runCommand(c, readFlags(rest), io)
  if (result.ok) return 0
  for (const p of result.problems) io.say(sayProblem(p))
  return 1
}
