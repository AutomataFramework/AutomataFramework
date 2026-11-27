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

/**
 * The shell's own colours, for a theme that leaves a colour out. They are the same as `softLook.colours` in
 * `/shell` (a test in `/shell` fails if they drift), kept here so the tools need not depend on the shell.
 */
export const softColours: Record<string, string> = {
  page: '#f4f6f8',
  words: '#131a22',
  muted: '#4c5866',
  button: '#e2e7ec',
  buttonWords: '#131a22',
  primary: '#131a22',
  primaryWords: '#ffffff',
  line: '#c9d1d9',
  focus: '#2f5bff',
}

// Words a person reads, and what they sit on: 4.5 to 1. A focus ring is not words: 3 to 1.
const pairs = [
  ['words', 'page', 4.5],
  ['muted', 'page', 4.5],
  ['muted', 'button', 4.5],
  ['buttonWords', 'button', 4.5],
  ['primaryWords', 'primary', 4.5],
  ['focus', 'page', 3],
  ['focus', 'button', 3],
] as const

/** Each pair of theme colours whose words would be hard to read, with the line in the theme file. */
export function themeProblems(file: string, text: string, theme: unknown): Problem[] {
  const colours = (theme as { colours?: Record<string, unknown> }).colours ?? {}
  const lineOf = (key: string): number => {
    const at = text.split('\n').findIndex((line) => line.includes(`"${key}"`))
    return at < 0 ? 1 : at + 1
  }
  const found = pairs.flatMap(([front, back, needed]) => {
    // A pair the theme does not touch is the shell's own, which is fine. One colour set takes the other from the shell.
    if (colours[front] === undefined && colours[back] === undefined) return []
    const [f, b] = [colours[front] ?? softColours[front], colours[back] ?? softColours[back]]
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
  // A colour that cannot be read is in several pairs: say so once.
  return [...new Map(found.map((p) => [p.message, p])).values()]
}
