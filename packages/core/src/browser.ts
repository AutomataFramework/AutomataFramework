// `@automataframework/core/browser`: the parts that need a browser. The main entry never imports this file.
export { createAudio } from './features/audio/audio.ts'
export { readInputs } from './features/input/read.ts'
export type { InputEnv } from './features/input/read.ts'
export { startLoop } from './features/input/loop.ts'
export type { LoopEnv } from './features/input/loop.ts'
export { browserStore } from './features/saves/store.ts'
