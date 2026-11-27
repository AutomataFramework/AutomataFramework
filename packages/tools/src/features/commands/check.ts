import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type Manifest, type Problem, loadGame } from '@automataframework/core'
import { type KeyHit, scanFolder } from '../keys/find-keys.ts'
import type { Ctx } from './registry.ts'

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

export const describe = (g: Gate): string[] => [
  ...g.problems.map((p) => `${p.file}, line ${p.line}: ${p.message} ${p.fix}`),
  ...g.keys.map(
    (k) =>
      `${k.file}, line ${k.line}: this looks like ${k.kind}. Take it out of the file and keep it somewhere private.`,
  ),
]

/** Checks the game in the current folder. Prints each mistake in plain words. Exit code 0 when there are none. */
export async function check(ctx: Ctx): Promise<number> {
  const g = await gate(ctx.cwd)
  const lines = describe(g)
  if (lines.length === 0) {
    ctx.say('All good. The game is ready to play.')
    return 0
  }
  for (const line of lines) ctx.say(line)
  return 1
}
