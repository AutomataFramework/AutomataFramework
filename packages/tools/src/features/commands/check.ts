import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Manifest, type Problem, loadGame } from '@automataframework/core'
import { fail, ok } from '../../lib/result.ts'
import { z } from 'zod'
import { themeProblems } from '../check/contrast.ts'
import { skillProblems } from '../check/skills.ts'
import { type Loaded, wordProblems } from '../check/words.ts'
import { type KeyHit, scanFolder } from '../keys/find-keys.ts'
import type { Io } from './registry.ts'

export type Gate = { problems: Problem[]; keys: KeyHit[]; manifest: Manifest | undefined }

/** What stops a game going on a link: a mistake in its files, or a file that looks like it holds a key. */
export async function gate(cwd: string): Promise<Gate> {
  // A game's own files live in its `public/` folder, so they are in the built game too.
  const loaded = await loadGame((path) => readFile(join(cwd, 'public', path), 'utf8'))
  const keys = scanFolder(cwd)
  return loaded.ok
    ? { problems: [], keys, manifest: loaded.value.manifest }
    : {
        problems: loaded.problems.map((p) => ({
          file: `public/${p.file}`,
          line: p.line,
          message: p.message,
          fix: p.fix,
        })),
        keys,
        manifest: undefined,
      }
}

const keyProblem = (k: KeyHit): Problem => ({
  file: k.file,
  line: k.line,
  message: `This looks like ${k.kind}.`,
  fix: 'Take it out of the file and keep it somewhere private.',
})

export const describe = (g: Gate): string[] =>
  [...g.problems, ...g.keys.map(keyProblem)].map((p) => `${p.file}, line ${p.line}: ${p.message} ${p.fix}`)

/** The content files a loaded game lists, with their text, for the checks that name a line. */
const contentFiles = (cwd: string, manifest: Manifest): Loaded[] =>
  manifest.content.map((entry) => {
    const path = `public/${entry.path}`
    const text = readFileSync(join(cwd, path), 'utf8')
    return { path, kind: entry.kind, text, value: JSON.parse(text) as unknown }
  })

export const check = {
  summary: 'Look for mistakes in the game before it goes anywhere.',
  input: z.object({ fix: z.boolean().optional().describe('Put back any skill that was changed or is missing.') }),
  /** Every content file, the theme's contrast, every word in every language, keys, and the skills in step. */
  async run(input: { fix?: boolean | undefined }, io: Io) {
    const g = await gate(io.cwd)
    const files = g.manifest ? contentFiles(io.cwd, g.manifest) : []
    const problems = [
      ...g.problems,
      ...g.keys.map(keyProblem),
      ...files.filter((f) => f.kind === 'theme').flatMap((f) => themeProblems(f.path, f.text, f.value)),
      ...(g.manifest ? wordProblems(io.cwd, g.manifest, files) : []),
      ...skillProblems(io.cwd, input.fix === true, undefined, io.say),
    ]
    if (problems.length > 0) return fail(problems)
    io.say('All good. The game is ready to play.')
    return ok(null)
  },
}
