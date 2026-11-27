/** What `frameStats()` reports. Times are milliseconds for the last finished frame. */
export type FrameStats = {
  fps: number
  lowest: number
  updateMs: number
  drawMs: number
  renderMs: number
  calls: Record<string, number>
}
type Part = 'updateMs' | 'drawMs' | 'renderMs'

// The first readings are the page and the graphics card warming up, so the lowest count starts after them.
const warmUpSeconds = 2

/** Counts frames against a clock that is passed in, so a test can move it by hand. */
export function createStats(now: () => number) {
  let windowStart = now()
  let frames = 0
  let readings = 0
  let fps = 0
  let lowest = 0
  let parts: Record<Part, number> = { updateMs: 0, drawMs: 0, renderMs: 0 }
  let calls: Record<string, number> = {}
  let last = { parts, calls }

  return {
    count(kind: string): void {
      calls[kind] = (calls[kind] ?? 0) + 1
    },
    time(part: Part, ms: number): void {
      parts[part] = ms
    },
    /** Called once as each frame is shown. The frame rate is the frames in each whole second, a stall included. */
    frameDone(): void {
      last = { parts, calls }
      parts = { updateMs: 0, drawMs: 0, renderMs: 0 }
      calls = {}
      frames += 1
      const time = now()
      const elapsed = time - windowStart
      if (elapsed < 1000) return
      fps = Math.round((frames * 1000) / elapsed)
      readings += 1
      if (readings > warmUpSeconds) lowest = readings === warmUpSeconds + 1 ? fps : Math.min(lowest, fps)
      frames = 0
      windowStart = time
    },
    stats(): FrameStats {
      return { fps, lowest, ...last.parts, calls: { ...last.calls } }
    },
  }
}

export const frameCounter = createStats(() => performance.now())

/** The frame rate now, the lowest seen since the page warmed up, and where the last frame's time went. */
export const frameStats = (): FrameStats => frameCounter.stats()
