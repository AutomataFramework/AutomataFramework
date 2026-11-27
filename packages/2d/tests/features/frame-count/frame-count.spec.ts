// What `frameStats()` says about frames the renderer really drew in the browser.
import { expect, test } from '@playwright/test'
import { openTwoDPage } from '../../lib/browser-page.ts'

test.beforeEach(async ({ page }) => {
  await openTwoDPage(page)
})

test('calls counts each kind of draw call of the last finished frame', async ({ page }) => {
  const calls = await page.evaluate(() => {
    const { renderer, sprites, shapes, text, stats } = window.two
    const draw = (n: { sprite: number; rect: number; circle: number; line: number; text: number }): void => {
      renderer.beginFrame()
      for (let i = 0; i < n.sprite; i += 1) sprites.drawSprite('missing', i, 0)
      for (let i = 0; i < n.rect; i += 1) shapes.drawRect(i, 10, 4, 4, '#fff')
      for (let i = 0; i < n.circle; i += 1) shapes.drawCircle(i, 30, 3, '#fff')
      for (let i = 0; i < n.line; i += 1) shapes.drawLine(0, i, 50, i, '#fff')
      for (let i = 0; i < n.text; i += 1) text.drawText('hi', 0, 60 + i)
      renderer.present()
    }
    draw({ sprite: 4, rect: 5, circle: 3, line: 2, text: 1 })
    const first = stats.frameStats().calls
    draw({ sprite: 1, rect: 0, circle: 0, line: 0, text: 0 })
    return { first, second: stats.frameStats().calls }
  })
  expect(calls.first).toEqual({ sprite: 4, rect: 5, circle: 3, line: 2, text: 1 })
  // A kind that was not called this frame is not carried over from the last one.
  expect(calls.second).toEqual({ sprite: 1 })
})

test('the time of drawing and of rendering are measured for the frame', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, shapes, stats } = window.two
    renderer.beginFrame()
    for (let i = 0; i < 3000; i += 1) shapes.drawRect(i % 190, i % 110, 8, 8, '#fff')
    renderer.present()
    const s = stats.frameStats()
    return { drawMs: s.drawMs, renderMs: s.renderMs, updateMs: s.updateMs }
  })
  expect(read.drawMs).toBeGreaterThan(0)
  expect(read.renderMs).toBeGreaterThan(0)
  expect(read.updateMs).toBe(0)
})

test('with real frames the count is a whole number of frames a second and the lowest is never above it', async ({
  page,
}) => {
  const read = await page.evaluate(async () => {
    const { renderer, shapes, stats } = window.two
    const started = performance.now()
    await new Promise<void>((done) => {
      const frame = (): void => {
        renderer.beginFrame()
        shapes.drawRect(10, 10, 20, 20, '#fff')
        renderer.present()
        if (performance.now() - started < 3500) requestAnimationFrame(frame)
        else done()
      }
      requestAnimationFrame(frame)
    })
    return stats.frameStats()
  })
  expect(Number.isInteger(read.fps)).toBe(true)
  expect(read.fps).toBeGreaterThan(5)
  expect(read.lowest).toBeGreaterThan(0)
  expect(read.lowest).toBeLessThanOrEqual(read.fps + 1)
})
