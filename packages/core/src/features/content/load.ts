import { type Problem, type Result, fail, ok } from '../../lib/result.ts'
import { kindSchema } from './kinds.ts'
import { parseJson } from './locate.ts'
import { type Manifest, envelopeSchema, manifestSchema } from './manifest.ts'
import { fromZod, problem } from './problems.ts'

export type Read = (path: string) => Promise<string>
export type Content = { manifest: Manifest; files: Record<string, unknown> }

let loaded: Content | undefined

/** Reads and checks one JSON file. */
async function readJson(
  read: Read,
  file: string,
  listedAt?: { file: string; line: number },
): Promise<Result<{ value: unknown; lineOf: (p: (string | number)[]) => number }>> {
  let text: string
  try {
    text = await read(file)
  } catch {
    return fail([
      problem(
        listedAt?.file ?? file,
        listedAt?.line ?? 1,
        `${file} is not there.`,
        `Put ${file} in the game's folder, or take it out of automata.json.`,
      ),
    ])
  }
  const parsed = parseJson(text)
  if (!parsed.ok) return fail([problem(file, parsed.line, `${parsed.message}.`, `Fix line ${parsed.line} of ${file}.`)])
  return ok(parsed)
}

/** Reads `automata.json`, then every file it lists. A file it does not list is never read. */
export async function loadGame(read: Read): Promise<Result<Content>> {
  const top = await readJson(read, 'automata.json')
  if (!top.ok) return top
  const m = manifestSchema.safeParse(top.value.value)
  if (!m.success) return fail(fromZod('automata.json', m.error, top.value.lineOf))
  const manifest = m.data
  const problems: Problem[] = []
  const files: Record<string, unknown> = {}
  const seen = new Set<string>()
  for (const [index, entry] of manifest.content.entries()) {
    if (seen.has(entry.id)) {
      problems.push(
        problem(
          'automata.json',
          top.value.lineOf(['content', index, 'id']),
          `The id "${entry.id}" is used twice.`,
          'Give each file its own id.',
        ),
      )
      continue
    }
    seen.add(entry.id)
    // oxlint-disable-next-line no-await-in-loop -- one file after another keeps the problems in file order
    const file = await readJson(read, entry.path, {
      file: 'automata.json',
      line: top.value.lineOf(['content', index, 'path']),
    })
    if (!file.ok) {
      problems.push(...file.problems)
      continue
    }
    const envelope = envelopeSchema.safeParse(file.value.value)
    if (!envelope.success) {
      problems.push(...fromZod(entry.path, envelope.error, file.value.lineOf))
      continue
    }
    if (envelope.data.id !== entry.id || envelope.data.kind !== entry.kind) {
      problems.push(
        problem(
          entry.path,
          file.value.lineOf(['id']),
          `${entry.path} says it is "${envelope.data.kind}" "${envelope.data.id}", but automata.json lists it as "${entry.kind}" "${entry.id}".`,
          `Make the "id" and "kind" in ${entry.path} the same as in automata.json.`,
        ),
      )
      continue
    }
    const schema = kindSchema(entry.kind)
    const checked = schema?.safeParse(file.value.value)
    if (checked && !checked.success) {
      problems.push(...fromZod(entry.path, checked.error, file.value.lineOf))
      continue
    }
    files[entry.id] = checked ? checked.data : file.value.value
  }
  if (problems.length > 0) return fail(problems)
  loaded = { manifest, files }
  return ok(loaded)
}

/** A loaded content file by its id. */
export function content<T>(id: string): T {
  if (!loaded || !(id in loaded.files))
    throw new Error(`No content file "${id}" is loaded. Is it listed in automata.json?`)
  return loaded.files[id] as T
}
