import type { Theme } from '../formats/formats.ts'

const plain = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

/** What a game with no theme file looks like: the light Soft look with crisp corners. Code, not a content file. */
export const softLook = {
  colours: {
    page: '#f4f6f8',
    words: '#131a22',
    muted: '#4c5866',
    button: '#e2e7ec',
    buttonWords: '#131a22',
    primary: '#131a22',
    primaryWords: '#ffffff',
    line: '#c9d1d9',
    focus: '#2f5bff',
    player: ['#2f5bff', '#c2410c'],
  },
  fonts: {
    title: `'Bricolage Grotesque Variable', ${plain}`,
    main: `'Figtree Variable', ${plain}`,
    plain,
  },
  corners: {
    card: { size: 2.1, steep: 5 },
    button: { size: 1.25, steep: 3.2 },
    small: { size: 0.9, steep: 3.2 },
  },
  outline: 0,
  pixelArt: false,
  playerMarks: ['circle', 'square'],
}

export type Look = typeof softLook

/** An object without its undefined keys, so a key a theme leaves out never wipes out the default. */
const set = <T extends object>(value: T | undefined): { [K in keyof T]?: Exclude<T[K], undefined> } =>
  Object.fromEntries(Object.entries(value ?? {}).filter(([, v]) => v !== undefined)) as never

/** A theme file laid over the Soft look: every key it leaves out stays as it was. */
export function lookOf(theme: Theme | undefined): Look {
  return {
    colours: { ...softLook.colours, ...set(theme?.colours) },
    fonts: { ...softLook.fonts, ...set(theme?.fonts) },
    corners: {
      card: { ...softLook.corners.card, ...set(theme?.corners?.card) },
      button: { ...softLook.corners.button, ...set(theme?.corners?.button) },
      small: { ...softLook.corners.small, ...set(theme?.corners?.small) },
    },
    outline: theme?.outline ?? softLook.outline,
    pixelArt: theme?.pixelArt ?? softLook.pixelArt,
    playerMarks: theme?.playerMarks ?? softLook.playerMarks,
  }
}
