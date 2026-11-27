import { Color } from 'pixi.js'

export type Paint = { tint: number; alpha: number }
const cache = new Map<string, Paint>()
const warned = new Set<string>()
// A game that makes its colours up as it goes (a fade, a gradient) must not fill the memory.
const cacheLimit = 1024

/** A CSS colour (a name, `#f80`, `#ff8800`, `rgba(...)`) as a number and an opacity; magenta, with one warning, when it is not one. */
export function paintOf(color: string): Paint {
  const known = cache.get(color)
  if (known) return known
  let paint: Paint
  try {
    const parsed = new Color(color)
    paint = { tint: parsed.toNumber(), alpha: parsed.alpha }
  } catch {
    if (!warned.has(color)) {
      warned.add(color)
      console.warn(`"${color}" is not a colour. Use a name like red, or a code like #ff8800.`)
    }
    paint = { tint: 0xff00ff, alpha: 1 }
  }
  if (cache.size >= cacheLimit) cache.clear()
  cache.set(color, paint)
  return paint
}
