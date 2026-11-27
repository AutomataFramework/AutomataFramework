// The drawing spike (unit P2): 2,000 moving drawSprite() calls a frame from one small image made in code, and the
// frame count in large digits. It is the design the `/2d` renderer keeps: draw calls are immediate, and one pool of
// PixiJS sprites is reused each frame in call order. Not shipped. Build and run it from the repo's root:
//   bun build packages/2d/spike/main.ts --outdir <folder> --minify && cp packages/2d/spike/index.html <folder>/
import { Application, Sprite, Texture } from 'pixi.js'

const width = 480
const height = 270
const count = 2000
// The first seconds are the page and the graphics card warming up, so the lowest count starts after them.
const warmUpSeconds = 3

declare const SPIKE_BUILD: string | undefined

/** A 16 by 16 picture drawn in code: a bordered square with a cross, so each sprite is real pixels, not a flat colour. */
function testImage(): Texture {
  const canvas = Object.assign(document.createElement('canvas'), { width: 16, height: 16 })
  const g = canvas.getContext('2d') as CanvasRenderingContext2D
  g.fillStyle = '#ffd23f'
  g.fillRect(0, 0, 16, 16)
  g.fillStyle = '#e4572e'
  g.fillRect(1, 1, 14, 14)
  g.fillStyle = '#ffffff'
  g.fillRect(7, 2, 2, 12)
  g.fillRect(2, 7, 12, 2)
  const texture = Texture.from(canvas)
  texture.source.scaleMode = 'nearest'
  return texture
}

const app = new Application()
await app.init({ width, height, background: '#101820', antialias: false, resolution: 1, autoStart: false, preference: 'webgl' })
const canvas = app.canvas
canvas.id = 'game'
document.getElementById('game')?.replaceWith(canvas)
canvas.style.cssText = 'display:block;width:100%;image-rendering:pixelated'

const textures = new Map<string, Texture>([['spark', testImage()]])
const pool: Sprite[] = []
let used = 0

type Options = { scale?: number; rotation?: number; flipX?: boolean; alpha?: number }
/** Draws one picture now. The sprite at the next place in the pool is reused; a new one is made only when the pool is short. */
function drawSprite(id: string, x: number, y: number, options: Options = {}): void {
  let sprite = pool[used]
  if (!sprite) {
    sprite = new Sprite()
    sprite.anchor.set(0.5)
    app.stage.addChild(sprite)
    pool.push(sprite)
  }
  used += 1
  sprite.visible = true
  sprite.texture = textures.get(id) ?? Texture.WHITE
  sprite.position.set(x, y)
  sprite.rotation = options.rotation ?? 0
  const scale = options.scale ?? 1
  sprite.scale.set(options.flipX ? -scale : scale, scale)
  sprite.alpha = options.alpha ?? 1
}

/** After a frame's calls, the sprites that were not used this time are hidden. */
function endFrame(): void {
  for (let i = used; i < pool.length; i += 1) (pool[i] as Sprite).visible = false
  used = 0
}

// The movers: plain numbers, as a game's own state would be.
const movers = Array.from({ length: count }, (_, i) => ({
  x: (i * 37) % width,
  y: (i * 53) % height,
  dx: ((i % 7) - 3) * 0.6 || 0.9,
  dy: ((i % 5) - 2) * 0.6 || 0.7,
  turn: ((i % 9) - 4) * 0.01,
  angle: i * 0.1,
}))

function update(): void {
  for (const m of movers) {
    m.x += m.dx
    m.y += m.dy
    m.angle += m.turn
    if (m.x < 0 || m.x > width) m.dx = -m.dx
    if (m.y < 0 || m.y > height) m.dy = -m.dy
  }
}

function draw(): void {
  for (const [i, m] of movers.entries())
    drawSprite('spark', m.x, m.y, { rotation: m.angle, scale: 0.75 + (i % 3) * 0.25, alpha: 0.6 + (i % 4) * 0.1, flipX: i % 2 === 0 })
  endFrame()
}

const now = document.getElementById('now') as HTMLElement
const lowestEl = document.getElementById('lowest') as HTMLElement
const note = document.getElementById('note') as HTMLElement
let seconds = 0
let frames = 0
let windowStart = performance.now()
let lowest = Infinity

function restart(): void {
  seconds = 0
  frames = 0
  windowStart = performance.now()
  lowest = Infinity
  lowestEl.textContent = '--'
}
document.getElementById('reset')?.addEventListener('click', restart)

function frame(time: number): void {
  update()
  draw()
  app.renderer.render(app.stage)
  frames += 1
  // One reading a second: the frames drawn in that second.
  if (time - windowStart >= 1000) {
    const fps = Math.round((frames * 1000) / (time - windowStart))
    now.textContent = String(fps)
    seconds += 1
    if (seconds > warmUpSeconds) {
      lowest = Math.min(lowest, fps)
      lowestEl.textContent = String(lowest)
    }
    frames = 0
    windowStart = time
  }
  requestAnimationFrame(frame)
}

note.textContent = `${count} pictures, drawn at ${width} by ${height}. Wait about 10 seconds, then read the yellow number. Build ${typeof SPIKE_BUILD === 'string' ? SPIKE_BUILD : 'local'}.`
Object.assign(window, { __spike: { sprites: () => pool.length, lowest: () => lowest, renderer: app.renderer.name } })
requestAnimationFrame(frame)
