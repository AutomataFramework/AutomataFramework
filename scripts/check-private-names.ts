// Fails when a private name appears in this public repo: in a file (its words or its path), in a commit message, in
// the pull request's title or description, or in a prompt given to an agent. The names are read from the
// `PRIVATE_NAMES` secret (separated by commas) and are never printed: GitHub hides each one in the log, and a
// finding says only where it is.
//
// A name is matched in lower case with everything but letters and digits taken out, of both the name and the text,
// so "Some Name", "some-name", "some_name" and "SomeName" are all caught.
//
// Usage: node scripts/check-private-names.ts [--prompt <file>]...
//   With no `--prompt`, it reads every file git tracks and every commit message reachable from HEAD, plus the pull
//   request's PR_TITLE and PR_BODY when they are set. With `--prompt`, it reads only those files.
// Every run first plants each name in a made-up file, commit message and prompt and checks that it is caught, so a
// broken matcher or an empty secret fails instead of passing.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Lower case, with everything but letters and digits taken out. */
export const squash = (text: string): string => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** The names from the secret, squashed, with blanks dropped. Names under 4 letters are refused: they would match too much. */
export function parseNames(secret: string | undefined): string[] {
  const names = (secret ?? '')
    .split(/[,\n]/)
    .map(squash)
    .filter((name) => name !== '')
  if (names.length === 0) {
    throw new Error(
      'PRIVATE_NAMES is empty or not set, so nothing can be checked. A pull request from a fork never gets it, so this ' +
        'check cannot pass there: a maintainer will bring your change into a branch of this repo, where it can.',
    )
  }
  const short = names.filter((name) => name.length < 4).length
  if (short > 0) throw new Error(`${short} of the names in PRIVATE_NAMES are under 4 letters: write each one in full.`)
  return [...new Set(names)]
}

/** One place a name was found. It never holds the name. */
export interface Finding {
  where: string
}

/** Whether any name is in `text`, each line on its own and the whole text run together. */
export function lineHits(text: string, names: readonly string[]): number[] {
  const lines = text.split('\n')
  const hits: number[] = []
  lines.forEach((line, i) => {
    const flat = squash(line)
    if (names.some((name) => flat.includes(name))) hits.push(i + 1)
  })
  // A name split across two lines ("Some" at the end of one, "Name" at the start of the next).
  if (hits.length === 0 && names.some((name) => squash(text).includes(name))) hits.push(0)
  return hits
}

/**
 * A path as it may be printed: every part of it that holds a name becomes `[hidden]`, and a name that runs across
 * parts hides the whole path. GitHub hides only the exact text of each masked name, so a path is never printed as
 * written when it holds one.
 */
export function hidePath(path: string, names: readonly string[]): string {
  const has = (text: string): boolean => names.some((name) => squash(text).includes(name))
  if (!has(path)) return path
  const parts = path.split('/').map((part) => (has(part) ? '[hidden]' : part))
  const shown = parts.join('/')
  // A copy of a name may still run across parts that were left alone ("some/name/some-name").
  return parts.includes('[hidden]') && !has(shown.replaceAll('[hidden]', '/')) ? shown : '[a hidden path]'
}

/** Where the names are in one piece of text, named `where`. */
export function scanText(where: string, text: string, names: readonly string[]): Finding[] {
  return lineHits(text, names).map((line) => ({
    where: line === 0 ? `${where} (across lines)` : `${where}, line ${line}`,
  }))
}

/** The made-up file, commit message and prompt for one name, each of which must be caught. */
export function selfTest(names: readonly string[]): boolean {
  return names.every((name) => {
    const planted = [
      `export const title = '${name.toUpperCase()}'\n`,
      `Add the first room\n\nIt is the ${name} room.`,
      `Make a small game called ${name.split('').join(' ')}.`,
    ]
    return planted.every((text) => scanText('planted', text, [name]).length > 0)
  })
}

const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 })

/** Every file git tracks, by path and words. Binary files are checked by path only. */
function scanFiles(names: readonly string[]): Finding[] {
  const findings: Finding[] = []
  for (const path of git('ls-files', '-z').split('\0').filter(Boolean)) {
    const shown = hidePath(path, names)
    if (shown !== path) findings.push({ where: `the path ${shown}` })
    const bytes = readFileSync(path)
    if (bytes.includes(0)) continue
    findings.push(...scanText(`the file ${shown}`, bytes.toString('utf8'), names))
  }
  return findings
}

/** Every commit message reachable from HEAD. */
function scanCommits(names: readonly string[]): Finding[] {
  const findings: Finding[] = []
  for (const entry of git('log', '--format=%H%x00%B%x01').split('\x01')) {
    const [sha, message] = entry.trim().split('\0')
    if (sha === undefined || message === undefined) continue
    findings.push(...scanText(`the message of commit ${sha.slice(0, 7)}`, message, names))
  }
  return findings
}

function main(): void {
  const names = parseNames(process.env.PRIVATE_NAMES)
  for (const name of names) console.log(`::add-mask::${name}`)
  if (!selfTest(names)) throw new Error('The check missed a planted name, so it cannot be trusted.')
  console.log(`Checked ${names.length} names: each was caught in a planted file, commit message and prompt.`)

  const args = process.argv.slice(2)
  const prompts = args.flatMap((arg, i) => (args[i - 1] === '--prompt' ? [arg] : []))
  const findings: Finding[] = []
  if (prompts.length > 0) {
    for (const file of prompts) {
      findings.push(...scanText(`the prompt ${hidePath(file, names)}`, readFileSync(file, 'utf8'), names))
    }
  } else {
    findings.push(...scanFiles(names), ...scanCommits(names))
    const { PR_TITLE, PR_BODY } = process.env
    if (PR_TITLE !== undefined) findings.push(...scanText('the pull request title', PR_TITLE, names))
    if (PR_BODY !== undefined) findings.push(...scanText('the pull request description', PR_BODY, names))
  }
  if (findings.length === 0) {
    console.log(
      prompts.length > 0 ? 'No private name in the prompts.' : 'No private name in the files, commits or pull request.',
    )
    return
  }
  console.error('A private name is in this public repo. Take it out before this can go in:')
  for (const finding of findings) console.error(`  - ${finding.where}`)
  console.error('A name in a commit message needs that commit rewritten before it is pushed anywhere public.')
  process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
