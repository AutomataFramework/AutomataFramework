import { expect, test } from '@playwright/test'
import { encodePng } from '../../../src/lib/png.ts'
import { clean } from '../../../src/features/clean/clean.ts'

// A 16 by 16 picture in four colours, blown up 8 times with a little noise, the way an AI model draws pixel art.
const COLOURS = [
  [32, 48, 64],
  [224, 64, 80],
  [240, 208, 128],
  [64, 160, 96],
]

function blownUp(): { png: Uint8Array; cells: number[] } {
  const cells = Array.from({ length: 256 }, (_, i) => (i * 7 + (((i >> 4) * (i & 15)) % 3)) % 4)
  const rgba = new Uint8Array(128 * 128 * 4)
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const c = COLOURS[cells[(y >> 3) * 16 + (x >> 3)] ?? 0] ?? [0, 0, 0]
      const noise = ((x * 13 + y * 7) % 5) - 2
      rgba.set([c[0]! + noise, c[1]! - noise, c[2]! + noise, 255], (y * 128 + x) * 4)
    }
  return { png: encodePng(128, 128, rgba), cells }
}

test('unfake.js, copied in, runs in Chromium and shrinks a blown-up picture back to its real pixels', async () => {
  const { png, cells } = blownUp()
  const out = await clean(png)
  expect(out.scale).toBe(8)
  expect([out.width, out.height]).toEqual([16, 16])
  // Each pixel is its cell's colour, give or take the noise.
  const wrong = cells.filter((c, i) => {
    const want = COLOURS[c] ?? [0, 0, 0]
    return [0, 1, 2].some((k) => Math.abs((out.rgba[i * 4 + k] ?? 0) - (want[k] ?? 0)) > 3)
  })
  expect(wrong).toEqual([])
})
