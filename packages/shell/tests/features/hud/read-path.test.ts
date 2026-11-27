import { expect, test } from 'bun:test'
import { readPath } from '../../../src/features/hud/read-path.ts'

test('a path reads a value from the game state as text', () => {
  const state = { game: { score: 12, name: 'x', nested: { a: true } } }
  expect(readPath(state, 'game.score')).toBe('12')
  expect(readPath(state, 'game.nested.a')).toBe('true')
})

test('a missing value, a whole object or a path through nothing is empty text', () => {
  const state = { game: { score: 12, nested: {} } }
  expect(readPath(state, 'game.nope')).toBe('')
  expect(readPath(state, 'game.nested')).toBe('')
  expect(readPath(state, 'game.score.deeper')).toBe('')
  expect(readPath(null, 'game.score')).toBe('')
})
