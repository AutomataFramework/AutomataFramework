import { Application, Sprite } from 'pixi.js'
import { frameCounter } from '../frame-count/frame-count.ts'

type Live = {
  app: Application
  width: number
  height: number
  /** Every sprite ever made, in call order. A frame uses the first `used` of them. */
  pool: Sprite[]
  used: number
  /** The most sprites shown since the last `present()`, so that only those are checked and hidden. */
  top: number
  drawStart: number
  frame: number
}
let live: Live | undefined

const started = (): Live => {
  if (!live) throw new Error('Drawing has not started. Games start it with run(game).')
  return live
}

/** Starts PixiJS on `canvas`, which is `width` by `height` of the game's own pixels; showing it bigger is CSS's job. */
export async function startRenderer(options: {
  canvas: HTMLCanvasElement
  width: number
  height: number
  background?: string
}): Promise<void> {
  const app = new Application()
  await app.init({
    canvas: options.canvas,
    width: options.width,
    height: options.height,
    background: options.background ?? '#101820',
    resolution: 1,
    antialias: false,
    autoStart: false,
    preference: 'webgl',
  })
  live = { app, width: options.width, height: options.height, pool: [], used: 0, top: 0, drawStart: 0, frame: 0 }
}

/**
 * How many real screen pixels the canvas draws for each of the game's own. A game shown bigger than its own size, or
 * on a screen with a denser grid, is drawn finer instead of stretched blurry. Steps of a quarter, never under 1 and
 * never over 3, so a slow phone is not asked for too many pixels and a resize does not redo the canvas for nothing.
 */
export function setResolution(wanted: number): void {
  const l = started()
  const resolution = Math.min(3, Math.max(1, Math.round(wanted * 4) / 4))
  if (l.app.renderer.resolution === resolution) return
  l.app.renderer.resize(l.width, l.height, resolution)
}

/** The resolution now drawn at: real pixels for each of the game's own. */
export const resolution = (): number => started().app.renderer.resolution

/** The game's size in its own pixels, from `automata.json`. */
export const screenSize = (): [number, number] => [started().width, started().height]

/** Starts the frame's draw calls over. Run does this before `game.draw`. */
export function beginFrame(): void {
  const l = started()
  l.used = 0
  l.frame += 1
  l.drawStart = performance.now()
}

/** The frame number text uses to know which of its pictures this frame still needs. */
export const frameNumber = (): number => started().frame

/** Paints the background and throws away everything drawn so far this frame. */
export function clear(color = '#101820'): void {
  const l = started()
  l.app.renderer.background.color = color
  l.used = 0
}

/**
 * The next sprite of the pool, shown and reset to the plain state every call starts from. A new one is made only when
 * a frame has more calls than any before it. Every sprite is centred on its position, so turning and flipping turn it
 * in place; callers add half a size to the corner they were given.
 */
export function nextSprite(): Sprite {
  const l = started()
  let sprite = l.pool[l.used]
  if (!sprite) {
    sprite = new Sprite()
    sprite.anchor.set(0.5)
    l.app.stage.addChild(sprite)
    l.pool.push(sprite)
  }
  l.used += 1
  if (l.used > l.top) l.top = l.used
  sprite.visible = true
  sprite.rotation = 0
  return sprite
}

/** Hides the sprites this frame did not use, and shows the frame. */
export function present(): void {
  const l = started()
  for (let i = l.used; i < l.top; i += 1) (l.pool[i] as Sprite).visible = false
  l.top = l.used
  const drawn = performance.now()
  frameCounter.time('drawMs', drawn - l.drawStart)
  l.app.renderer.render(l.app.stage)
  frameCounter.time('renderMs', performance.now() - drawn)
  frameCounter.frameDone()
}

/**
 * How many sprites exist, and how many the last frame showed.
 * @public Read by the browser tests, which reach it through the page.
 */
export const poolStats = (): { size: number; shown: number } => ({ size: started().pool.length, shown: started().used })
