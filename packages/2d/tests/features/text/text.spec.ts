// drawText turns a string into a picture once and draws that picture from the same pool as everything else.
import { expect, test } from '@playwright/test'
import { openTwoDPage } from '../../lib/browser-page.ts'

test.beforeEach(async ({ page }) => {
  await openTwoDPage(page, 300, 120)
})

test('draws the words in the colour asked for, at the place asked for', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, text, ink } = window.two
    renderer.beginFrame()
    text.drawText('Hello', 20, 10, { size: 20, color: '#ff0000' })
    renderer.present()
    return { span: ink(0, 40), above: ink(0, 8), below: ink(40, 120) }
  })
  expect(read.span?.[0]).toBeGreaterThanOrEqual(18)
  expect(read.span?.[0]).toBeLessThanOrEqual(26)
  expect(read.span?.[1]).toBeGreaterThan(50)
  expect(read.above).toBeNull()
  expect(read.below).toBeNull()
})

test('centre puts x in the middle of the words, right puts x at their end', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, text, ink } = window.two
    const at = (align: 'left' | 'center' | 'right'): number[] | null => {
      renderer.beginFrame()
      text.drawText('Middle', 150, 10, { size: 20, align })
      renderer.present()
      return ink(0, 40)
    }
    return { left: at('left'), center: at('center'), right: at('right') }
  })
  const [cl, cr] = read.center as number[]
  expect(Math.abs((cl as number) + (cr as number) - 300) / 2).toBeLessThanOrEqual(4)
  expect((read.left as number[])[0]).toBeGreaterThanOrEqual(146)
  expect((read.right as number[])[1]).toBeLessThanOrEqual(154)
  expect((read.right as number[])[1]).toBeGreaterThanOrEqual(142)
})

test('the same words are made into a picture once, however many times they are drawn', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, text } = window.two
    const frame = (): number => {
      renderer.beginFrame()
      for (let i = 0; i < 2000; i += 1) text.drawText(i % 2 === 0 ? 'Score 10' : 'Score 20', i % 200, i % 100)
      renderer.present()
      return renderer.poolStats().size
    }
    return { pool: [frame(), frame()], pictures: text.textCacheSize() }
  })
  expect(read).toEqual({ pool: [2000, 2000], pictures: 2 })
})

test('the same words in another size or colour are another picture', async ({ page }) => {
  const pictures = await page.evaluate(() => {
    const { renderer, text } = window.two
    renderer.beginFrame()
    text.drawText('A', 0, 0)
    text.drawText('A', 0, 0, { size: 30 })
    text.drawText('A', 0, 0, { color: '#00ff00' })
    renderer.present()
    return text.textCacheSize()
  })
  expect(pictures).toBe(3)
})

test('lots of different words do not fill the memory: the oldest pictures go, the ones in use stay', async ({
  page,
}) => {
  const read = await page.evaluate(() => {
    const { renderer, text, ink } = window.two
    for (let frame = 0; frame < 5; frame += 1) {
      renderer.beginFrame()
      for (let i = 0; i < 100; i += 1) text.drawText(`score ${frame * 100 + i}`, 0, i)
      renderer.present()
    }
    const afterMany = text.textCacheSize()
    // One more frame draws old words again; none of the pictures it needs may have been thrown away.
    renderer.beginFrame()
    text.drawText('score 499', 10, 10, { size: 20, color: '#ffffff' })
    renderer.present()
    return { afterMany, lit: ink(10, 36) }
  })
  expect(read.afterMany).toBeLessThanOrEqual(128)
  expect(read.lit).not.toBeNull()
})

test('empty words draw nothing and do not throw', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, text, pixel } = window.two
    renderer.beginFrame()
    text.drawText('', 10, 10)
    renderer.present()
    return pixel(12, 12)
  })
  expect(read).toEqual([0, 0, 0])
})

test('on a sharper canvas the words keep their size and place but are drawn with more pixels', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, text } = window.two
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    const copy = Object.assign(document.createElement('canvas'), { width: 300, height: 120 })
    const g = copy.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
    const drawn = (): { ends: number[]; backing: number } => {
      renderer.beginFrame()
      text.drawText('Hello', 20, 10, { size: 20, color: '#ff0000' })
      renderer.present()
      // The whole canvas, whatever its backing size, scaled down to the game's own 300 by 120.
      g.drawImage(canvas, 0, 0, 300, 120)
      const data = g.getImageData(0, 0, 300, 40).data
      const lit = Array.from({ length: 300 }, (_, x) => x).filter((x) =>
        Array.from({ length: 40 }, (_, y) => y).some((y) => (data[(y * 300 + x) * 4] ?? 0) > 100),
      )
      return { ends: [lit[0] ?? -1, lit.at(-1) ?? -1], backing: canvas.width }
    }
    const plain = drawn()
    renderer.setResolution(2)
    const sharp = drawn()
    return { plain, sharp }
  })
  expect(read.plain.backing).toBe(300)
  expect(read.sharp.backing).toBe(600)
  // Same words, same place: the ends of the ink agree to a pixel or two, in the game's own pixels.
  expect(Math.abs((read.sharp.ends[0] ?? 0) - (read.plain.ends[0] ?? 0))).toBeLessThanOrEqual(2)
  expect(Math.abs((read.sharp.ends[1] ?? 0) - (read.plain.ends[1] ?? 0))).toBeLessThanOrEqual(3)
  expect(read.plain.ends[1]).toBeGreaterThan(50)
})
