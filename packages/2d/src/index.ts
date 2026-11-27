// A stand-in drawing layer on the browser's own canvas, so the first game can play. Unit P2 replaces it.
import { type Game, type Inputs, type State, loadGame, newState, step } from '@automataframework/core'

let ctx: CanvasRenderingContext2D
export const clear = (color = '#101820'): void => drawRect(0, 0, ctx.canvas.width, ctx.canvas.height, color)
export function drawRect(x: number, y: number, w: number, h: number, color = '#ffffff'): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

const TICK = 1000 / 60
/** Loads the game's files, then plays it: 60 updates a second, at most 5 caught up after a stall. */
export async function run<G>(game: Game<G>, now: () => number = () => performance.now()): Promise<void> {
  const loaded = await loadGame((path) => fetch(path).then((r) => (r.ok ? r.text() : Promise.reject(new Error(path)))))
  if (!loaded.ok) {
    document.body.textContent = loaded.problems
      .map((p) => `${p.file}, line ${p.line}: ${p.message} ${p.fix}`)
      .join('\n')
    return
  }
  const [width, height] = loaded.value.manifest.size
  const canvas = Object.assign(document.createElement('canvas'), { width, height })
  canvas.style.cssText = 'width:100%;max-height:100vh;object-fit:contain;touch-action:none'
  document.body.style.cssText = 'margin:0;background:#000'
  document.body.append(canvas)
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D
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
  let state: State<G> = newState(game, { players: 1, seed: 1 })
  const api = { ready: false, state: () => state, stats: () => ({ ticks: state.tick }) }
  Object.assign(window, { __automata: api })
  let last = now()
  let owed = 0
  const frame = (): void => {
    owed = Math.min(owed + now() - last, TICK * 5)
    last = now()
    for (; owed >= TICK; owed -= TICK) state = step(game, state, inputs())
    clear()
    game.draw?.(state)
    api.ready = true
    window.requestAnimationFrame(frame)
  }
  window.requestAnimationFrame(frame)
}
