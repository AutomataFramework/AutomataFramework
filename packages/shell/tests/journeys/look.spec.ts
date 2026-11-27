// The look, judged by what the browser computes rather than by pixels: card width and place, text sizes, fonts, the
// colour of each part, button size, one main button, the corner's points, the focus ring, no blur and only moves that
// are cheap to draw. Shots of each screen at four sizes go to `test-results/look/` for a person to look at.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { choose, expect, open, screenIs, test } from '../lib/fixture.ts'

const themes = fileURLToPath(new URL('../fixtures/themes/', import.meta.url))
const sizes = [
  { name: '375x667', width: 375, height: 667, base: 17 },
  { name: '667x375', width: 667, height: 375, base: 17 },
  { name: '1024x768', width: 1024, height: 768, base: 21 },
  { name: '1280x720', width: 1280, height: 720, base: 22 },
]

/** Serves the game with a theme file listed in automata.json, as a game's own files would. */
async function withTheme(page: Page, name: 'dark' | 'pixel'): Promise<void> {
  await page.route('**/automata.json', async (route) => {
    const response = await route.fetch()
    const manifest = (await response.json()) as { content: object[] }
    manifest.content.push({ id: 'theme', kind: 'theme', path: 'content/theme.json' })
    await route.fulfill({ response, json: manifest })
  })
  await page.route('**/content/theme.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: readFileSync(join(themes, `${name}.json`), 'utf8') }),
  )
}

const toRgb = (text: string): [number, number, number] =>
  (text.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number) as [number, number, number]
const hexRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}
const ratio = (a: [number, number, number], b: [number, number, number]): number => {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
/** The number of points in an SVG path made of `M x y L x y ... Z`. */
const points = (d: string): number => (d.match(/[ML]/g) ?? []).length

/** What the screen on show computes to: one call, so every figure is from the same moment. */
// oxlint-disable consistent-function-scoping -- these helpers run inside the page, so they must be written inside it
const measure = (page: Page) =>
  page.evaluate(() => {
    const q = <E extends Element>(s: string): E | null => document.querySelector<E>(s)
    const css = (e: Element | null, p: string): string => (e ? getComputedStyle(e).getPropertyValue(p) : '')
    const rect = (e: Element | null) => e?.getBoundingClientRect()
    const layer = q('.layer')
    const card = q('.screen')
    const stage = q('.automata-shell')
    const buttons = [...document.querySelectorAll<HTMLElement>('button.item')]
    const transitions = [...document.querySelectorAll('.automata-shell, .automata-shell *')].flatMap((e) => {
      const s = getComputedStyle(e)
      const times = s.transitionDuration.split(',').map((t) => Number.parseFloat(t))
      return s.transitionProperty
        .split(',')
        .map((p, i) => ({ p: p.trim(), t: times[i % times.length] ?? 0 }))
        .filter((x) => x.t > 0)
        .map((x) => x.p)
    })
    return {
      base: Number.parseFloat(css(layer, 'font-size')),
      stage: { width: rect(stage)?.width ?? 0, height: rect(stage)?.height ?? 0 },
      card: { rect: rect(card)?.toJSON() as DOMRect, animation: css(card, 'animation-timing-function') },
      titleFont: css(q('h1'), 'font-family'),
      titleWeight: css(q('h1'), 'font-weight'),
      labelFont: css(q('.item .lbl'), 'font-family'),
      labelWeight: css(q('.item .lbl'), 'font-weight'),
      cardFill: css(q('.screen > .shape .body'), 'fill'),
      cardStroke: css(q('.screen > .shape .body'), 'stroke'),
      cardStrokeWidth: css(q('.screen > .shape .body'), 'stroke-width'),
      cardPath: q('.screen > .shape .body')?.getAttribute('d') ?? '',
      buttonPath: q('button.item > .shape .body')?.getAttribute('d') ?? '',
      buttonFill: css(q('button.item:not(.primary) > .shape .body'), 'fill'),
      buttonWords: css(q('button.item:not(.primary)'), 'color'),
      primaryFill: css(q('.item.primary > .shape .body'), 'fill'),
      primaryWords: css(q('.item.primary'), 'color'),
      words: css(card, 'color'),
      muted: css(q('.back'), 'color'),
      buttons: buttons.map((b) => ({
        height: b.getBoundingClientRect().height,
        em: Number.parseFloat(css(b, 'font-size')),
      })),
      primaries: document.querySelectorAll('.item.primary').length,
      blur: [...document.querySelectorAll('.automata-shell *')].filter((e) => {
        const v = getComputedStyle(e).getPropertyValue('backdrop-filter')
        return v !== '' && v !== 'none'
      }).length,
      transitions: [...new Set(transitions)],
      fontsLoaded: {
        title: document.fonts.check("700 20px 'Bricolage Grotesque Variable'"),
        main: document.fonts.check("600 20px 'Figtree Variable'"),
      },
    }
  })

async function toMenu(page: Page): Promise<void> {
  await screenIs(page, 'splash')
  await page.evaluate(() => window['__automata'].send('skip'))
  await screenIs(page, 'menu')
  // The card animates in: wait until it has settled before measuring.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
}

for (const size of sizes) {
  test(`the default look at ${size.name}: card, type, parts, corners and focus`, async ({ page, game }, info) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await open(page, game)
    await page.evaluate(() => document.fonts.ready)
    await toMenu(page)
    const m = await measure(page)

    // Layout: under 600 px the card is a bottom sheet across the stage, from 600 px a centred card of at most 25em.
    expect(m.base).toBe(size.base)
    const card = m.card.rect
    if (size.width < 600) {
      expect(card.width).toBeCloseTo(size.width, 0)
      expect(card.bottom).toBeCloseTo(size.height, 0)
      expect(card.height).toBeLessThanOrEqual(size.height * 0.94 + 1)
      expect(points(m.cardPath)).toBe(2 * 19 + 2)
    } else {
      expect(card.width).toBeCloseTo(Math.min(size.width - 2 * size.base, 25 * size.base), 0)
      expect(card.left + card.width / 2).toBeCloseTo(size.width / 2, 0)
      expect(card.height).toBeLessThanOrEqual(size.height - 1.4 * size.base + 1)
      expect(points(m.cardPath)).toBe(4 * 19)
    }
    expect(points(m.buttonPath)).toBe(4 * 19)

    // Type: Bricolage Grotesque 700 for titles, Figtree 600 for buttons.
    expect(m.titleFont).toContain('Bricolage Grotesque Variable')
    expect(m.titleWeight).toBe('700')
    expect(m.labelFont).toContain('Figtree Variable')
    expect(m.labelWeight).toBe('600')
    expect(m.fontsLoaded).toEqual({ title: true, main: true })

    // Colour: each part takes its own token, and no part holds a colour of its own.
    expect(toRgb(m.cardFill)).toEqual(hexRgb('#f4f6f8'))
    expect(toRgb(m.words)).toEqual(hexRgb('#131a22'))
    expect(toRgb(m.buttonFill)).toEqual(hexRgb('#e2e7ec'))
    expect(toRgb(m.buttonWords)).toEqual(hexRgb('#131a22'))
    expect(toRgb(m.primaryFill)).toEqual(hexRgb('#131a22'))
    expect(toRgb(m.primaryWords)).toEqual(hexRgb('#ffffff'))

    // Buttons are big (3.5em, and never under 44 px) and the screen has exactly one main button.
    expect(m.buttons.length).toBeGreaterThan(0)
    for (const b of m.buttons) {
      expect(b.height).toBeGreaterThanOrEqual(3.5 * b.em - 1)
      expect(b.height).toBeGreaterThanOrEqual(44)
    }
    expect(m.primaries).toBe(1)

    // Nothing blurs, and only transform and opacity move.
    expect(m.blur).toBe(0)
    expect(m.transitions.filter((p) => !['transform', 'opacity'].includes(p))).toEqual([])
    expect(m.card.animation).toContain('cubic-bezier')

    // The focus ring: keys show it round the button, 3 to 1 against the card.
    await page.keyboard.press('ArrowDown')
    const ring = await page.evaluate(() => {
      const e = document.querySelector('button.item:focus-visible > .shape .ring')
      return e ? { stroke: getComputedStyle(e).stroke, width: getComputedStyle(e).strokeWidth } : null
    })
    expect(ring).not.toBeNull()
    expect(ratio(toRgb(ring?.stroke ?? ''), toRgb(m.cardFill))).toBeGreaterThanOrEqual(3)

    // The shots: each screen at this size.
    const shoot = async (name: string): Promise<void> => {
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
      await page.screenshot({ path: info.outputPath(`${size.name}-${name}.png`) })
    }
    await shoot('menu')
    for (const [event, name] of [
      ['settings', 'settings'],
      ['language', 'language'],
    ] as const) {
      // oxlint-disable-next-line no-await-in-loop -- one screen after another
      await page.evaluate((e) => window['__automata'].send(e), event)
      // oxlint-disable-next-line no-await-in-loop
      await shoot(name)
    }
    await page.evaluate(() => window['__automata'].send('back'))
    await page.evaluate(() => window['__automata'].send('sound'))
    await shoot('sound')
    await page.evaluate(() => window['__automata'].send('back'))
    await page.evaluate(() => window['__automata'].send('controls'))
    await shoot('controls')
  })
}

