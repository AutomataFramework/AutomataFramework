// Opens a page that can import `/src/...` straight from the package's source, with no bundler: each file is served
// with its types taken out (Node's own `stripTypeScriptTypes`), and `pixi.js` is Pixi's own single-file build.
import { existsSync, readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

const src = fileURLToPath(new URL('../../src', import.meta.url))
// `pixi.js` resolves to its `lib/` folder; the one-file build sits beside it in `dist/`.
const pixi = fileURLToPath(new URL('../dist/pixi.min.mjs', import.meta.resolve('pixi.js')))
const home = `<!doctype html><title>2d</title><script type="importmap">{"imports":{"pixi.js":"/vendor/pixi.mjs"}}</script><body style="margin:0"></body>`

/** Everything a test reaches by name, on `window.two`, with one renderer started at `width` by `height`. */
type Two = {
  renderer: typeof import('../../src/features/renderer/renderer.ts')
  sprites: typeof import('../../src/features/sprites/sprites.ts')
  shapes: typeof import('../../src/features/shapes/shapes.ts')
  text: typeof import('../../src/features/text/text.ts')
  stats: typeof import('../../src/features/frame-count/frame-count.ts')
  /** Draws what is on the canvas right now into a 2D canvas and reads one pixel, as [r, g, b]. Call it in the same
   * task as `present()`: the browser clears a WebGL canvas once it has shown it. */
  pixel(x: number, y: number): [number, number, number]
  /** The left and right ends of whatever is lit (brighter than a faint grey) on the rows `y0` up to `y1`, or `null`
   * when nothing is. One copy of the canvas, so it is cheap. */
  ink(y0: number, y1: number): [number, number] | null
}
declare global {
  interface Window {
    two: Two
  }
}

export async function openTwoDPage(page: Page, width = 200, height = 120): Promise<void> {
  await page.route('http://two-d.test/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: home })
    if (path === '/vendor/pixi.mjs') return route.fulfill({ contentType: 'text/javascript', body: readFileSync(pixi) })
    const file = join(src, path.replace(/^\/src\//, ''))
    if (!path.startsWith('/src/') || !file.endsWith('.ts') || !existsSync(file)) return route.fulfill({ status: 404 })
    return route.fulfill({ contentType: 'text/javascript', body: stripTypeScriptTypes(readFileSync(file, 'utf8')) })
  })
  await page.goto('http://two-d.test/')
  await page.evaluate(
    async ({ w, h }: { w: number; h: number }) => {
      const [renderer, sprites, shapes, text, stats] = await Promise.all([
        import(`${'/src/features/renderer/renderer.ts'}`),
        import(`${'/src/features/sprites/sprites.ts'}`),
        import(`${'/src/features/shapes/shapes.ts'}`),
        import(`${'/src/features/text/text.ts'}`),
        import(`${'/src/features/frame-count/frame-count.ts'}`),
      ])
      const canvas = document.createElement('canvas')
      document.body.append(canvas)
      await renderer.startRenderer({ canvas, width: w, height: h, background: '#000000' })
      const copy = document.createElement('canvas')
      copy.width = w
      copy.height = h
      const g = copy.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
      const copyOf = (): Uint8ClampedArray => {
        g.drawImage(canvas, 0, 0)
        return g.getImageData(0, 0, w, h).data
      }
      window.two = {
        renderer,
        sprites,
        shapes,
        text,
        stats,
        pixel(x, y) {
          const data = copyOf()
          const at = (y * w + x) * 4
          return [data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0]
        },
        ink(y0, y1) {
          const data = copyOf()
          let left: number | null = null
          let right = 0
          for (let x = 0; x < w; x += 1)
            for (let y = y0; y < y1; y += 1) {
              const at = (y * w + x) * 4
              if ((data[at] ?? 0) + (data[at + 1] ?? 0) + (data[at + 2] ?? 0) > 100) {
                left ??= x
                right = x
                break
              }
            }
          return left === null ? null : [left, right]
        },
      }
    },
    { w: width, h: height },
  )
}
