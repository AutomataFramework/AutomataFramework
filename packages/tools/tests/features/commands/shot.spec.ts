import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { handBuiltGame } from '../../lib/built-game.ts'
import { cli, mcp, templateGame } from '../../lib/tools.ts'

const env = { AUTOMATA_CHROMIUM: process.env['AUTOMATA_CHROMIUM'] }
const png = (file: string): { width: number; height: number } => {
  const bytes = readFileSync(file)
  expect(bytes.subarray(1, 4).toString()).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

test('shot: command line: a picture of the built game on a phone, once it reaches the tick', async () => {
  const dir = handBuiltGame()
  const result = await cli(dir, ['shot', '--tick', '30'], env)
  expect(result).toEqual({ code: 0, said: 'Saved a picture of the game on a phone as shots/phone-30.png.' })
  // The phone is 375 by 667 at twice the pixels.
  expect(png(join(dir, 'shots/phone-30.png'))).toEqual({ width: 750, height: 1334 })
})

test('shot: MCP: the same picture as a tool, on a computer, under the name given', async () => {
  const dir = handBuiltGame()
  const result = await mcp(dir, 'take_screenshot', { size: 'computer', file: 'look.png' }, env)
  expect(result.error).toBe(false)
  expect(png(join(dir, 'look.png'))).toEqual({ width: 1440, height: 900 })
})

test('shot: a game that is not built yet gets a plain sentence', async () => {
  expect(await cli(templateGame(), ['shot'], env)).toEqual({
    code: 1,
    said: 'dist, line 1: The game is not built yet. Run npm run build, then try again.',
  })
})
