// Criterion 26: every MCP tool is also a plain command, and each is covered by a test.
import { expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { commands } from '../../../src/features/commands/registry.ts'
import { toolNames } from '../../lib/tools.ts'

const tests = join(import.meta.dir, '..', '..')
const allTests = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? allTests(join(dir, entry.name)) : [readFileSync(join(dir, entry.name), 'utf8')],
  )

test('the commands and their MCP tools are the ones in the plan, in its order', () => {
  expect(commands.map((c) => [c.name, c.tool])).toEqual([
    ['check', 'check_game'],
    ['play', 'play_game'],
    ['shot', 'take_screenshot'],
    ['record', 'record_play'],
    ['replay', 'replay_plays'],
    ['content', 'list_content'],
    ['smooth', 'check_smoothness'],
    ['link', 'make_link'],
  ])
})

test("the MCP server's tool list is the command list", async () => {
  expect((await toolNames()).toSorted()).toEqual(commands.map((c) => c.tool).toSorted())
})

test('every command has a command-line test and an MCP test', () => {
  const text = allTests(tests).join('\n')
  const missing = commands.flatMap((c) =>
    [`${c.name}: command line`, `${c.name}: MCP`].filter((title) => !text.includes(`'${title}`)),
  )
  expect(missing).toEqual([])
})
