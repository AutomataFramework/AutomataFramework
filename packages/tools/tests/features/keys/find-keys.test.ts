import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findKeys, scanFolder } from '../../../src/features/keys/find-keys.ts'

// Built in pieces, so this file does not look like a leaked key to a scanner.
const openAi = `sk-${'a1B2'.repeat(8)}`
const github = `ghp_${'x9Y8'.repeat(10)}`
const pem = `-----BEGIN ${'RSA PRIVATE'} KEY-----`

test('an API key, a GitHub token and a private key are found, with their line', () => {
  expect(findKeys(`one\nkey = "${openAi}"\n`)).toEqual([{ line: 2, kind: 'an API key' }])
  expect(findKeys(`${github}`)).toEqual([{ line: 1, kind: 'a GitHub token' }])
  expect(findKeys(`a\nb\n${pem}\nMIIB`)).toEqual([{ line: 3, kind: 'a private key' }])
})

test('a normal long word is not a key', () => {
  expect(findKeys('supercalifragilisticexpialidocious-and-so-on-and-so-forth-forever-and-ever')).toEqual([])
  expect(findKeys('const task-name = "sk-short"')).toEqual([])
})

test('a scan finds keys in a folder but skips what the game keeps off GitHub', () => {
  const root = mkdtempSync(join(tmpdir(), 'keys-'))
  mkdirSync(join(root, 'src'))
  mkdirSync(join(root, 'node_modules'))
  writeFileSync(join(root, 'src/a.ts'), `const k = '${openAi}'\n`)
  writeFileSync(join(root, '.env'), `KEY=${openAi}\n`)
  writeFileSync(join(root, 'node_modules/x.js'), `'${openAi}'`)
  expect(scanFolder(root)).toEqual([{ file: 'src/a.ts', line: 1, kind: 'an API key' }])
})
