// `@automataframework/2d`: drawing for 2D games. Draw calls are immediate, as in Raylib: call them from `draw` and
// what you called is on the screen that frame. Formats may change.
export { clear, screenSize } from './features/renderer/renderer.ts'
export { openStage } from './features/stage/stage.ts'
export { run } from './features/run/run.ts'
export { drawSprite } from './features/sprites/sprites.ts'
export { drawCircle, drawLine, drawRect } from './features/shapes/shapes.ts'
export { drawText } from './features/text/text.ts'
export { frameStats } from './features/frame-count/frame-count.ts'
export type { FrameStats } from './features/frame-count/frame-count.ts'
