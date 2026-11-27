// Criterion 14: the "move a shape" example is under 15 lines, and it is a real game: it moves.
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { newState, step } from '@automataframework/core'
import { game } from './fixtures/move-a-shape.ts'

test('the move a shape game is under 15 lines', () => {
  const lines = readFileSync(new URL('./fixtures/move-a-shape.ts', import.meta.url), 'utf8')
    .trimEnd()
    .split('\n')
  expect(lines.length).toBeLessThan(15)
})

test('holding right moves the shape right and nothing else', () => {
  let state = newState(game, { players: 1, seed: 1 })
  for (let i = 0; i < 10; i += 1) state = step(game, state, [{ down: [], sticks: { move: [1, 0] } }])
  expect(state.game).toEqual({ x: 40, y: 20 })
})
