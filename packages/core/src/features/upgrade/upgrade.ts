import { type Result, fail, ok } from '../../lib/result.ts'
import { problem } from '../content/problems.ts'

type Step = (old: unknown) => unknown

const steps = new Map<string, Map<number, Step>>()

/** The newest format of a kind: one past its last step, or 1 when it has none. */
const newest = (kind: string): number => Math.max(1, ...[...(steps.get(kind)?.keys() ?? [])].map((from) => from + 1))

/** Teaches `upgrade` how to turn a file of `kind` at format `from` into format `from + 1`. */
export function addUpgrade(kind: string, from: number, up: Step): void {
  const forKind = steps.get(kind) ?? new Map<number, Step>()
  forKind.set(from, up)
  steps.set(kind, forKind)
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Runs every step from the file's format to the newest. Upgrading a file that is already newest changes nothing. */
export function upgrade(kind: string, file: unknown): Result<unknown> {
  const where = `a ${kind} file`
  if (!isObject(file) || typeof file.format !== 'number' || !Number.isInteger(file.format) || file.format < 0)
    return fail([
      problem(where, 1, `This is not a ${kind} file: it has no format number.`, `Use a file this game made.`),
    ])
  const last = newest(kind)
  if (file.format > last)
    return fail([
      problem(
        where,
        1,
        `This ${kind} file is from a newer version (format ${file.format}) than this game knows (format ${last}).`,
        'Update the game, then try again.',
      ),
    ])
  let current: unknown = file
  for (let format = file.format; format < last; format += 1) {
    const step = steps.get(kind)?.get(format)
    if (!step)
      return fail([
        problem(
          where,
          1,
          `This ${kind} file is at format ${file.format} and there is no way to bring format ${format} up to ${format + 1}.`,
          'Use a newer file, or ask for the missing step to be added.',
        ),
      ])
    const next = step(current)
    current = isObject(next) ? { ...next, format: format + 1 } : next
  }
  return ok(current)
}
