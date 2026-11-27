import { expect, test } from 'bun:test'
import { DUEL } from '../../../src/features/palette/duel.ts'
import { toPalette } from '../../../src/features/palette/palette.ts'

// A small seeded random source (mulberry32), so every run tries the same 200 pictures.
function random(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hex = (r: number, g: number, b: number) => [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')

test('DUEL is 256 different colours, each six hex digits', () => {
  expect(DUEL).toHaveLength(256)
  expect(new Set(DUEL).size).toBe(256)
  for (const c of DUEL) expect(c).toMatch(/^[0-9a-f]{6}$/)
})

test('property: over 200 seeded pictures, the palette step leaves only DUEL colours, fully solid or fully clear', () => {
  const duel = new Set(DUEL)
  const next = random(20261127)
  for (let n = 0; n < 200; n++) {
    const width = 1 + Math.floor(next() * 40)
    const height = 1 + Math.floor(next() * 40)
    const rgba = Uint8Array.from({ length: width * height * 4 }, () => Math.floor(next() * 256))
    const out = toPalette({ width, height, rgba })
    expect([out.width, out.height]).toEqual([width, height])
    for (let i = 0; i < out.rgba.length; i += 4) {
      const [r = 0, g = 0, b = 0, a = 0] = out.rgba.subarray(i, i + 4)
      if (a === 0) expect([r, g, b]).toEqual([0, 0, 0])
      else {
        expect(a).toBe(255)
        expect(duel.has(hex(r, g, b))).toBe(true)
      }
      // Solid stays solid and clear stays clear.
      expect(a === 255).toBe((rgba[i + 3] ?? 0) >= 128)
    }
  }
})

test('a colour already in DUEL keeps its exact value', () => {
  const rgba = new Uint8Array(DUEL.length * 4)
  DUEL.forEach((c, i) => rgba.set([...[0, 2, 4].map((k) => Number.parseInt(c.slice(k, k + 2), 16)), 255], i * 4))
  expect(toPalette({ width: DUEL.length, height: 1, rgba }).rgba).toEqual(rgba)
})
