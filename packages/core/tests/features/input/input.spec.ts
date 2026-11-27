// Criterion 5 and the input order (touch, then pad, then keys), in a real browser with real key presses.
import { expect, test } from '@playwright/test'
import { openCorePage } from '../../lib/browser-page.ts'

type Reader = {
  read(): { down: string[]; sticks: Record<string, [number, number]> }[]
  lastUsed(): string
  padsMissing(): number[]
  touch(action: string, value: boolean | [number, number], player?: number): void
}
type Page = { reader: Reader; pads: unknown[] }
declare global {
  interface Window {
    t: Page
  }
}

const setup = async (page: import('@playwright/test').Page, tap: string[] = []) => {
  await openCorePage(page)
  await page.evaluate(async (tapped) => {
    const { readInputs } = await import(`${'/src/browser.ts'}`)
    const controls = {
      format: 1 as const,
      id: 'controls',
      actions: [
        { id: 'move', label: 'Move', kind: 'stick' as const, keys: [], pad: [] },
        { id: 'jump', label: 'Jump', kind: 'button' as const, keys: [], pad: [], canTap: true },
      ],
      players: [{}, {}],
    }
    const player = (keys: string[], jump: string[], index: number) => ({
      keys: { move: keys, jump },
      pad: { move: ['stick:left'], jump: ['button:0'] },
      tap: index === 0 ? tapped : [],
    })
    const pads: unknown[] = []
    Object.defineProperty(navigator, 'getGamepads', { value: () => pads, configurable: true })
    window.t = {
      pads,
      reader: readInputs(controls, [
        player(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], ['Space'], 0),
        player(['KeyA', 'KeyD', 'KeyW', 'KeyS'], ['KeyI'], 1),
      ]),
    }
  }, tap)
}
const pad = (index: number, axes: number[], button = false) => ({
  index,
  connected: true,
  axes,
  buttons: [{ pressed: button }],
})
const read = (page: import('@playwright/test').Page) => page.evaluate(() => window.t.reader.read())
const setPads = (page: import('@playwright/test').Page, pads: unknown[]) =>
  page.evaluate((next) => window.t.pads.splice(0, window.t.pads.length, ...next), pads)

test('touch beats pad beats keys when two are used in the same tick', async ({ page }) => {
  await setup(page)
  await setPads(page, [pad(0, [0, 1, 0, 0])])
  await page.keyboard.down('ArrowRight')
  await page.evaluate(() => window.t.reader.touch('move', [-1, 0]))
  expect((await read(page))[0]?.sticks.move).toEqual([-1, 0])
  await page.evaluate(() => window.t.reader.touch('move', false))
  expect((await read(page))[0]?.sticks.move).toEqual([0, 1])
  await setPads(page, [pad(0, [0, 0, 0, 0])])
  expect((await read(page))[0]?.sticks.move).toEqual([1, 0])
  await page.keyboard.up('ArrowRight')
  expect((await read(page))[0]?.sticks.move).toBeUndefined()
})

test('a held action marked tap fires on one press and stays on until the next', async ({ page }) => {
  await setup(page, ['jump'])
  const jumping = async () => (await read(page))[0]?.down.includes('jump')
  expect(await jumping()).toBe(false)
  await page.keyboard.down('Space')
  expect(await jumping()).toBe(true)
  expect(await jumping()).toBe(true)
  await page.keyboard.up('Space')
  expect(await jumping()).toBe(true)
  expect(await jumping()).toBe(true)
  await page.keyboard.down('Space')
  expect(await jumping()).toBe(false)
  await page.keyboard.up('Space')
  expect(await jumping()).toBe(false)
})

test('an action that is not marked tap is on only while it is held, and a quick press is not lost', async ({
  page,
}) => {
  await setup(page)
  const jumping = async () => (await read(page))[0]?.down.includes('jump')
  await page.keyboard.down('Space')
  expect(await jumping()).toBe(true)
  await page.keyboard.up('Space')
  expect(await jumping()).toBe(false)
  await page.keyboard.down('Space')
  await page.keyboard.up('Space')
  expect(await jumping()).toBe(true)
  expect(await jumping()).toBe(false)
})

test("player 2 reads only player 2's pad and keys", async ({ page }) => {
  await setup(page)
  await page.keyboard.down('KeyI')
  let [one, two] = await read(page)
  expect([one?.down, two?.down]).toEqual([[], ['jump']])
  await page.keyboard.up('KeyI')
  await page.keyboard.down('Space')
  ;[one, two] = await read(page)
  expect([one?.down, two?.down]).toEqual([['jump'], []])
  await page.keyboard.up('Space')
  await setPads(page, [pad(0, [0, 0, 0, 0]), pad(1, [-1, 0, 0, 0], true)])
  ;[one, two] = await read(page)
  expect([one?.down, one?.sticks]).toEqual([[], {}])
  expect([two?.down, two?.sticks]).toEqual([['jump'], { move: [-1, 0] }])
  await setPads(page, [pad(0, [0, 0, 0, 0], true), pad(1, [0, 0, 0, 0])])
  ;[one, two] = await read(page)
  expect([one?.down, two?.down]).toEqual([['jump'], []])
})

test('a pad that drops out is named, and comes back when it does', async ({ page }) => {
  await setup(page)
  await setPads(page, [pad(0, [0, 0, 0, 0]), pad(1, [0, 0, 0, 0])])
  await read(page)
  expect(await page.evaluate(() => window.t.reader.padsMissing())).toEqual([])
  await setPads(page, [null as never, pad(1, [0, 0, 0, 0])])
  expect(await page.evaluate(() => window.t.reader.padsMissing())).toEqual([0])
  await setPads(page, [pad(0, [0, 0, 0, 0]), pad(1, [0, 0, 0, 0])])
  expect(await page.evaluate(() => window.t.reader.padsMissing())).toEqual([])
})

test('it knows which kind of control was used last', async ({ page }) => {
  await setup(page)
  await page.keyboard.press('KeyD')
  expect(await page.evaluate(() => window.t.reader.lastUsed())).toBe('keys')
  await page.evaluate(() => window.t.reader.touch('jump', true))
  expect(await page.evaluate(() => window.t.reader.lastUsed())).toBe('touch')
  await setPads(page, [pad(0, [0, 0, 0, 0], true)])
  await read(page)
  expect(await page.evaluate(() => window.t.reader.lastUsed())).toBe('pad')
})

test('losing focus lets go of every key', async ({ page }) => {
  await setup(page)
  await page.keyboard.down('Space')
  await read(page)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  expect((await read(page))[0]?.down).toEqual([])
})
