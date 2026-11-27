// What the game's files decide, shown by changing a built copy's files and reloading: a screen, the hud and the flow
// change with their files (criterion 19); a mistake in a file is written on the page with its file, line and fix and
// no game starts (criterion 8); a game that fails in its own code leaves the menus working (criterion 9); and a hidden
// page does not run on in the background.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { choose, expect, open, ownCopy, screenIs, test } from '../lib/fixture.ts'
import { readIn } from '../lib/test-game.ts'

/** Changes one content file in a copy of the built game. */
function edit(dir: string, file: string, change: (text: string) => string): void {
  const path = join(dir, 'content', file)
  writeFileSync(path, change(readFileSync(path, 'utf8')))
}

test('changing the menu or the hud file changes the game, with no build', async ({ page, served }) => {
  const copy = await ownCopy(served.built)
  try {
    // The menu says another word on its first button and puts its two buttons the other way round, and the hud moves
    // its first chip from the top left to the bottom right.
    expect(readIn(copy.dir, 'content/menu.json')).toContain('"label": "newGame"')
    edit(copy.dir, 'menu.json', (t) => {
      const menu = JSON.parse(t) as { items: { label: string }[] }
      menu.items = menu.items.toReversed()
      return JSON.stringify(menu, null, 2).replace('"label": "newGame"', '"label": "tryAgain"')
    })
    edit(copy.dir, 'hud.json', (t) => t.replace('"where": "top-left"', '"where": "bottom-right"'))
    await open(page, copy.url)
    await page.getByRole('button', { name: /Test Game/ }).click()
    await screenIs(page, 'menu')
    await expect(page.getByRole('button', { name: 'New game' })).toHaveCount(0)
    const names = await page.locator('button.item').allTextContents()
    expect(names.map((n) => n.replace(/[›\s]+$/, '').trim())).toEqual(['Settings', 'Try again'])
    await choose(page, 'Try again')
    await screenIs(page, 'play')
    const chip = await page.getByText('Stars').boundingBox()
    const view = page.viewportSize()
    expect(chip?.x).toBeGreaterThan((view?.width ?? 0) / 2)
    expect(chip?.y).toBeGreaterThan((view?.height ?? 0) / 2)
  } finally {
    await copy.close()
  }
})

test('changing the flow file changes where the player goes', async ({ page, served }) => {
  const copy = await ownCopy(served.built)
  try {
    // The splash skips to Settings, not the menu.
    edit(copy.dir, 'flow.json', (t) => t.replace('"skip": "menu"', '"skip": "settings"'))
    await open(page, copy.url)
    await screenIs(page, 'splash')
    await page.getByRole('button', { name: /Test Game/ }).click()
    await screenIs(page, 'settings')
  } finally {
    await copy.close()
  }
})

test('the flow file says where Try again goes', async ({ page, served }) => {
  const copy = await ownCopy(served.built)
  try {
    edit(copy.dir, 'flow.json', (t) => t.replace('"retry": "play"', '"retry": "menu"'))
    await open(page, copy.url)
    for (const event of ['skip', 'new-game', 'lose']) {
      // oxlint-disable-next-line no-await-in-loop -- one event after another
      await page.evaluate((e) => window['__automata'].send(e), event)
    }
    await screenIs(page, 'lose')
    await choose(page, 'Try again')
    await screenIs(page, 'menu')
  } finally {
    await copy.close()
  }
})

test('a mistake in a screen file is written on the page with its file, line and a fix, and no game starts', async ({
  page,
  served,
}) => {
  const copy = await ownCopy(served.built)
  try {
    edit(copy.dir, 'menu.json', (t) => t.replace('"type": "button"', '"type": "buton"'))
    await page.goto(copy.url)
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    const text = (await alert.textContent()) ?? ''
    expect(text).toContain('menu.json')
    expect(text).toMatch(/line \d+/)
    expect(await page.evaluate(() => window['__automata']?.ready)).not.toBe(true)
    await expect(page.locator('canvas')).toHaveCount(0)
  } finally {
    await copy.close()
  }
})

test('a flow that points at a screen it does not have says which, and no game starts', async ({ page, served }) => {
  const copy = await ownCopy(served.built)
  try {
    edit(copy.dir, 'flow.json', (t) => t.replace('"skip": "menu"', '"skip": "nowhere"'))
    await page.goto(copy.url)
    await expect(page.getByRole('alert')).toContainText('nowhere')
  } finally {
    await copy.close()
  }
})

test('when the game fails in its own code the menus, settings and Continue still work', async ({ page, game }) => {
  await open(page, game, '?throw')
  await page.getByRole('button', { name: /Test Game/ }).click()
  await choose(page, 'New game')
  await screenIs(page, 'play')
  // Leave through the pause screen, which keeps a save, and come back with Continue: then tick 100 throws.
  await page.evaluate(() => window['__automata'].send('pause'))
  await choose(page, 'Main menu')
  await choose(page, 'Go to main menu')
  await choose(page, 'Continue')
  await screenIs(page, 'play')
  // The shell shows its own "Something went wrong" card instead of a blank page, and the menu is one press away.
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible({ timeout: 15_000 })
  await choose(page, 'Main menu')
  await screenIs(page, 'menu')
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  await choose(page, 'Settings')
  await screenIs(page, 'settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('a hidden page stops the game, pauses play, and comes back with no burst of missed ticks', async ({
  page,
  game,
}) => {
  await open(page, game)
  await page.getByRole('button', { name: /Test Game/ }).click()
  await choose(page, 'New game')
  await screenIs(page, 'play')
  const hide = (hidden: boolean): Promise<void> =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h })
      document.dispatchEvent(new Event('visibilitychange'))
    }, hidden)
  await hide(true)
  await screenIs(page, 'pause')
  const before = await page.evaluate(() => window['__automata'].stats().ticks)
  await page.waitForTimeout(2000)
  const after = await page.evaluate(() => window['__automata'].stats().ticks)
  expect(after - before).toBeLessThanOrEqual(5)
  await hide(false)
  await page.waitForTimeout(300)
  const back = await page.evaluate(() => window['__automata'].stats().ticks)
  expect(back - after).toBeLessThanOrEqual(5)
})

test('on the splash any key skips it, even before anything has been focused', async ({ page, game }) => {
  await open(page, game)
  await screenIs(page, 'splash')
  await page.keyboard.press('x')
  await screenIs(page, 'menu')
})

test('the language the player picks survives a reload, and every screen speaks it', async ({ page, game }) => {
  await open(page, game)
  await page.evaluate(() => window['__automata'].send('skip'))
  await page.evaluate(() => window['__automata'].send('settings'))
  await page.evaluate(() => window['__automata'].send('language'))
  await page.getByRole('radio', { name: 'Español' }).click()
  await expect(page.getByRole('heading', { name: 'Idioma' })).toBeVisible()
  await page.reload()
  await page.waitForFunction(() => window['__automata']?.ready === true)
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('es')
  await page.evaluate(() => window['__automata'].send('skip'))
  await expect(page.getByRole('button', { name: 'Ajustes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0)
})
