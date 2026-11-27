import { expect, test } from 'bun:test'
import { createStats } from '../../../src/features/frame-count/frame-count.ts'

/** Plays frames at the given gaps (in ms) on a clock that is only moved here. */
function play(gaps: number[]) {
  let time = 0
  const stats = createStats(() => time)
  for (const gap of gaps) {
    time += gap
    stats.frameDone()
  }
  return stats
}
const steady = (gap: number, seconds: number): number[] =>
  Array.from({ length: Math.round((seconds * 1000) / gap) }, () => gap)

test('before one second has passed there is nothing to report', () => {
  expect(play(steady(10, 0.5)).stats()).toMatchObject({ fps: 0, lowest: 0 })
})

test('fps is the frames in the last whole second', () => {
  expect(play(steady(20, 1.2)).stats().fps).toBe(50)
  expect(play(steady(50, 1.2)).stats().fps).toBe(20)
})

test('lowest is the worst second after the first two seconds of warming up', () => {
  // Two slow seconds first (loading), then 50, then one second of 20, then 50 again.
  const stats = play([...steady(100, 2), ...steady(20, 3), ...steady(50, 1), ...steady(20, 2)])
  expect(stats.stats().fps).toBe(50)
  expect(stats.stats().lowest).toBe(20)
})

test('a stall is counted: one frame after half a minute is a frame rate of 0', () => {
  const stats = play([...steady(20, 3), 30_000])
  expect(stats.stats().fps).toBe(0)
  expect(stats.stats().lowest).toBe(0)
})

test('the time of each part is for the last frame, and calls are counted per frame', () => {
  let time = 0
  const stats = createStats(() => time)
  stats.time('drawMs', 2.5)
  stats.count('rect')
  stats.count('rect')
  stats.frameDone()
  expect(stats.stats().drawMs).toBe(2.5)
  expect(stats.stats().calls).toEqual({ rect: 2 })
  time += 16
  stats.count('line')
  stats.frameDone()
  expect(stats.stats().drawMs).toBe(0)
  expect(stats.stats().calls).toEqual({ line: 1 })
})
