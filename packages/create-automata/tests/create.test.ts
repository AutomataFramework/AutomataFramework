import { expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { create, gameId } from '../src/index.ts'

const template = join(import.meta.dir, '../template')
const fresh = (): string => mkdtempSync(join(tmpdir(), 'create-'))

test('a folder name becomes a game id', () => {
  expect(gameId('/x/My Game!')).toBe('my-game')
  expect(gameId('123')).toBe('')
})

test('it makes a game with its name and the packages at its own version', () => {
  const folder = join(fresh(), 'My-Game')
  expect(create(folder, template, '0.0.1-preview.7.sha-abc1234')).toBe('my-game')
  const manifest = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'))
  expect(manifest.name).toBe('my-game')
  expect(manifest.dependencies['@automataframework/core']).toBe('0.0.1-preview.7.sha-abc1234')
  expect(JSON.parse(readFileSync(join(folder, 'public/automata.json'), 'utf8')).name).toBe('My game')
  expect(existsSync(join(folder, '.gitignore'))).toBe(true)
  expect(existsSync(join(folder, '.github/workflows/pages.yml'))).toBe(true)
  expect(readFileSync(join(folder, 'src/game.ts'), 'utf8').split('\n').length).toBeLessThan(40)
})

test('it never writes over a folder that has things in it', () => {
  const folder = fresh()
  writeFileSync(join(folder, 'mine.txt'), 'keep')
  expect(() => create(folder, template, '1.0.0')).toThrow('already has things in it')
  expect(() => create(join(fresh(), '99'), template, '1.0.0')).toThrow('starts with a letter')
  mkdirSync(join(folder, 'x'), { recursive: true })
})
