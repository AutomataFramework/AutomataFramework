// What the shell's browser tests share: the built test game, served once for each worker, and a few ways to drive it.
import { type Page, test as base, expect } from '@playwright/test'
import { buildTestGame, copyOf, serve } from './test-game.ts'

type Automata = {
  ready: boolean
  state(): { tick: number; outcome: string | null; game: { score: number; ticksLeft: number } }
  stats(): { ticks: number }
  feed(inputs: unknown): void
  feedRuns(runs: unknown): void
  send(event: string): void
  screen(): string
}
declare global {
  interface Window {
    ['__automata']: Automata
  }
}

type Worker = { built: string; url: string }
export const test = base.extend<{ game: string }, { served: Worker }>({
  served: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright reads the fixtures a function wants from its first argument
    async ({}, use) => {
      const built = await buildTestGame()
      const server = await serve(built)
      await use({ built, url: server.url })
      await server.close()
    },
    { scope: 'worker' },
  ],
  game: async ({ served }, use) => use(served.url),
})
export { expect }

/** Opens the game at `url` and waits until the first frame is on the screen. */
export async function open(page: Page, url: string, query = ''): Promise<void> {
  const heard: string[] = []
  page.on('console', (message) => heard.push(`${message.type()}: ${message.text()}`))
  page.on('pageerror', (error) => heard.push(`error: ${error.message}`))
  page.on('requestfailed', (request) => heard.push(`failed: ${request.url()}`))
  await page.goto(`${url}${query}`)
  try {
    await page.waitForFunction(() => window['__automata']?.ready === true, undefined, { timeout: 20_000 })
  } catch {
    const words = await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(() => '(no page)')
    throw new Error(
      `The game never got its first frame on the screen. The page said "${words}". Heard: ${heard.join(' | ')}`,
    )
  }
}

/** Waits until the game shows the screen `name`; when it never does, says which screen it showed instead. */
export async function screenIs(page: Page, name: string): Promise<void> {
  try {
    await page.waitForFunction((n) => window['__automata'].screen() === n, name, { timeout: 15_000 })
  } catch {
    const shown = await page.evaluate(() => window['__automata'].screen())
    throw new Error(`Waited for the screen "${name}" but the game showed "${shown}".`)
  }
}

/** A copy of the built game served on its own, for a test that changes its files. */
export async function ownCopy(built: string): Promise<{ dir: string; url: string; close(): Promise<void> }> {
  const dir = copyOf(built)
  return { dir, ...(await serve(dir)) }
}

/**
 * Presses a button the way this profile does: by touch where there is touch, by keys otherwise (arrows move focus
 * along the buttons, Enter presses).
 */
export async function choose(page: Page, name: string): Promise<void> {
  const button = page.getByRole('button', { name, exact: true })
  const touch = await page.evaluate(() => 'ontouchstart' in window)
  if (touch) return button.tap()
  await button.waitFor()
  for (let tries = 0; tries < 12; tries += 1) {
    // oxlint-disable-next-line no-await-in-loop -- one key at a time, looking after each
    const focused = await page.evaluate(() => (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim())
    if (focused.startsWith(name) || focused.startsWith(`‹ ${name}`)) return page.keyboard.press('Enter')
    // oxlint-disable-next-line no-await-in-loop
    await page.keyboard.press('ArrowDown')
  }
  throw new Error(`The button "${name}" could not be reached with the arrow keys.`)
}

/** Pauses the way this profile does: a tap on the pause button, or the Esc key. */
export async function pause(page: Page): Promise<void> {
  const touch = await page.evaluate(() => 'ontouchstart' in window)
  if (touch) return page.getByRole('button', { name: 'Paused' }).tap()
  return page.keyboard.press('Escape')
}

/** Holds a finger on a point of the game, so the white square walks to it. */
export const walkTo = (page: Page, x: number, y: number): Promise<void> =>
  page.evaluate(([px, py]) => window['__automata'].feed([{ down: ['pointer'], sticks: { pointer: [px, py] } }]), [x, y])
