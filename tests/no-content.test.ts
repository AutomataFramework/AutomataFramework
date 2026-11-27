// Criterion 13: no generated content and no boilerplate in the packages. Art, sound and font files, and message
// (words) files, do not belong in `packages/`. The exceptions are the shell's own words in English and Spanish, those
// words compiled (`packages/shell/compiled/`), and the shell's test game, whose words are test words.
import { expect, test } from 'bun:test'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const forbidden = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp3|ogg|wav|flac|m4a|aac|opus|mid|ttf|otf|woff2?|eot)$/i
const words = /(^|\/)(messages|locales|i18n|translations)\/|\.(po|xlf|ftl)$/i
const allowed = new Set(['packages/shell/messages/en.json', 'packages/shell/messages/es.json'])
const allowedFolders = ['packages/shell/compiled/', 'packages/shell/tests/fixtures/test-game/']

/** Which of these paths (relative to the repo, with `/`) do not belong in `packages/`. */
export function contentProblems(paths: string[]): string[] {
  return paths.filter(
    (p) => !allowed.has(p) && !allowedFolders.some((f) => p.startsWith(f)) && (forbidden.test(p) || words.test(p)),
  )
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (['node_modules', 'dist'].includes(name)) return []
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

test('no art, sound, font or words file sits under packages/', () => {
  const root = join(import.meta.dir, '..')
  const files = walk(join(root, 'packages')).map((p) => relative(root, p).split('\\').join('/'))
  expect(contentProblems(files)).toEqual([])
})

test('planted files are caught, and the shell words are let through', () => {
  const planted = [
    'packages/core/src/hero.png',
    'packages/2d/sound/jump.ogg',
    'packages/tools/fonts/a.woff2',
    'packages/shell/messages/fr.json',
    'packages/create-automata/template/messages/en.json',
    'packages/shell/messages/en.json',
    'packages/shell/messages/es.json',
    'packages/shell/compiled/messages/en.js',
    'packages/shell/tests/fixtures/test-game/messages/en.json',
    'packages/shell/src/hero.png',
    'packages/core/src/index.ts',
  ]
  expect(contentProblems(planted)).toEqual([...planted.slice(0, 5), 'packages/shell/src/hero.png'])
})
