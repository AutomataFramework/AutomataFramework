import { expect, test } from 'bun:test'
import {
  type Game,
  type Inputs,
  hashState,
  isDown,
  newState,
  random,
  recordPlay,
  replayPlay,
  step,
} from '../../../src/index.ts'
import { forAll } from '../../lib/property.ts'

type G = { x: number; dice: number[] }
const game: Game<G> = {
  init: () => ({ x: 0, dice: [] }),
  update(state) {
    if (isDown('right')) state.game.x += 1
    if (isDown('jump')) state.game.dice.push(Math.floor(random(state) * 100))
    return state
  },
}
const none: Inputs = [{ down: [], sticks: {} }]
const right: Inputs = [{ down: ['right'], sticks: {} }]
const jump: Inputs = [{ down: ['right', 'jump'], sticks: {} }]

test('hashState does not care about key order, and tells different states apart', () => {
  const a = newState(game, { players: 1, seed: 1 })
  const b = JSON.parse(JSON.stringify(a))
  b.game = { dice: [], x: 0 }
  expect(hashState(a)).toBe(hashState(b))
  expect(hashState(a)).toMatch(/^[0-9a-f]{16}$/)
  b.game.x = 1
  expect(hashState(a)).not.toBe(hashState(b))
})

test('hashState gives the known FNV-1a value for a known text', () => {
  // FNV-1a 64 of the JSON text `1` (the byte 0x31).
  expect(hashState(1 as never)).toBe('af63ac4c86019afc')
})

test('a recorded play has the plan shape, and repeats are packed into runs', () => {
  const rec = recordPlay(game, { players: 1, seed: 5 }, { game: 'my-game', build: 'abc' })
  for (let i = 0; i < 4; i += 1) rec.push(none)
  for (let i = 0; i < 3; i += 1) rec.push(right)
  const play = rec.finish()
  expect(play).toMatchObject({ format: 1, game: 'my-game', build: 'abc', seed: 5, players: 1 })
  expect(play.runs).toEqual([
    [4, none],
    [3, right],
  ])
  expect(play.end.tick).toBe(7)
})

test('property: replaying a recorded play gives the same hash, ten times', () => {
  forAll((dice) => {
    const seed = dice.int(1_000_000)
    const rec = recordPlay(game, { players: 1, seed })
    let live = newState(game, { players: 1, seed })
    for (let i = dice.int(60); i >= 0; i -= 1) live = rec.push(dice.pick([none, right, jump]))
    const play = rec.finish()
    expect(play.end.hash).toBe(hashState(live))
    for (let n = 0; n < 10; n += 1) {
      const replayed = replayPlay(game, JSON.parse(JSON.stringify(play)))
      expect(replayed.hash).toBe(play.end.hash)
      expect(replayed.same).toBe(true)
    }
  }, 500)
})

test('a play that does not fit the game says same: false', () => {
  const rec = recordPlay(game, { players: 1, seed: 5 })
  rec.push(jump)
  rec.push(jump)
  const play = rec.finish()
  const other: Game<G> = { ...game, update: (state) => state }
  expect(replayPlay(other, play).same).toBe(false)
})

test('a play from a newer format is not replayed', () => {
  const rec = recordPlay(game, { players: 1, seed: 5 })
  rec.push(right)
  const play = { ...rec.finish(), format: 2 }
  expect(replayPlay(game, play as never).same).toBe(false)
})

test('the inputs are copied when pushed, so later changes to them do not change the play', () => {
  const rec = recordPlay(game, { players: 1, seed: 5 })
  const mine: Inputs = [{ down: ['right'], sticks: {} }]
  rec.push(mine)
  mine[0]?.down.push('jump')
  expect(rec.finish().runs).toEqual([[1, right]])
})

test('step and recordPlay agree on the state', () => {
  const rec = recordPlay(game, { players: 1, seed: 3 })
  const live = newState(game, { players: 1, seed: 3 })
  const afterStep = step(game, live, jump)
  expect(hashState(rec.push(jump))).toBe(hashState(afterStep))
})
