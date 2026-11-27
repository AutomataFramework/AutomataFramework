// The journey: splash, skip, menu, New game, play, pause, Main menu (asking first), then win and lose, each reached and
// left. On the phone it goes by touch, on the computer by keys.
import { choose, expect, open, pause, screenIs, test, walkTo } from '../lib/fixture.ts'

test('splash to menu to play to pause to menu, then a win and a lose', async ({ page, game }) => {
  await open(page, game)

  // The splash shows the game's name, and any tap or key skips it.
  await screenIs(page, 'splash')
  await expect(page.getByText('Test Game')).toBeVisible()
  await page.getByRole('button', { name: /Test Game/ }).click()
  await screenIs(page, 'menu')

  // No save yet: New game is the main button and there is no Continue.
  await expect(page.getByRole('heading', { name: 'Test Game' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0)
  await choose(page, 'New game')
  await screenIs(page, 'play')
  await expect(page.getByText('Stars')).toBeVisible()

  // Pause, and leaving for the main menu asks first.
  await pause(page)
  await screenIs(page, 'pause')
  await choose(page, 'Main menu')
  await expect(page.getByRole('heading', { name: 'Go to the main menu?' })).toBeVisible()
  await choose(page, 'Stay here')
  await screenIs(page, 'pause')
  await choose(page, 'Resume')
  await screenIs(page, 'play')
  await pause(page)
  await choose(page, 'Main menu')
  await choose(page, 'Go to main menu')
  await screenIs(page, 'menu')

  // Pausing kept the game, so Continue shows now. New game, and catch the three stars: a win.
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  await choose(page, 'New game')
  await screenIs(page, 'play')
  // oxlint-disable no-await-in-loop -- the stars are caught one after another
  for (const [score, [x, y]] of [
    [1, [300, 160]],
    [2, [420, 250]],
    [3, [520, 90]],
  ] as const) {
    await walkTo(page, x, y)
    await page.waitForFunction(
      (n) => window['__automata'].state().game.score >= n || window['__automata'].state().outcome !== null,
      score,
    )
  }
  // oxlint-enable no-await-in-loop
  await screenIs(page, 'win')
  await expect(page.getByRole('heading', { name: 'You did it!' })).toBeVisible()
  await choose(page, 'Main menu')
  await screenIs(page, 'menu')

  // Standing still runs the time out: a lose, Try again plays again, and Main menu leaves.
  await choose(page, 'New game')
  await screenIs(page, 'play')
  await page.evaluate(() => window['__automata'].feed(null))
  await screenIs(page, 'lose')
  await expect(page.getByRole('heading', { name: 'Out of time' })).toBeVisible()
  await choose(page, 'Try again')
  await screenIs(page, 'play')
  await page.evaluate(() => window['__automata'].send('pause'))
  await choose(page, 'Main menu')
  await choose(page, 'Go to main menu')
  await screenIs(page, 'menu')
})
