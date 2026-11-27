import { expect, test } from 'bun:test'
import { playSound } from '../../../src/index.ts'
import { takeSounds } from '../../../src/features/audio/queue.ts'

test('playSound is silent in Node and only queues, with a limit so a long replay cannot fill memory', () => {
  takeSounds()
  playSound('jump')
  playSound('music', { bus: 'music', loop: true, volume: 0.5 })
  expect(takeSounds()).toEqual([
    { id: 'jump', options: {} },
    { id: 'music', options: { bus: 'music', loop: true, volume: 0.5 } },
  ])
  expect(takeSounds()).toEqual([])
  for (let i = 0; i < 10_000; i += 1) playSound('jump')
  expect(takeSounds().length).toBeLessThanOrEqual(256)
})
