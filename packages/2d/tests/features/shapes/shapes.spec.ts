// Rectangles, circles and lines are drawn as pooled sprites too, so a frame of them makes no new objects.
import { expect, test } from '@playwright/test'
import { openTwoDPage } from '../../lib/browser-page.ts'

test.beforeEach(async ({ page }) => {
  await openTwoDPage(page)
})

test('drawRect fills its box and nothing outside it', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, shapes, pixel } = window.two
    renderer.beginFrame()
    shapes.drawRect(10, 20, 30, 15, '#ff8000')
    renderer.present()
    return {
      inside: [pixel(10, 20), pixel(39, 34), pixel(25, 28)],
      outside: [pixel(9, 20), pixel(40, 20), pixel(10, 19), pixel(10, 35)],
    }
  })
  for (const p of read.inside) expect(p).toEqual([255, 128, 0])
  for (const p of read.outside) expect(p).toEqual([0, 0, 0])
})

test('drawRect takes colours written as names, short hex and rgba', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, shapes, pixel } = window.two
    renderer.beginFrame()
    shapes.drawRect(0, 0, 10, 10, 'red')
    shapes.drawRect(10, 0, 10, 10, '#0f0')
    shapes.drawRect(20, 0, 10, 10, 'rgba(0, 0, 255, 0.5)')
    renderer.present()
    return [pixel(5, 5), pixel(15, 5), pixel(25, 5)]
  })
  expect(read[0]).toEqual([255, 0, 0])
  expect(read[1]).toEqual([0, 255, 0])
  expect(read[2]?.[2]).toBeGreaterThan(110)
  expect(read[2]?.[2]).toBeLessThan(145)
})

test('drawCircle is round: the middle and the edge are in, the corners of its box are out', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, shapes, pixel } = window.two
    renderer.beginFrame()
    shapes.drawCircle(100, 60, 20, '#00ffff')
    renderer.present()
    return {
      middle: pixel(100, 60),
      edge: [pixel(100, 42), pixel(118, 60), pixel(82, 60), pixel(100, 78)],
      corners: [pixel(82, 42), pixel(118, 42), pixel(82, 78), pixel(118, 78)],
      far: pixel(100, 30),
    }
  })
  expect(read.middle).toEqual([0, 255, 255])
  for (const p of read.edge) expect(p[1]).toBeGreaterThan(200)
  for (const p of [...read.corners, read.far]) expect(p).toEqual([0, 0, 0])
})

test('drawLine is one pixel thick, and both end pixels are part of it', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, shapes, pixel } = window.two
    renderer.beginFrame()
    shapes.drawLine(10, 50, 60, 50, '#ffffff')
    shapes.drawLine(100, 10, 100, 40, '#ff0000')
    shapes.drawLine(20, 80, 50, 110, '#00ff00')
    shapes.drawLine(150, 90, 150, 90, '#ffff00')
    renderer.present()
    return {
      across: [pixel(10, 50), pixel(35, 50), pixel(60, 50)],
      beside: [pixel(35, 49), pixel(35, 51), pixel(9, 50), pixel(61, 50)],
      down: [pixel(100, 10), pixel(100, 25), pixel(100, 40)],
      slanted: [pixel(20, 80), pixel(35, 95), pixel(50, 110)],
      dot: pixel(150, 90),
    }
  })
  for (const p of read.across) expect(p).toEqual([255, 255, 255])
  for (const p of read.beside) expect(p).toEqual([0, 0, 0])
  for (const p of read.down) expect(p).toEqual([255, 0, 0])
  for (const p of read.slanted) expect(p[1]).toBeGreaterThan(200)
  expect(read.dot).toEqual([255, 255, 0])
})

test('a mixed frame of 2,000 shapes uses 2,000 pooled sprites, and frame 2 makes no more', async ({ page }) => {
  const sizes = await page.evaluate(() => {
    const { renderer, shapes } = window.two
    const frame = (): number => {
      renderer.beginFrame()
      for (let i = 0; i < 2000; i += 1) {
        if (i % 3 === 0) shapes.drawRect(i % 190, i % 110, 8, 8, '#ffffff')
        else if (i % 3 === 1) shapes.drawCircle(i % 190, i % 110, 4, '#ff0000')
        else shapes.drawLine(0, i % 110, 190, i % 110, '#0000ff')
      }
      renderer.present()
      return renderer.poolStats().size
    }
    return [frame(), frame()]
  })
  expect(sizes).toEqual([2000, 2000])
})

test('clear changes the background and throws away what was drawn before it in the same frame', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, shapes, pixel } = window.two
    renderer.beginFrame()
    shapes.drawRect(0, 0, 50, 50, '#ff0000')
    renderer.clear('#102030')
    shapes.drawRect(60, 0, 10, 10, '#ffffff')
    renderer.present()
    return [pixel(10, 10), pixel(65, 5), pixel(100, 100)]
  })
  expect(read).toEqual([
    [16, 32, 48],
    [255, 255, 255],
    [16, 32, 48],
  ])
})
