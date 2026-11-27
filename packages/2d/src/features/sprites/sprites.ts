import { Rectangle, Texture } from 'pixi.js'
import { frameCounter } from '../frame-count/frame-count.ts'
import { nextSprite } from '../renderer/renderer.ts'

const textures = new Map<string, Texture>()
// The cells of a row of pictures, made the first time each is asked for.
const cells = new Map<string, Texture[]>()
const missing = new Set<string>()
let placeholder: Texture | undefined

/**
 * Makes `source` (a canvas, an image or a bitmap) the picture called `id`. Pictures stay sharp when made bigger.
 * @public Used by the browser tests, which reach it through the page.
 */
export function addTexture(id: string, source: CanvasImageSource): void {
  const texture = Texture.from(source)
  texture.source.scaleMode = 'nearest'
  textures.set(id, texture)
  cells.delete(id)
}

/** Reads each picture a game lists in `automata.json` and keeps it under its id. */
export async function loadTextures(
  assets: { id: string; path: string }[],
  read: (path: string) => Promise<Blob>,
): Promise<void> {
  await Promise.all(assets.map(async ({ id, path }) => addTexture(id, await createImageBitmap(await read(path)))))
}

/** A magenta square stands in for a picture that is not there, so the mistake can be seen and the game goes on. */
function stand(id: string): Texture {
  if (!missing.has(id)) {
    missing.add(id)
    console.warn(`There is no picture called "${id}". Add it to "assets" in automata.json.`)
  }
  if (!placeholder) {
    const square = Object.assign(document.createElement('canvas'), { width: 8, height: 8 })
    const g = square.getContext('2d') as CanvasRenderingContext2D
    g.fillStyle = '#ff00ff'
    g.fillRect(0, 0, 8, 8)
    placeholder = Texture.from(square)
    placeholder.source.scaleMode = 'nearest'
  }
  return placeholder
}

/** Cell `n` of a row of square pictures, as wide as the row is high. Counting goes round. */
function cell(id: string, whole: Texture, n: number): Texture {
  const size = whole.height
  const count = Math.max(1, Math.floor(whole.width / size))
  const list = cells.get(id) ?? []
  cells.set(id, list)
  const index = ((Math.trunc(n) % count) + count) % count
  list[index] ??= new Texture({ source: whole.source, frame: new Rectangle(index * size, 0, size, size) })
  return list[index]
}

/** Draws the picture `id` with its top left corner at x, y. It turns and flips on its middle. */
export function drawSprite(
  id: string,
  x: number,
  y: number,
  options: { scale?: number; rotation?: number; flipX?: boolean; alpha?: number; frame?: number } = {},
): void {
  const whole = textures.get(id) ?? stand(id)
  const texture = options.frame === undefined ? whole : cell(id, whole, options.frame)
  const scale = options.scale ?? 1
  const sprite = nextSprite()
  sprite.texture = texture
  sprite.position.set(x + (texture.width * scale) / 2, y + (texture.height * scale) / 2)
  sprite.scale.set(options.flipX ? -scale : scale, scale)
  sprite.rotation = options.rotation ?? 0
  sprite.alpha = options.alpha ?? 1
  sprite.tint = 0xffffff
  frameCounter.count('sprite')
}
