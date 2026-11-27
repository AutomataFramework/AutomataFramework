import { DUEL } from './duel.ts'

/** A picture as its size and its pixels, four bytes (red, green, blue, alpha) each. */
export type Picture = { width: number; height: number; rgba: Uint8Array }

/** Below this alpha a pixel is see-through; at or above it, solid. Pixel art has no half-clear pixels. */
const SOLID = 128

const rgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(0, 2), 16),
  Number.parseInt(hex.slice(2, 4), 16),
  Number.parseInt(hex.slice(4, 6), 16),
]

// "Redmean" distance: close to how people see colour, and cheap.
function distance(a: readonly number[], b: readonly number[]): number {
  const r = ((a[0] ?? 0) + (b[0] ?? 0)) / 2
  const dr = (a[0] ?? 0) - (b[0] ?? 0)
  const dg = (a[1] ?? 0) - (b[1] ?? 0)
  const db = (a[2] ?? 0) - (b[2] ?? 0)
  return (2 + r / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r) / 256) * db * db
}

/** Each pixel becomes the nearest palette colour, fully solid, or fully clear (all zeros). */
export function toPalette(picture: Picture, palette: readonly string[] = DUEL): Picture {
  const colours = palette.map(rgb)
  const nearest = new Map<number, [number, number, number]>()
  const out = new Uint8Array(picture.rgba.length)
  for (let i = 0; i < picture.rgba.length; i += 4) {
    if ((picture.rgba[i + 3] ?? 0) < SOLID) continue
    const px = [picture.rgba[i] ?? 0, picture.rgba[i + 1] ?? 0, picture.rgba[i + 2] ?? 0]
    const key = (px[0]! << 16) | (px[1]! << 8) | px[2]!
    let best = nearest.get(key)
    if (!best) {
      best = colours.reduce((a, b) => (distance(px, b) < distance(px, a) ? b : a))
      nearest.set(key, best)
    }
    out.set([...best, 255], i)
  }
  return { width: picture.width, height: picture.height, rgba: out }
}
