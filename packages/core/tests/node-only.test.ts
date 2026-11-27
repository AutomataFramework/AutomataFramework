// The main entry runs in plain Node (a game's `update` and a replay in CI need it): it may not reach a browser global,
// PixiJS or Svelte. Checked by reading every file it imports, and by loading it in a real Node.
import { expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const entry = resolve(import.meta.dir, '../src/index.ts')
const forbidden =
  /\b(window|document|navigator|localStorage|sessionStorage|AudioContext|requestAnimationFrame|Gamepad)\b|pixi\.js|svelte/

const withoutComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

/** Every source file reachable from `file` by relative imports and re-exports, and the imports that leave the package. */
export function reach(file: string, seen = new Set<string>()): { files: string[]; packages: string[] } {
  const packages: string[] = []
  const visit = (path: string): void => {
    if (seen.has(path)) return
    seen.add(path)
    for (const match of withoutComments(readFileSync(path, 'utf8')).matchAll(/from\s+'([^']+)'|import\s+'([^']+)'/g)) {
      const target = match[1] ?? match[2] ?? ''
      if (target.startsWith('.')) visit(resolve(dirname(path), target))
      else packages.push(target)
    }
  }
  visit(file)
  return { files: [...seen], packages }
}

test('nothing the main entry reaches names a browser global, PixiJS or Svelte', () => {
  const { files, packages } = reach(entry)
  expect(files.length).toBeGreaterThan(5)
  for (const file of files) {
    expect(existsSync(file)).toBe(true)
    expect([file, withoutComments(readFileSync(file, 'utf8')).match(forbidden)?.[0]]).toEqual([file, undefined])
  }
  expect([...new Set(packages)].toSorted()).toEqual(['zod'])
})

test('the checker does catch a planted browser global', () => {
  expect(forbidden.test('const x = window.innerWidth')).toBe(true)
  expect(forbidden.test("import { Application } from 'pixi.js'")).toBe(true)
  expect(forbidden.test("import 'svelte'")).toBe(true)
  expect(forbidden.test('const x = 1 // in a comment: window')).toBe(true)
  expect(forbidden.test(withoutComments('const x = 1 // in a comment: window'))).toBe(false)
})

test('the main entry loads and plays in plain Node', () => {
  const script = `
    const core = await import(${JSON.stringify(entry)})
    const game = { init: () => ({ n: 0 }), update: (s) => { s.game.n += 1; return s } }
    let state = core.newState(game, { players: 1, seed: 1 })
    state = core.step(game, state, [{ down: [], sticks: {} }])
    core.playSound('x')
    console.log(JSON.stringify({ n: state.game.n, window: typeof window, document: typeof document }))
  `
  const out = execFileSync('node', ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  expect(JSON.parse(out)).toEqual({ n: 1, window: 'undefined', document: 'undefined' })
})
