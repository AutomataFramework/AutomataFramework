// Criterion 27: an agent plays the template game through the tools, and its recorded plays replay to the same end.
import { expect, test } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cli, mcp, templateGame } from '../../lib/tools.ts'

// Right to the goal's column, then down onto it.
const toTheGoal = '[[80, { "sticks": { "move": [1, 0] } }], [40, { "sticks": { "move": [0, 1] } }]]'

test('play: command line: inputs and ticks play the game with no screen and say where it ended', async () => {
  const won = await cli(templateGame(), ['play', '--inputs', toTheGoal])
  expect(won.code).toBe(0)
  expect(won.said).toMatch(/^It ended in a win at tick \d+\./)
  const idle = await cli(templateGame(), ['play', '--ticks', '30'])
  expect(idle.said.split('\n')).toEqual(['It is still going at tick 30.', '{"x":20,"y":20,"goal":[260,120]}'])
})

test('play: MCP: the same play as a tool gives the same end, and the state as JSON', async () => {
  const result = await mcp(templateGame(), 'play_game', { inputs: toTheGoal })
  expect(result.error).toBe(false)
  expect(result.said).toMatch(/It ended in a win at tick \d+\./)
  expect(result.said).toContain('"outcome": "win"')
})

test('play: wrong inputs get a plain sentence, not a stack trace', async () => {
  const result = await cli(templateGame(), ['play', '--inputs', '[[0, "left"]]'])
  expect(result.code).toBe(1)
  expect(result.said).toBe(
    'The inputs are not in the right shape. Write them like [[30, { "down": ["right"] }], [10, {}]].',
  )
  const notThere = await cli(templateGame(), ['play', '--inputs', 'moves.json'])
  expect(notThere.said).toBe(
    'moves.json, line 1: I could not read the inputs in moves.json. Write them like [[30, { "down": ["right"] }], [10, {}]].',
  )
})

test('record: command line: a play from an inputs file is kept under plays/, and replays to the same hash', async () => {
  const dir = templateGame()
  writeFileSync(join(dir, 'moves.json'), toTheGoal)
  const kept = await cli(dir, ['record', '--inputs', 'moves.json'])
  expect(kept.code).toBe(0)
  expect(kept.said).toMatch(/^Kept the play as plays\/play-1\.json\. It ends at tick \d+\.$/)
  const play = JSON.parse(readFileSync(join(dir, 'plays/play-1.json'), 'utf8'))
  expect(play).toMatchObject({ format: 1, id: 'play-1', game: 'my-game', seed: 1, players: 1 })
  const played = await mcp(dir, 'play_game', { inputs: toTheGoal })
  expect(played.said).toContain(`"hash": "${play.end.hash}"`)
  expect(await cli(dir, ['replay'])).toEqual({ code: 0, said: 'All 1 plays end the same as when they were kept.' })
})

test('record: MCP: a named play is kept under its name', async () => {
  const dir = templateGame()
  const result = await mcp(dir, 'record_play', { inputs: toTheGoal, name: 'to-the-goal' })
  expect(result.error).toBe(false)
  expect(existsSync(join(dir, 'plays/to-the-goal.json'))).toBe(true)
})

test('replay: command line: a change that moves where a play ends names that play', async () => {
  const dir = templateGame()
  await cli(dir, ['record', '--inputs', toTheGoal, '--name', 'to-the-goal'])
  writeFileSync(
    join(dir, 'public/content/level.json'),
    '{ "format": 1, "id": "level", "kind": "level", "goal": [300, 160] }',
  )
  const result = await cli(dir, ['replay'])
  expect(result.code).toBe(1)
  expect(result.said).toMatch(/^plays\/to-the-goal\.json, line 1: It ends differently now: at tick \d+, not \d+\./)
})

test('replay: MCP: with no plays it says how to keep one', async () => {
  expect(await mcp(templateGame(), 'replay_plays')).toEqual({
    error: false,
    said: 'There are no plays yet. Keep one with npm run record.\n{\n  "plays": 0\n}',
  })
})

test('content: command line: each content file with its kind', async () => {
  expect(await cli(templateGame(), ['content'])).toEqual({
    code: 0,
    said: 'level: a "level" file, public/content/level.json',
  })
})

test('content: MCP: the files come with a JSON Schema of their shape', async () => {
  const result = await mcp(templateGame(), 'list_content')
  const files = JSON.parse(result.said.slice(result.said.indexOf('\n') + 1))
  expect(files[0]).toMatchObject({ id: 'level', kind: 'level', path: 'public/content/level.json' })
  expect(files[0].schema.required).toEqual(['format', 'id', 'kind'])
})

test('a game whose code is missing gets a plain sentence', async () => {
  const dir = templateGame()
  writeFileSync(join(dir, 'src/game.ts'), 'export const nothing = 1\n')
  const result = await cli(dir, ['play'])
  expect(result.said).toBe(
    'src/game.ts, line 1: It does not share a game with `init` and `update`. Put the game in src/game.ts, as `export const game = { init, update, draw }`.',
  )
})
