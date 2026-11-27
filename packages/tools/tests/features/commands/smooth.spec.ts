// Criterion 27a. The pass and fail cases need a graphics chip, so they run on Examples' pods (E4) and skip here.
import { expect, test } from '@playwright/test'
import { builtTemplate, handBuiltGame, hasGraphicsChip } from '../../lib/built-game.ts'
import { cli, mcp } from '../../lib/tools.ts'

const env = { AUTOMATA_CHROMIUM: process.env['AUTOMATA_CHROMIUM'] }
const software = { ...env, AUTOMATA_SOFTWARE_GL: '1' }
const notMeasured = 'Not measured: this computer has no graphics chip, so the number would be wrong.'

test('smooth: command line: a forced software renderer is "not measured", never a pass', async () => {
  const result = await cli(handBuiltGame(), ['smooth', '--seconds', '3'], software)
  expect(result.code).toBe(1)
  expect(result.said).toContain(notMeasured)
})

test('smooth: MCP: the same, as a tool', async () => {
  const result = await mcp(handBuiltGame(), 'check_smoothness', { seconds: 3 }, software)
  expect(result.error).toBe(true)
  expect(result.said).toContain(notMeasured)
})

test.describe('on a graphics chip', () => {
  test.beforeAll(async () => {
    test.skip(!(await hasGraphicsChip()), 'This computer has no graphics chip; these run on the pods in Examples (E4).')
  })

  test('the template game passes', async () => {
    const result = await cli(builtTemplate(), ['smooth'], env)
    expect(result.said).toMatch(/^Smooth: at least \d+ frames a second/)
    expect(result.code).toBe(0)
  })

  test('a planted game drawing 20,000 sprites fails and names drawSprite', async () => {
    const heavy = `import { clear, drawSprite } from '@automataframework/2d'
import type { Game } from '@automataframework/core'

export const game: Game<{ t: number }> = {
  init: () => ({ t: 0 }),
  update: (state) => ((state.game.t += 1), state),
  draw(state) {
    clear('#101820')
    for (let i = 0; i < 20_000; i += 1) drawSprite('dot', (i * 7 + state.game.t) % 320, (i * 13) % 180)
  },
}
`
    const result = await cli(builtTemplate({ 'src/game.ts': heavy }), ['smooth'], env)
    expect(result.code).toBe(1)
    expect(result.said).toContain('under 30')
    expect(result.said).toContain('drawSprite')
  })
})
