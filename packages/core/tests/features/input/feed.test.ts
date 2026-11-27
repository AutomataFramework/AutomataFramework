import { expect, test } from 'bun:test'
import { createFeed } from '../../../src/features/input/feed.ts'
import type { Inputs } from '../../../src/features/game/game.ts'

const right: Inputs = [{ down: [], sticks: { move: [1, 0] } }]
const left: Inputs = [{ down: ['jump'], sticks: {} }]
const real = (): Inputs => [{ down: ['real'], sticks: {} }]

test('with nothing fed the real inputs pass through', () => {
  expect(createFeed().next(real)).toEqual(real())
})

test('held inputs replace the real ones every tick until they are let go', () => {
  const feed = createFeed()
  feed.hold(right)
  expect([feed.next(real), feed.next(real)]).toEqual([right, right])
  feed.hold(null)
  expect(feed.next(real)).toEqual(real())
})

test('runs play one tick at a time, then the feed lets go', () => {
  const feed = createFeed()
  feed.runs([
    [2, right],
    [1, left],
  ])
  expect(feed.busy()).toBe(true)
  expect([feed.next(real), feed.next(real), feed.next(real), feed.next(real)]).toEqual([right, right, left, real()])
  expect(feed.busy()).toBe(false)
})

test('a run list is copied, so changing it later changes nothing', () => {
  const feed = createFeed()
  const runs: [number, Inputs][] = [[1, right]]
  feed.runs(runs)
  runs[0] = [5, left]
  expect(feed.next(real)).toEqual(right)
})
