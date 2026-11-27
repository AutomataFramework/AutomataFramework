import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Problem } from '@automataframework/core'

/** The skills that come with this copy of the tools, the same place from `src/` and from `dist/`. */
const ourSkills = fileURLToPath(new URL('../../../skills/', import.meta.url))

// Where agents look for skills: the open format's folder, and Claude Code's.
const places = ['.agents/skills', '.claude/skills']

const filesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesIn(path) : [path]
  })

/**
 * The game's skills must be the ones its tools came with, so an agent never follows old or hand-changed steps.
 * With `fix`, each one that is missing or changed is put back, and is not a problem.
 */
export function skillProblems(cwd: string, fix: boolean, source = ourSkills, say: (line: string) => void = () => {}) {
  if (!existsSync(source)) return []
  const problems: Problem[] = []
  for (const file of filesIn(source)) {
    const name = relative(source, file)
    const want = readFileSync(file)
    for (const place of places) {
      const path = join(cwd, place, name)
      const shown = `${place}/${name.split('\\').join('/')}`
      if (existsSync(path) && readFileSync(path).equals(want)) continue
      if (fix) {
        mkdirSync(dirname(path), { recursive: true })
        cpSync(file, path)
        say(`Put back ${shown}.`)
        continue
      }
      problems.push({
        file: shown,
        line: 1,
        message: existsSync(path)
          ? 'This skill was changed by hand, so it is not the one the tools came with.'
          : 'This skill is missing.',
        fix: 'Run npm run check -- --fix to put it back.',
      })
    }
  }
  return problems
}
