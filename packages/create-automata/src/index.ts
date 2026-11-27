import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

/** A folder name made into a game id: small letters, numbers and dashes. */
export const gameId = (folder: string): string =>
  basename(folder)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+|-+$/g, '')

const title = (id: string): string => id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())

// Names npm would drop or treat as its own, so the template keeps them under another name.
const renames: Record<string, string> = { gitignore: '.gitignore', 'workflow-pages.yml': '.github/workflows/pages.yml' }

/** Makes the game in `folder` from the template. Every game's packages are the same version as this one. Throws a plain sentence. */
export function create(folder: string, template: string, version: string): string {
  const id = gameId(folder)
  if (!id) throw new Error('I need a name that starts with a letter, like my-game.')
  if (existsSync(folder) && readdirSync(folder).length > 0)
    throw new Error(`The folder ${basename(folder)} already has things in it. Pick a new name.`)
  mkdirSync(folder, { recursive: true })
  cpSync(template, folder, { recursive: true })
  for (const [from, to] of Object.entries(renames)) {
    if (!existsSync(join(folder, from))) continue
    mkdirSync(join(folder, to, '..'), { recursive: true })
    renameSync(join(folder, from), join(folder, to))
  }
  fill(folder, { __ID__: id, __TITLE__: title(id), __VERSION__: version })
  return id
}

function fill(dir: string, words: Record<string, string>): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) fill(path, words)
    else {
      let text = readFileSync(path, 'utf8')
      for (const [key, value] of Object.entries(words)) text = text.replaceAll(key, value)
      writeFileSync(path, text)
    }
  }
}
