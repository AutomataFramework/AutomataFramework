import { expect, test } from 'bun:test'
import { fitScale } from '../../../src/features/renderer/fit.ts'

test('a game scales up to fit the window and keeps its shape', () => {
  expect(fitScale(960, 540, 320, 180, false)).toBe(3)
  expect(fitScale(1000, 540, 320, 180, false)).toBe(3)
  expect(fitScale(1000, 800, 320, 180, false)).toBeCloseTo(3.125, 5)
  expect(fitScale(390, 844, 320, 180, false)).toBeCloseTo(390 / 320, 5)
})

test('pixel art scales by whole numbers only, rounding down', () => {
  expect(fitScale(1000, 800, 320, 180, true)).toBe(3)
  expect(fitScale(390, 844, 320, 180, true)).toBe(1)
  expect(fitScale(1440, 810, 320, 180, true)).toBe(4)
})

test('a window smaller than the game still shows it, shrunk, and never at nothing', () => {
  expect(fitScale(160, 90, 320, 180, false)).toBe(0.5)
  expect(fitScale(160, 90, 320, 180, true)).toBe(1)
  expect(fitScale(0, 0, 320, 180, false)).toBeGreaterThan(0)
})
