import { expect, test } from 'bun:test'
import { costliest } from '../../../src/features/commands/smooth.ts'

const sample = (drawMs: number, calls: Record<string, number>) => ({
  fps: 20,
  lowest: 20,
  updateMs: 1,
  drawMs,
  renderMs: 2,
  calls,
})

test('the costliest part is named in plain words, with the draw call made most by its function name', () => {
  expect(costliest([sample(30, { sprite: 20_000, rect: 2 }), sample(34, { sprite: 20_000 })])).toBe(
    "the game's draw calls (32.0 ms a frame, with 20000 drawSprite calls a frame)",
  )
})

test('with no draw calls it names the part alone', () => {
  expect(costliest([{ ...sample(0, {}), updateMs: 9 }])).toBe("the game's update (9.0 ms a frame)")
})
