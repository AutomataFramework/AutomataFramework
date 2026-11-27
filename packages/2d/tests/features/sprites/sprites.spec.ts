// Criterion 12's shape: 2,000 calls a frame come from one pool of sprites that is made once and reused.
import { expect, test } from '@playwright/test'
import { openTwoDPage } from '../../lib/browser-page.ts'

test.beforeEach(async ({ page }) => {
  await openTwoDPage(page)
  // A 16 by 16 picture made in code: red on the left half, blue on the right.
  await page.evaluate(() => {
    const picture = Object.assign(document.createElement('canvas'), { width: 16, height: 16 })
    const g = picture.getContext('2d') as CanvasRenderingContext2D
    g.fillStyle = '#ff0000'
    g.fillRect(0, 0, 8, 16)
    g.fillStyle = '#0000ff'
    g.fillRect(8, 0, 8, 16)
    window.two.sprites.addTexture('flag', picture)
  })
})

test('2,000 calls make 2,000 pooled sprites, and frame 2 makes no more', async ({ page }) => {
  const sizes = await page.evaluate(() => {
    const { renderer, sprites } = window.two
    const frame = (): number => {
      renderer.beginFrame()
      for (let i = 0; i < 2000; i += 1) sprites.drawSprite('flag', (i * 7) % 180, (i * 3) % 100)
      renderer.present()
      return renderer.poolStats().size
    }
    return [frame(), frame(), frame()]
  })
  expect(sizes).toEqual([2000, 2000, 2000])
})

test('a frame with fewer calls hides the sprites it does not use, and more calls grow the pool by the difference', async ({
  page,
}) => {
  const seen = await page.evaluate(() => {
    const { renderer, sprites } = window.two
    const frame = (calls: number): { size: number; shown: number } => {
      renderer.beginFrame()
      for (let i = 0; i < calls; i += 1) sprites.drawSprite('flag', i, i)
      renderer.present()
      return renderer.poolStats()
    }
    return [frame(100), frame(10), frame(150)]
  })
  expect(seen).toEqual([
    { size: 100, shown: 100 },
    { size: 100, shown: 10 },
    { size: 150, shown: 150 },
  ])
})

test('draws the picture at the top left corner, in call order', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, sprites, pixel } = window.two
    renderer.beginFrame()
    sprites.drawSprite('flag', 20, 30)
    renderer.present()
    return { left: pixel(22, 40), right: pixel(34, 40), outside: pixel(19, 40), below: pixel(22, 46) }
  })
  expect(read).toEqual({ left: [255, 0, 0], right: [0, 0, 255], outside: [0, 0, 0], below: [0, 0, 0] })
})

test('a later call is drawn over an earlier one', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, sprites, shapes, pixel } = window.two
    renderer.beginFrame()
    sprites.drawSprite('flag', 20, 20)
    shapes.drawRect(20, 20, 16, 16, '#00ff00')
    sprites.drawSprite('flag', 28, 20)
    renderer.present()
    return [pixel(22, 25), pixel(30, 25)]
  })
  // The rectangle covers the first picture; the second picture covers the rectangle's right half.
  expect(read).toEqual([
    [0, 255, 0],
    [255, 0, 0],
  ])
})

test('scale, flipX, rotation and alpha', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, sprites, pixel } = window.two
    renderer.beginFrame()
    sprites.drawSprite('flag', 0, 0, { scale: 2 })
    sprites.drawSprite('flag', 40, 0, { flipX: true })
    sprites.drawSprite('flag', 80, 0, { alpha: 0.5 })
    sprites.drawSprite('flag', 120, 0, { rotation: Math.PI })
    renderer.present()
    return {
      // twice as big: the red half is 16 wide
      scaled: [pixel(14, 10), pixel(18, 10)],
      // flipped: blue first, then red
      flipped: [pixel(42, 8), pixel(54, 8)],
      half: pixel(82, 8),
      // turned half a way round: blue first, then red
      turned: [pixel(122, 8), pixel(134, 8)],
    }
  })
  expect(read.scaled).toEqual([
    [255, 0, 0],
    [0, 0, 255],
  ])
  expect(read.flipped).toEqual([
    [0, 0, 255],
    [255, 0, 0],
  ])
  expect(read.half[0]).toBeGreaterThan(110)
  expect(read.half[0]).toBeLessThan(145)
  expect(read.turned).toEqual([
    [0, 0, 255],
    [255, 0, 0],
  ])
})

test('frame picks one square cell from a row of pictures', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, sprites, pixel } = window.two
    const strip = Object.assign(document.createElement('canvas'), { width: 24, height: 8 })
    const g = strip.getContext('2d') as CanvasRenderingContext2D
    for (const [i, color] of ['#ff0000', '#00ff00', '#0000ff'].entries()) {
      g.fillStyle = color
      g.fillRect(i * 8, 0, 8, 8)
    }
    sprites.addTexture('strip', strip)
    renderer.beginFrame()
    sprites.drawSprite('strip', 0, 0, { frame: 0 })
    sprites.drawSprite('strip', 20, 0, { frame: 1 })
    sprites.drawSprite('strip', 40, 0, { frame: 2 })
    sprites.drawSprite('strip', 60, 0)
    renderer.present()
    return [pixel(4, 4), pixel(24, 4), pixel(44, 4), pixel(68, 4)]
  })
  // No frame shows the whole row, so x 68 is 8 across it: the green cell.
  expect(read).toEqual([
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [0, 255, 0],
  ])
})

test('a picture that is not there is drawn as a magenta square, and nothing throws', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { renderer, sprites, pixel } = window.two
    renderer.beginFrame()
    sprites.drawSprite('nothing-called-this', 10, 10)
    renderer.present()
    return pixel(13, 13)
  })
  expect(read).toEqual([255, 0, 255])
})

test('loadTextures reads the pictures a game lists and names them by id', async ({ page }) => {
  const read = await page.evaluate(async () => {
    const { renderer, sprites, pixel } = window.two
    const solid = Object.assign(document.createElement('canvas'), { width: 4, height: 4 })
    const g = solid.getContext('2d') as CanvasRenderingContext2D
    g.fillStyle = '#00ff00'
    g.fillRect(0, 0, 4, 4)
    const png = await new Promise<Blob>((done) => solid.toBlob((blob) => done(blob as Blob), 'image/png'))
    const asked: string[] = []
    await sprites.loadTextures([{ id: 'hero', path: 'art/hero.png' }], (path: string) => {
      asked.push(path)
      return Promise.resolve(png)
    })
    renderer.beginFrame()
    sprites.drawSprite('hero', 50, 50)
    renderer.present()
    return { asked, middle: pixel(51, 51) }
  })
  expect(read).toEqual({ asked: ['art/hero.png'], middle: [0, 255, 0] })
})
