import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export type KeyHit = { file: string; line: number; kind: string }

const patterns: [string, RegExp][] = [
  ['an API key', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['a GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['an AWS key', /\bAKIA[0-9A-Z]{16}\b/],
]

/** Where in some text a key, token or private key sits. Never returns the secret itself. */
export function findKeys(text: string): { line: number; kind: string }[] {
  return text.split('\n').flatMap((content, index) => {
    const hit = patterns.find(([, pattern]) => pattern.test(content))
    return hit ? [{ line: index + 1, kind: hit[0] }] : []
  })
}

// The game's own ignore file keeps these out of GitHub, so the scan leaves them alone too.
const skipped = (name: string): boolean =>
  ['node_modules', '.git', 'dist'].includes(name) || name.startsWith('.env') || /\.(pem|key)$/.test(name)

/** Every key-looking line in the files a game would put on GitHub. */
export function scanFolder(root: string, dir = root): KeyHit[] {
  return readdirSync(dir).flatMap((name) => {
    if (skipped(name)) return []
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return scanFolder(root, path)
    if (statSync(path).size > 2_000_000) return []
    const text = readFileSync(path, 'utf8')
    if (text.includes('\u0000')) return []
    return findKeys(text).map((hit) => ({ file: relative(root, path), line: hit.line, kind: hit.kind }))
  })
}
