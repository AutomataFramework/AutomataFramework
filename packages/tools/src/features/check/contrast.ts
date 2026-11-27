import type { Problem } from '@automataframework/core'

/** `#rgb` or `#rrggbb` as red, green and blue from 0 to 255. Null for anything else. */
function readColour(text: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim())?.[1]
  if (!hex) return null
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  return [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16)) as [number, number, number]
}

const light = ([r, g, b]: [number, number, number]): number => {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

/** The WCAG contrast ratio between two colours, from 1 (the same) to 21 (black on white). */
function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [light(a), light(b)].toSorted((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// Words a person reads, and what they sit on.
const pairs = [
  ['words', 'page'],
  ['button-words', 'button'],
] as const
const needed = 4.5

/** Each pair of theme colours whose words would be hard to read, with the line in the theme file. */
export function themeProblems(file: string, text: string, theme: unknown): Problem[] {
  const colours = (theme as { colours?: Record<string, unknown> }).colours ?? {}
  const lineOf = (key: string): number => {
    const at = text.split('\n').findIndex((line) => line.includes(`"${key}"`))
    return at < 0 ? 1 : at + 1
  }
  return pairs.flatMap(([front, back]) => {
    const [f, b] = [colours[front], colours[back]]
    if (typeof f !== 'string' || typeof b !== 'string') return []
    const [fc, bc] = [readColour(f), readColour(b)]
    if (!fc || !bc) {
      const bad = fc ? back : front
      return [
        {
          file,
          line: lineOf(bad),
          message: `The "${bad}" colour is not a colour I can read.`,
          fix: 'Write it like "#1a2b3c".',
        },
      ]
    }
    const ratio = contrast(fc, bc)
    if (ratio >= needed) return []
    return [
      {
        file,
        line: lineOf(front),
        message: `The "${front}" colour ${f} on the "${back}" colour ${b} is hard to read: ${(Math.floor(ratio * 100) / 100).toFixed(2)} to 1, and it needs ${needed} to 1.`,
        fix: `Make one of them lighter or darker.`,
      },
    ]
  })
}
