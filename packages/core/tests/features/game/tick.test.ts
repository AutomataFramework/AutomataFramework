import { expect, test } from 'bun:test'
import { type Game, type State, isDown, newState, random, step, wasPressed, win } from '../../../src/index.ts'

type G = { x: number; pressed: number[]; rolls: number[] }
const game: Game<G> = {
  init: () => ({ x: 0, pressed: [], rolls: [] }),
  update(state: State<G>) {
    if (isDown('right')) state.game.x += 1
    if (wasPressed('right')) state.game.pressed.push(state.tick)
    state.game.rolls.push(random(state))
    if (state.game.x >= 3) win(state)
    return state
  },
}
const right = [{ down: ['right'], sticks: {} }]
const none = [{ down: [], sticks: {} }]

function play(inputs: (typeof right)[]) {
  let state = newState(game, { players: 1, seed: 7 })
  for (const input of inputs) state = step(game, state, input)
  return state
}

test('the same inputs and seed give the same state', () => {
  expect(play([right, none, right])).toEqual(play([right, none, right]))
})

test('a different seed gives different dice', () => {
  const other = step(game, newState(game, { players: 1, seed: 8 }), right)
  expect(other.game.rolls).not.toEqual(play([right]).game.rolls)
})

test('wasPressed is true for one tick of a held key', () => {
  expect(play([right, right, none, right]).game.pressed).toEqual([0, 3])
})

test('a win freezes the game', () => {
  const state = play([right, right, right, right, right])
  expect(state.outcome).toBe('win')
  expect(state.tick).toBe(3)
})

test('the state holds a list of players and a place for physics', () => {
  const state = newState(game, { players: 2, seed: 1 })
  expect(state.players).toEqual([{ id: 0 }, { id: 1 }])
  expect(state.physics).toBeNull()
})
