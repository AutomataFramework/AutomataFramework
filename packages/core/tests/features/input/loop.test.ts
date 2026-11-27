import { expect, test } from 'bun:test'
import { type LoopEnv, startLoop } from '../../../src/features/input/loop.ts'

function fakeEnv() {
  let callback: ((time: number) => void) | undefined
  let nextId = 1
  const env: LoopEnv = {
    frame: (cb) => {
      callback = cb
      return nextId++
    },
    cancel: () => {
      callback = undefined
    },
  }
  return {
    env,
    frame: (time: number) => {
      const run = callback
      callback = undefined
      run?.(time)
    },
    waiting: () => callback !== undefined,
  }
}

test('sixty steps a second however fast frames come, and one draw a frame', () => {
  const fake = fakeEnv()
  const calls: string[] = []
  startLoop({ step: () => calls.push('s'), draw: () => calls.push('d'), onError: () => {} }, fake.env)
  fake.frame(0)
  for (let t = 8; t <= 1000; t += 8) fake.frame(t)
  expect(calls.filter((c) => c === 's').length).toBeGreaterThanOrEqual(59)
  expect(calls.filter((c) => c === 's').length).toBeLessThanOrEqual(60)
  expect(calls.filter((c) => c === 'd').length).toBe(126)
})

test('after a long wait (a hidden tab) it does not run a burst of missed steps', () => {
  const fake = fakeEnv()
  let steps = 0
  startLoop({ step: () => steps++, draw: () => {}, onError: () => {} }, fake.env)
  fake.frame(0)
  fake.frame(60_000)
  expect(steps).toBeLessThanOrEqual(6)
})

test('pause stops and resume carries on without catching up', () => {
  const fake = fakeEnv()
  let steps = 0
  const loop = startLoop({ step: () => steps++, draw: () => {}, onError: () => {} }, fake.env)
  fake.frame(0)
  fake.frame(17)
  loop.pause()
  expect(fake.waiting()).toBe(false)
  const before = steps
  loop.resume()
  fake.frame(100_000)
  expect(steps).toBe(before)
  fake.frame(100_017)
  expect(steps).toBe(before + 1)
})

test('an error in a step goes to onError, once, and the loop stops', () => {
  const fake = fakeEnv()
  const errors: unknown[] = []
  startLoop(
    {
      step: () => {
        throw new Error('boom')
      },
      draw: () => {},
      onError: (error) => errors.push(error),
    },
    fake.env,
  )
  fake.frame(0)
  fake.frame(17)
  expect(errors).toHaveLength(1)
  expect(fake.waiting()).toBe(false)
})
