import type { Game, Manifest, State } from '@automataframework/core'
import { frameCounter } from '../frame-count/frame-count.ts'
import { fitScale } from '../renderer/fit.ts'
import { beginFrame, present, startRenderer } from '../renderer/renderer.ts'
import { loadTextures } from '../sprites/sprites.ts'

/**
 * The game's canvas: PixiJS started at the size `automata.json` says, its pictures loaded, and a way to show it as big as
 * a box lets it be. `run` and the shell both draw through this, so a game looks the same with or without a shell.
 */
export async function openStage(options: {
  manifest: Manifest
  /** Pixel art grows by whole numbers and stays sharp. */
  pixelArt: boolean
  /** Where the canvas goes. The caller sizes the box with `fit`. */
  parent: HTMLElement
  canvas?: HTMLCanvasElement
  read(path: string): Promise<Blob>
}) {
  const [width, height] = options.manifest.size
  const canvas = options.canvas ?? Object.assign(document.createElement('canvas'), { width, height })
  if (!options.canvas) options.parent.append(canvas)
  canvas.style.touchAction = 'none'
  canvas.style.imageRendering = options.pixelArt ? 'pixelated' : 'auto'
  await startRenderer({ canvas, width, height })
  await loadTextures(
    options.manifest.assets.filter((asset) => asset.kind === 'image'),
    options.read,
  )
  return {
    canvas,
    /** Shows the canvas as big as a box of this size lets it be, keeping its shape. */
    fit(boxWidth: number, boxHeight: number): void {
      const scale = fitScale(boxWidth, boxHeight, width, height, options.pixelArt)
      canvas.style.width = `${width * scale}px`
      canvas.style.height = `${height * scale}px`
    },
    /** One frame: clears the draw calls, runs the game's `draw`, shows the picture. */
    draw<G>(game: Game<G>, state: State<G>): void {
      beginFrame()
      game.draw?.(state)
      present()
    },
    /** Where in the canvas, in the game's own pixels, a point on the page is. */
    pointAt(x: number, y: number): [number, number] {
      const box = canvas.getBoundingClientRect()
      return [((x - box.left) * width) / box.width, ((y - box.top) * height) / box.height]
    },
    /** Notes how long the game's update took this frame, for `frameStats()`. */
    timeUpdate: (ms: number): void => frameCounter.time('updateMs', ms),
  }
}
