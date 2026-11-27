import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWords } from '../../../src/features/words/words.ts'
import * as shell from '../../../compiled/messages.js'
import { compileWords } from '../../../scripts/compile-words.ts'

const root = join(import.meta.dir, '../../..')
const content = join(root, 'tests/fixtures/test-game/public/content')

/** Every word a screen, hud or flow file asks for, by message name. */
function wordsAsked(): string[] {
  const found = new Set<string>()
  const walk = (value: unknown, key = ''): void => {
    if (typeof value === 'string' && ['title', 'above', 'label', 'words', 'ask'].includes(key)) {
      found.add(value)
      if (key === 'ask') for (const extra of ['Body', 'Yes']) found.add(`${value}${extra}`)
    } else if (Array.isArray(value)) for (const v of value) walk(v, key === 'levels' ? 'label' : key)
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const name of readdirSync(content).filter(
    (f) => f.endsWith('.json') && f !== 'level.json' && f !== 'controls.json',
  )) {
    walk(JSON.parse(readFileSync(join(content, name), 'utf8')))
  }
  return [...found].toSorted()
}

// Words that are the same in Spanish as in English.
const alike = new Set(['textNormal', 'contrastNormal', 'motionNormal'])

test('Spanish changes every word on every screen of the test game', async () => {
  const out = mkdtempSync(join(tmpdir(), 'shell-words-'))
  try {
    const { compile } = await import('@inlang/paraglide-js')
    await compile({
      project: join(root, 'tests/fixtures/test-game/project.inlang'),
      outdir: out,
      outputStructure: 'locale-modules',
      strategy: ['globalVariable', 'baseLocale'],
    })
    const game = (await import(`${out}/messages.js`)) as Record<string, unknown>
    const language = { value: 'en' }
    const words = createWords({ game, shell }, () => language.value)
    const asked = wordsAsked()
    expect(asked.length).toBeGreaterThan(30)
    const missing = asked.filter((name) => !words.has(name))
    expect(missing).toEqual([])
    const same: string[] = []
    for (const name of asked) {
      language.value = 'en'
      const english = words.word(name, { number: 1 })
      language.value = 'es'
      if (words.word(name, { number: 1 }) === english && !alike.has(name)) same.push(name)
    }
    expect(same).toEqual([])
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
})

test('a word with no Spanish shows the English, and a name nobody wrote shows the plain text or the name', () => {
  const only = { hello: (_i?: unknown, o?: { locale?: string }) => (o?.locale === 'es' ? 'hello' : 'hello') }
  const words = createWords({ shell: only, plain: { gameName: 'My Game' } }, () => 'es')
  expect(words.word('hello')).toBe('hello')
  expect(words.word('gameName')).toBe('My Game')
  expect(words.word('nothing')).toBe('nothing')
  expect(words.has('nothing')).toBe(false)
})

test('the compiled shell words are the ones the words files now say', async () => {
  const out = mkdtempSync(join(tmpdir(), 'shell-compiled-'))
  try {
    await compileWords(out)
    for (const file of ['messages/en.js', 'messages/es.js', 'messages.js']) {
      expect(readFileSync(join(root, 'compiled', file), 'utf8')).toBe(readFileSync(join(out, file), 'utf8'))
    }
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
})

test('review focus 5: a word missing in Spanish shows the English one, never a blank or a key', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'shell-missing-'))
  try {
    mkdirSync(join(dir, 'project.inlang'))
    mkdirSync(join(dir, 'messages'))
    writeFileSync(
      join(dir, 'project.inlang/settings.json'),
      JSON.stringify({
        baseLocale: 'en',
        locales: ['en', 'es'],
        modules: [join(root, 'node_modules/@inlang/plugin-message-format/dist/index.js')],
        'plugin.inlang.messageFormat': { pathPattern: './messages/{locale}.json' },
      }),
    )
    writeFileSync(join(dir, 'messages/en.json'), JSON.stringify({ hello: 'Hello', bye: 'Bye' }))
    writeFileSync(join(dir, 'messages/es.json'), JSON.stringify({ bye: 'Adiós' }))
    const { compile } = await import('@inlang/paraglide-js')
    await compile({
      project: join(dir, 'project.inlang'),
      outdir: join(dir, 'out'),
      outputStructure: 'locale-modules',
      strategy: ['globalVariable', 'baseLocale'],
    })
    const game = (await import(`${dir}/out/messages.js`)) as Record<string, unknown>
    const words = createWords({ game, shell }, () => 'es')
    expect(words.word('bye')).toBe('Adiós')
    expect(words.word('hello')).toBe('Hello')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
