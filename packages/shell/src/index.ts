// `@automataframework/shell`: the screens around a game, drawn from its content files. Formats may change.
export { startGame } from './features/start/start.ts'
export type { StartOptions } from './features/start/start.ts'
export { creditsSchema, flowSchema, hudSchema, screenSchema, themeSchema } from './features/formats/formats.ts'
export type { Credits, Flow, Hud, Screen, Theme } from './features/formats/formats.ts'
export { softLook } from './features/theme/default.ts'
export type { Settings } from './features/settings/settings.ts'
