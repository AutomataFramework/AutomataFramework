import { Texture } from 'pixi.js'
import { frameCounter } from '../frame-count/frame-count.ts'
import { paintOf } from '../renderer/color.ts'
import { nextSprite } from '../renderer/renderer.ts'

// A rectangle, a circle and a line are each a white picture, stretched and coloured, so they come from the same pool
// as the sprites and are drawn in the order they were called.
let disc: Texture | undefined
const circle = (): Texture => {
  if (!disc) {
    const picture = Object.assign(document.createElement('canvas'), { width: 64, height: 64 })
    const g = picture.getContext('2d') as CanvasRenderingContext2D
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(32, 32, 32, 0, Math.PI * 2)
    g.fill()
    disc = Texture.from(picture)
    disc.source.scaleMode = 'linear'
  }
  return disc
}

function shape(
  texture: Texture,
  color: string,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation = 0,
): void {
  const paint = paintOf(color)
  const sprite = nextSprite()
  sprite.texture = texture
  sprite.position.set(centerX, centerY)
  sprite.scale.set(width / texture.width, height / texture.height)
  sprite.rotation = rotation
  sprite.tint = paint.tint
  sprite.alpha = paint.alpha
}

/** Fills the box whose top left corner is x, y. */
export function drawRect(x: number, y: number, width: number, height: number, color = '#ffffff'): void {
  shape(Texture.WHITE, color, x + width / 2, y + height / 2, width, height)
  frameCounter.count('rect')
}

/** Fills the circle with its middle at x, y. */
export function drawCircle(x: number, y: number, radius: number, color = '#ffffff'): void {
  shape(circle(), color, x, y, radius * 2, radius * 2)
  frameCounter.count('circle')
}

/** Draws a line one pixel thick through the pixels at both ends, as if each pixel's middle were joined. */
export function drawLine(x1: number, y1: number, x2: number, y2: number, color = '#ffffff'): void {
  const dx = x2 - x1
  const dy = y2 - y1
  shape(Texture.WHITE, color, (x1 + x2) / 2 + 0.5, (y1 + y2) / 2 + 0.5, Math.hypot(dx, dy) + 1, 1, Math.atan2(dy, dx))
  frameCounter.count('line')
}
