// Opt-in and build time only: turns AI-made pictures into clean DUEL-palette pixel art. A game never loads this,
// which matters because this package is GPL-3.0-or-later (its unfake.js core includes libimagequant).
export { clean, UNFAKE } from './features/clean/clean.ts'
export { DUEL, DUEL_SOURCE } from './features/palette/duel.ts'
export { toPalette, type Picture } from './features/palette/palette.ts'
export { type Sidecar, sidecarProblems } from './features/sidecar/sidecar.ts'
export { MONTH_CAP, monthSpend, type LedgerLine } from './features/make/ledger.ts'
export { MODELS } from './features/make/models.ts'
export { type Brief, makeArt, reviewArt } from './features/make/make.ts'
