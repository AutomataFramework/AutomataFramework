import type { ZodError } from 'zod'
import type { Problem } from '../../lib/result.ts'
import type { Path } from './locate.ts'

export const problem = (file: string, line: number, message: string, fix: string): Problem => ({
  file,
  line,
  message,
  fix,
})

/** Turns what zod found into one plain problem each. */
export function fromZod(file: string, error: ZodError, lineOf: (path: Path) => number): Problem[] {
  return error.issues.map((issue) => {
    const path = issue.path.filter((p): p is string | number => typeof p !== 'symbol')
    const where = path.length === 0 ? 'the file' : `"${path.join('.')}"`
    if (issue.code === 'invalid_type' && issue.input === undefined)
      return problem(file, lineOf(path), `${where} is missing.`, `Add ${where} to ${file}.`)
    return problem(file, lineOf(path), `${where} is not right: ${issue.message}.`, `Change ${where} in ${file}.`)
  })
}
