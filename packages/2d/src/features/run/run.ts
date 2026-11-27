import { type Game, type Inputs, type State, loadGame, newState, step } from '@automataframework/core'
import { frameCounter, frameStats } from '../frame-count/frame-count.ts'
import { fitScale } from '../renderer/fit.ts'
import { loadTextures } from '../sprites/sprites.ts'
import { beginFrame, present, startRenderer } from '../renderer/renderer.ts'

const tick = 1000 / 60

const readText = (path: string): Promise<string> =>
  fetch(path).then((r) => (r.ok ? r.text() : Promise.reject(new Error(path))))

const say = (words: string): void => {
  document.body.textContent = words
}

/**
 * Loads the game's files, then plays it: 60 updates a second and a draw each frame, on a canvas the size `automata.json`
 * says, shown as big as the window lets it be. A game with no shell. `window.__automata` is there from the start, and
 * `ready` is true once the first frame is on the screen.
 */
export function run<G>(game: Game<G>, options: { canvas?: HTMLCanvasElement } = {}): void {
  let state: State<G> | undefined
  const api = {
    ready: false,
    state: () => state as State<G>,
    stats: () => ({ ticks: state?.tick ?? 0, ...frameStats() }),
  }
  Object.assign(window, { __automata: api })
  start(game, options, (next) => (state = next), api).catch((error: unknown) =>
    say(`This game cannot start here. ${error instanceof Error ? error.message : String(error)}`),
  )
}

async function start<G>(
  game: Game<G>,
  options: { canvas?: HTMLCanvasElement },
  setState: (state: State<G>) => State<G>,
  api: { ready: boolean },
): Promise<void> {
  const loaded = await loadGame(readText)
  if (!loaded.ok) {
    say(loaded.problems.map((p) => `${p.file}, line ${p.line}: ${p.message} ${p.fix}`).join('\n'))
    return
  }
  const { manifest, files } = loaded.value
  const [width, height] = manifest.size
  const canvas = options.canvas ?? Object.assign(document.createElement('canvas'), { width, height })
  if (!options.canvas) {
    document.body.style.cssText =
      'margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh'
    document.body.append(canvas)
  }
  canvas.style.touchAction = 'none'
  await startRenderer({ canvas, width, height })

  // A theme file may ask for pixel art: then the canvas grows by whole numbers and stays sharp.
  const pixelArt = (files['theme'] as { pixelArt?: boolean } | undefined)?.pixelArt === true
  canvas.style.imageRendering = pixelArt ? 'pixelated' : 'auto'
  const fit = (): void => {
    const scale = fitScale(window.innerWidth, window.innerHeight, width, height, pixelArt)
    canvas.style.width = `${width * scale}px`
    canvas.style.height = `${height * scale}px`
  }
  fit()
  window.addEventListener('resize', fit)

  await loadTextures(
    manifest.assets.filter((asset) => asset.kind === 'image'),
    (path) => fetch(path).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${path} is not there.`)))),
  )

  const held = new Set<string>()
  let pointer: [number, number] | null = null
  window.addEventListener('keydown', (e) => held.add(e.key))
  window.addEventListener('keyup', (e) => held.delete(e.key))
  const at = (e: PointerEvent): [number, number] => {
    const box = canvas.getBoundingClientRect()
    return [((e.clientX - box.left) * width) / box.width, ((e.clientY - box.top) * height) / box.height]
  }
  canvas.addEventListener('pointerdown', (e) => (pointer = at(e)))
  canvas.addEventListener('pointermove', (e) => pointer && (pointer = at(e)))
  window.addEventListener('pointerup', () => (pointer = null))
  const h = (key: string): number => Number(held.has(key))
  const inputs = (): Inputs => {
    const move: [number, number] = [h('ArrowRight') - h('ArrowLeft'), h('ArrowDown') - h('ArrowUp')]
    return [{ down: pointer ? ['pointer'] : [], sticks: { move, pointer: pointer ?? [0, 0] } }]
  }

  let state = setState(newState(game, { players: 1, seed: 1 }))
  let last = performance.now()
  let owed = 0
  const frame = (): void => {
    const begun = performance.now()
    // A frame that comes late counts as at most 5 updates, so nothing runs a burst of missed ones.
    owed = Math.min(owed + begun - last, tick * 5)
    last = begun
    for (; owed >= tick; owed -= tick) state = setState(step(game, state, inputs()))
    frameCounter.time('updateMs', performance.now() - begun)
    beginFrame()
    game.draw?.(state)
    present()
    api.ready = true
    window.requestAnimationFrame(frame)
  }
  window.requestAnimationFrame(frame)
}
