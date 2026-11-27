import { beforeEach, expect, test } from 'bun:test'
import { z } from 'zod'
import { content, defineKind, loadGame } from '../../../src/index.ts'

const manifest = (extra: object = {}) =>
  JSON.stringify({
    format: 1,
    id: 'my-game',
    name: 'My game',
    size: [320, 180],
    languages: ['en'],
    start: 'play',
    content: [{ id: 'level', kind: 'level', path: 'content/level.json' }],
    assets: [],
    ...extra,
  })
const level = JSON.stringify({ format: 1, id: 'level', kind: 'level', goal: [10, 10] })

const reader = (files: Record<string, string>) => async (path: string) => {
  const text = files[path]
  if (text === undefined) throw new Error('missing')
  return text
}

beforeEach(() => defineKind('level', z.looseObject({ goal: z.tuple([z.number(), z.number()]) })))

test('a good game loads and its content is found by id', async () => {
  const result = await loadGame(reader({ 'automata.json': manifest(), 'content/level.json': level }))
  expect(result.ok).toBe(true)
  expect(content<{ goal: number[] }>('level').goal).toEqual([10, 10])
})

test('a mistake in a listed file names the file, the line and the fix', async () => {
  const bad = '{\n  "format": 1,\n  "id": "level",\n  "kind": "level",\n  "goal": [10, "far"]\n}'
  const result = await loadGame(reader({ 'automata.json': manifest(), 'content/level.json': bad }))
  if (result.ok) throw new Error('should fail')
  expect(result.problems).toHaveLength(1)
  expect(result.problems[0]).toMatchObject({ file: 'content/level.json', line: 5 })
  expect(result.problems[0]?.fix).toContain('content/level.json')
})

test('a broken file gives the line where it broke', async () => {
  const result = await loadGame(
    reader({ 'automata.json': manifest(), 'content/level.json': '{\n "format": 1,\n "id": }' }),
  )
  expect(result).toMatchObject({ ok: false, problems: [{ file: 'content/level.json', line: 3 }] })
})

test('a listed file that is missing is blamed on its line in automata.json', async () => {
  const result = await loadGame(reader({ 'automata.json': manifest() }))
  expect(result).toMatchObject({ ok: false, problems: [{ file: 'automata.json' }] })
})

test('a file that is not listed is ignored, even if it is broken', async () => {
  const result = await loadGame(
    reader({ 'automata.json': manifest(), 'content/level.json': level, 'content/other.json': '{{{' }),
  )
  expect(result.ok).toBe(true)
})

test('a wrong automata.json says what is missing', async () => {
  const result = await loadGame(reader({ 'automata.json': JSON.stringify({ format: 1 }) }))
  if (result.ok) throw new Error('should fail')
  expect(result.problems.map((p) => p.message).join(' ')).toContain('"name" is missing')
})
