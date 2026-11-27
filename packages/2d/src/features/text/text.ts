import { Texture } from 'pixi.js'
import { frameCounter } from '../frame-count/frame-count.ts'
import { frameNumber, nextSprite } from '../renderer/renderer.ts'

type Picture = { texture: Texture; width: number; ink: number; frame: number }
// Oldest use first: a picture used again moves to the end.
const pictures = new Map<string, Picture>()
const cacheLimit = 128
const pad = 1
let paper: CanvasRenderingContext2D | undefined

const font = (size: number): string => `${size}px system-ui, sans-serif`

function makePicture(text: string, size: number, color: string): Picture {
  paper ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D
  paper.font = font(size)
  const ink = paper.measureText(text).width
  const canvas = Object.assign(document.createElement('canvas'), {
    width: Math.ceil(ink) + pad * 2,
    height: Math.ceil(size * 1.3) + pad * 2,
  })
  const g = canvas.getContext('2d') as CanvasRenderingContext2D
  g.font = font(size)
  g.textBaseline = 'top'
  g.fillStyle = color
  g.fillText(text, pad, pad)
  const texture = Texture.from(canvas)
  texture.source.scaleMode = 'nearest'
  return { texture, width: canvas.width, ink, frame: -1 }
}

/** Makes room for one more: throws away the pictures not used for the longest time, never one this frame still needs. */
function trim(frame: number): void {
  for (const [key, picture] of pictures) {
    if (pictures.size < cacheLimit || picture.frame === frame) return
    pictures.delete(key)
    picture.texture.destroy(true)
  }
}

/**
 * How many pictures of words are kept.
 * @public Read by the browser tests, which reach it through the page.
 */
export const textCacheSize = (): number => pictures.size

/** Draws words. x is the left end, the middle or the right end of them, as `align` says; y is their top. */
export function drawText(
  text: string,
  x: number,
  y: number,
  options: { size?: number; color?: string; align?: 'left' | 'center' | 'right' } = {},
): void {
  if (text === '') return
  const size = options.size ?? 16
  const color = options.color ?? '#ffffff'
  const key = `${size}|${color}|${text}`
  const frame = frameNumber()
  let picture = pictures.get(key)
  if (!picture) {
    trim(frame)
    picture = makePicture(text, size, color)
    pictures.set(key, picture)
  } else if (picture.frame !== frame) {
    pictures.delete(key)
    pictures.set(key, picture)
  }
  picture.frame = frame
  const share = options.align === 'center' ? 0.5 : options.align === 'right' ? 1 : 0
  const { texture } = picture
  const left = Math.round(x - picture.ink * share - pad)
  const sprite = nextSprite()
  sprite.texture = texture
  sprite.position.set(left + texture.width / 2, Math.round(y - pad) + texture.height / 2)
  sprite.scale.set(1, 1)
  sprite.tint = 0xffffff
  sprite.alpha = 1
  frameCounter.count('text')
}
