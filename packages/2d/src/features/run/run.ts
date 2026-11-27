import { type Game, type Inputs, type State, createFeed, loadGame, newState, step } from '@automataframework/core'
import { frameStats } from '../frame-count/frame-count.ts'
import { openStage } from '../stage/stage.ts'

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
  const feed = createFeed()
  const api = {
    ready: false,
    state: () => state as State<G>,
    stats: () => ({ ticks: state?.tick ?? 0, ...frameStats() }),
    /** Holds these inputs for every tick, so the tools can drive the game. `null` lets go. */
    feed: (inputs: Inputs | null) => feed.hold(inputs),
    /** Plays a recording's runs, one tick each. */
    feedRuns: (runs: [number, Inputs][]) => feed.runs(runs),
  }
  Object.assign(window, { __automata: api })
  start(game, options, (next) => (state = next), api, feed).catch((error: unknown) =>
    say(`This game cannot start here. ${error instanceof Error ? error.message : String(error)}`),
  )
}

async function start<G>(
  game: Game<G>,
  options: { canvas?: HTMLCanvasElement },
  setState: (state: State<G>) => State<G>,
  api: { ready: boolean },
  feed: ReturnType<typeof createFeed>,
): Promise<void> {
  const loaded = await loadGame(readText)
  if (!loaded.ok) {
    say(loaded.problems.map((p) => `${p.file}, line ${p.line}: ${p.message} ${p.fix}`).join('\n'))
    return
  }
  const { manifest, files } = loaded.value
  if (!options.canvas) {
    document.body.style.cssText =
      'margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh'
  }
  // A theme file may ask for pixel art: then the canvas grows by whole numbers and stays sharp.
  const pixelArt = (files['theme'] as { pixelArt?: boolean } | undefined)?.pixelArt === true
  const stage = await openStage({
    manifest,
    pixelArt,
    parent: document.body,
    ...(options.canvas ? { canvas: options.canvas } : {}),
    read: (path) => fetch(path).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${path} is not there.`)))),
  })
  const { canvas } = stage
  const fit = (): void => stage.fit(window.innerWidth, window.innerHeight)
  fit()
  window.addEventListener('resize', fit)

  const held = new Set<string>()
  let pointer: [number, number] | null = null
  window.addEventListener('keydown', (e) => held.add(e.key))
  window.addEventListener('keyup', (e) => held.delete(e.key))
  const at = (e: PointerEvent): [number, number] => stage.pointAt(e.clientX, e.clientY)
  canvas.addEventListener('pointerdown', (e) => (pointer = at(e)))
  canvas.addEventListener('pointermove', (e) => pointer && (pointer = at(e)))
  window.addEventListener('pointerup', () => (pointer = null))
  const h = (key: string): number => Number(held.has(key))
  const real = (): Inputs => {
    const move: [number, number] = [h('ArrowRight') - h('ArrowLeft'), h('ArrowDown') - h('ArrowUp')]
    return [{ down: pointer ? ['pointer'] : [], sticks: { move, pointer: pointer ?? [0, 0] } }]
  }

  const inputs = (): Inputs => feed.next(real)
  let state = setState(newState(game, { players: 1, seed: 1 }))
  let last = performance.now()
  let owed = 0
  const frame = (): void => {
    const begun = performance.now()
    // A frame that comes late counts as at most 5 updates, so nothing runs a burst of missed ones.
    owed = Math.min(owed + begun - last, tick * 5)
    last = begun
    for (; owed >= tick; owed -= tick) state = setState(step(game, state, inputs()))
    stage.timeUpdate(performance.now() - begun)
    stage.draw(game, state)
    api.ready = true
    window.requestAnimationFrame(frame)
  }
  window.requestAnimationFrame(frame)
}