for (const name of ['dark', 'pixel'] as const) {
  test(`a theme file restyles the shell from tokens alone: ${name}`, async ({ page, game }, info) => {
    await withTheme(page, name)
    await page.setViewportSize({ width: 1280, height: 720 })
    await open(page, game)
    await toMenu(page)
    const m = await measure(page)
    const theme = JSON.parse(readFileSync(join(themes, `${name}.json`), 'utf8')) as {
      colours: Record<string, string>
      outline?: number
    }
    expect(toRgb(m.cardFill)).toEqual(hexRgb(theme.colours.page ?? ''))
    expect(toRgb(m.words)).toEqual(hexRgb(theme.colours.words ?? ''))
    expect(toRgb(m.buttonFill)).toEqual(hexRgb(theme.colours.button ?? ''))
    expect(toRgb(m.primaryFill)).toEqual(hexRgb(theme.colours.primary ?? ''))
    expect(toRgb(m.primaryWords)).toEqual(hexRgb(theme.colours.primaryWords ?? ''))
    // Words stay readable against the part they sit on.
    expect(ratio(toRgb(m.words), toRgb(m.cardFill))).toBeGreaterThanOrEqual(4.5)
    expect(ratio(toRgb(m.buttonWords), toRgb(m.buttonFill))).toBeGreaterThanOrEqual(4.5)
    expect(ratio(toRgb(m.primaryWords), toRgb(m.primaryFill))).toBeGreaterThanOrEqual(4.5)
    if (name === 'pixel') {
      // Square corners are four points, the card has a 4 px outline in the words colour, and the entry steps.
      expect(points(m.cardPath)).toBe(4)
      expect(points(m.buttonPath)).toBe(4)
      expect(m.cardStrokeWidth).toBe('4px')
      expect(toRgb(m.cardStroke)).toEqual(hexRgb(theme.colours.words ?? ''))
      expect(m.card.animation).toContain('steps(5)')
      expect(m.titleFont).toContain('monospace')
    } else {
      expect(points(m.cardPath)).toBe(4 * 19)
      expect(m.titleFont).toContain('Bricolage Grotesque Variable')
    }
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
    await page.screenshot({ path: info.outputPath(`theme-${name}-menu.png`) })
    // The same theme holds in play, with the hud.
    await choose(page, 'New game')
    await screenIs(page, 'play')
    await page.screenshot({ path: info.outputPath(`theme-${name}-play.png`) })
  })
}

test('the game canvas is drawn at the size it is shown, so it is not blurry on a sharp screen', async ({
  page,
  game,
}) => {
  await open(page, game)
  await page.evaluate(() => document.fonts.ready)
  const m = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const box = canvas?.getBoundingClientRect()
    return { backing: canvas?.width ?? 0, shown: box?.width ?? 0, ratio: window.devicePixelRatio }
  })
  // Real pixels behind each shown pixel: at least 90% of what the screen can show, and never over the 3x cap.
  const wanted = Math.min(m.shown * m.ratio, 3 * 640)
  expect(m.backing).toBeGreaterThanOrEqual(wanted * 0.9)
})
