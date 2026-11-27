import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Manifest, Problem } from '@automataframework/core'

/** A content file's text and its checked value, by its path under `public/`. */
export type Loaded = { path: string; kind: string; text: string; value: unknown }

// The fields of the shell's screen, HUD, flow and credits files that name a word.
const wordFields = new Set(['label', 'title', 'words', 'ask', 'role'])
const wordKinds = new Set(['screen', 'hud', 'flow', 'credits'])

function namedWords(value: unknown, found: Set<string>): Set<string> {
  if (Array.isArray(value)) for (const item of value) namedWords(item, found)
  else if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value)) {
      if (wordFields.has(key) && typeof item === 'string') found.add(item)
      else namedWords(item, found)
    }
  return found
}

const lineOf = (text: string, word: string): number => {
  const at = text.split('\n').findIndex((line) => line.includes(`"${word}"`))
  return at < 0 ? 1 : at + 1
}

/**
 * Every word in every language. The first language in `automata.json` is the one the others follow: a word missing
 * from another language, or a screen that names a word nobody wrote, is a problem naming the file and the word.
 */
export function wordProblems(cwd: string, manifest: Manifest, files: Loaded[]): Problem[] {
  const named = files.filter((f) => wordKinds.has(f.kind))
  const folder = join(cwd, 'messages')
  if (!existsSync(folder) && named.every((f) => namedWords(f.value, new Set()).size === 0)) return []
  const problems: Problem[] = []
  const words = new Map<string, Record<string, unknown>>()
  for (const language of manifest.languages) {
    const file = `messages/${language}.json`
    try {
      words.set(language, JSON.parse(readFileSync(join(cwd, file), 'utf8')) as Record<string, unknown>)
    } catch {
      problems.push({
        file,
        line: 1,
        message: `The words for "${language}" are missing or are not plain JSON.`,
        fix: `Make ${file} hold every word, like { "play": "Play" }.`,
      })
    }
  }
  const [first, ...others] = manifest.languages
  const base = words.get(first ?? '') ?? {}
  const keys = Object.keys(base).filter((key) => !key.startsWith('$'))
  for (const language of others) {
    const theirs = words.get(language)
    if (!theirs) continue
    for (const key of keys)
      if (typeof theirs[key] !== 'string' || theirs[key] === '')
        problems.push({
          file: `messages/${language}.json`,
          line: 1,
          message: `The word "${key}" is missing.`,
          fix: `Add "${key}" to messages/${language}.json, saying what messages/${first}.json says.`,
        })
  }
  if (words.has(first ?? ''))
    for (const f of named)
      for (const word of namedWords(f.value, new Set()))
        if (!(word in base))
          problems.push({
            file: f.path,
            line: lineOf(f.text, word),
            message: `It names the word "${word}", which is not in messages/${first}.json.`,
            fix: `Add "${word}" to messages/${first}.json and every other language, or use a word that is there.`,
          })
  return problems
}
