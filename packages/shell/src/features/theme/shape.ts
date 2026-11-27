import { shapePath } from './corner.ts'
import type { Curved } from './corner.ts'

const ns = 'http://www.w3.org/2000/svg'

export type ShapeSize = { size: number; steep: number }

/**
 * Draws a part's shape behind its content: an SVG with two paths, the body (filled from a token by the part's own CSS)
 * and the focus ring (the same shape grown 4 px and stroked 3 px in `focus`, shown only while the part has focus from a
 * keyboard). A `ResizeObserver` draws it again when the part changes size. `corner` is in `em` of the part's own font size.
 */
export function shape(node: HTMLElement, options: { corner: ShapeSize; curved?: Curved }) {
  let current = options
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('class', 'shape')
  svg.setAttribute('aria-hidden', 'true')
  const body = document.createElementNS(ns, 'path')
  body.setAttribute('class', 'body')
  const ring = document.createElementNS(ns, 'path')
  ring.setAttribute('class', 'ring')
  svg.append(body, ring)
  node.prepend(svg)

  const draw = (): void => {
    const width = node.offsetWidth
    const height = node.offsetHeight
    if (width === 0 || height === 0) return
    const px = current.corner.size * Number.parseFloat(getComputedStyle(node).fontSize)
    body.setAttribute('d', shapePath(width, height, px, current.corner.steep, 0, current.curved))
    ring.setAttribute('d', shapePath(width, height, px, current.corner.steep, 4, current.curved))
  }
  const watcher = new ResizeObserver(draw)
  watcher.observe(node)
  draw()
  return {
    update(next: { corner: ShapeSize; curved?: Curved }): void {
      current = next
      draw()
    },
    destroy(): void {
      watcher.disconnect()
      svg.remove()
    },
  }
}
