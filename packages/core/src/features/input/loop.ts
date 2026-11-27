/** What the loop needs from the browser. A test hands in its own. */
export type LoopEnv = { frame(callback: (time: number) => void): number; cancel(id: number): void }

const stepMs = 1000 / 60
// A frame that comes late (a hidden tab, a long pause) counts as at most this long, so nothing runs a burst of missed steps.
const longestFrameMs = 100

const browserEnv = (): LoopEnv => ({
  frame: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
})

/**
 * Calls `step` 60 times a second and `draw` once a frame. An error in either goes to `onError` once and stops the loop.
 */
export function startLoop(
  run: { step(): void; draw(): void; onError(error: unknown): void },
  env: LoopEnv = browserEnv(),
): { pause(): void; resume(): void } {
  let id: number | undefined
  let last: number | undefined
  let owed = 0

  const frame = (time: number): void => {
    id = undefined
    owed += Math.min(longestFrameMs, last === undefined ? 0 : time - last)
    last = time
    try {
      while (owed >= stepMs) {
        run.step()
        owed -= stepMs
      }
      run.draw()
    } catch (error) {
      owed = 0
      run.onError(error)
      return
    }
    id = env.frame(frame)
  }

  const resume = (): void => {
    if (id !== undefined) return
    last = undefined
    id = env.frame(frame)
  }
  resume()
  return {
    pause(): void {
      if (id !== undefined) env.cancel(id)
      id = undefined
    },
    resume,
  }
}
