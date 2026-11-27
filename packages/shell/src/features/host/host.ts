import type { Readable } from 'svelte/store'
import type { Credits, Screen } from '../formats/formats.ts'
import type { Look } from '../theme/default.ts'
import type { SettingName, Settings } from '../settings/settings.ts'

/** One row of the saves list. */
type SaveRow = { slot: string; empty: boolean; savedAt: number }
/** One row of the controls list: what it does, and the key that does it. */
type ControlRow = { id: string; label: string; key: string }

/** Everything a screen's parts need from the game around them. Handed down with Svelte's context under `host`. */
export type Host = {
  /** A word by its message name, in the language now chosen. A new function whenever the language changes. */
  t: Readable<(name: string, inputs?: Record<string, unknown>) => string>
  settings: Readable<Settings>
  set<K extends SettingName>(name: K, value: Settings[K]): void
  send(event: string): void
  hasSave: Readable<boolean>
  languages: string[]
  look: Look
  /** The width of the stage, in px: under 600 the card is a sheet. */
  stageWidth: Readable<number>
  setStageWidth(width: number): void
  /** Keys were used (or, with `false`, a finger or mouse): a screen takes focus only for the keys. */
  noteKeyboard(on?: boolean): void
  saves(): SaveRow[]
  controls(): ControlRow[]
  credits(): Credits | undefined
  assetUrl(id: string): string | undefined
}

/** What the shell shows right now. */
export type View =
  | { kind: 'none' }
  | { kind: 'screen'; screen: Screen; asking?: undefined }
  | { kind: 'ask'; word: string }
  | { kind: 'play' }
