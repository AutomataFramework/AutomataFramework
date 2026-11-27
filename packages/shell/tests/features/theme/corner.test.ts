import { expect, test } from 'bun:test'
import { allCurved, shapePath, shapePoints, unitCorner } from '../../../src/features/theme/corner.ts'

/** How far the corner's middle point sits from the square's own corner, in a corner scaled to 1 by 1: nearer 0 is squarer. */
const middle = (k: number): number => {
  const points = unitCorner(k)
  const [x, y] = points[Math.floor(points.length / 2)] as [number, number]
  return Math.hypot(1 - x, 1 - y)
}

test('a steepness of 1 is a plain circle, to half a percent', () => {
  // A corner scaled to 1 by 1 starts at (0, 0) going along the side and ends at (1, 1) going along the top: a circle has centre (1, 0).
  const points = unitCorner(1)
  for (const [x, y] of points) expect(Math.abs(Math.hypot(x - 1, y) - 1)).toBeLessThan(0.005)
})

test('a bigger steepness is nearer a square corner, so crisp cards sit outside gentle ones outside a circle', () => {
  const [circle, button, card] = [middle(1), middle(3.2), middle(5)]
  expect(button).toBeGreaterThan(circle)
  expect(card).toBeGreaterThan(button)
})

test('the corner never grows past half the shorter side', () => {
  const points = shapePoints(100, 40, 999, 3.2)
  const ys = points.map(([, y]) => y)
  const xs = points.map(([x]) => x)
  expect(Math.min(...xs)).toBeCloseTo(0, 6)
  expect(Math.max(...xs)).toBeCloseTo(100, 6)
  expect(Math.min(...ys)).toBeCloseTo(0, 6)
  expect(Math.max(...ys)).toBeCloseTo(40, 6)
  // Half of 40 is 20: no point on the left edge strays more than that from a corner of the shape.
  const topEdge = points.filter(([, y]) => y < 1e-6)
  for (const [x] of topEdge) expect(Math.min(x, 100 - x)).toBeLessThanOrEqual(20 + 1e-6)
})

test('a size of 0 is exactly the four corners of a rectangle', () => {
  expect(shapePoints(80, 30, 0, 3.2)).toEqual([
    [0, 0],
    [80, 0],
    [80, 30],
    [0, 30],
  ])
})

test('a sheet curves only its two top corners', () => {
  const points = shapePoints(300, 200, 20, 5, 0, [true, true, false, false])
  expect(points).toContainEqual([300, 200])
  expect(points).toContainEqual([0, 200])
  expect(points.length).toBe(2 * unitCorner(5).length + 2)
})

test('the same inputs give the same path, and a ring grown outward stays outside', () => {
  expect(shapePath(100, 50, 12, 3.2)).toBe(shapePath(100, 50, 12, 3.2))
  const body = shapePoints(100, 50, 12, 3.2, 0, allCurved)
  const ring = shapePoints(100, 50, 12, 3.2, 3, allCurved)
  expect(Math.min(...ring.map(([x]) => x))).toBeCloseTo(-3, 6)
  expect(ring.length).toBe(body.length)
})
