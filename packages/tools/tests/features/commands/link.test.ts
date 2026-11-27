import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Deps, makeLink as link } from '../../../src/features/commands/link.ts'
import type { Io as Ctx } from '../../../src/features/commands/registry.ts'
import { cli, mcp } from '../../lib/tools.ts'

const manifest = {
  format: 1,
  id: 'my-game',
  name: 'My game',
  size: [320, 180],
  languages: ['en'],
  start: 'play',
  content: [],
  assets: [],
}

function game(extra: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'link-'))
  mkdirSync(join(dir, 'public'))
  writeFileSync(join(dir, 'public/automata.json'), JSON.stringify(manifest))
  for (const [file, text] of Object.entries(extra)) writeFileSync(join(dir, file), text)
  return dir
}

function setup(cwd: string, token: string | null, status = 200) {
  const said: string[] = []
  const events: string[] = []
  const deps: Deps = {
    git: (args) => (
      events.push(`git ${args[0]}`),
      args[0] === 'remote' && args.length === 1 ? '' : args[0] === 'status' ? 'x' : 'abc123'
    ),
    credential: () => {
      if (token === null) throw new Error('no sign-in')
      return `username=a\npassword=${token}\n`
    },
    fetch: async (url, init) => {
      events.push(`${init?.method ?? 'GET'} ${new URL(url).pathname}`)
      const path = new URL(url).pathname
      if (path.endsWith('/user')) return Response.json({ login: 'me' }, { status })
      if (path.endsWith('/build.json')) return Response.json({ commit: 'abc123' })
      return Response.json({}, { status: path.startsWith('/repos/me/my-game') && !path.includes('pages') ? 404 : 201 })
    },
    sleep: async () => {},
  }
  const ctx: Ctx = { cwd, env: {}, say: (line) => (said.push(line), events.push('say')) }
  return { ctx, deps, said, events }
}

test('a game with a mistake is refused with a sentence, and nothing is made', async () => {
  const cwd = game()
  writeFileSync(join(cwd, 'public/automata.json'), '{ "format": 1 ')
  const t = setup(cwd, 'tok')
  expect(await link(t.ctx, t.deps)).toBe(1)
  expect(t.said.join(' ')).toContain("didn't put it on a link")
  expect(t.events.filter((e) => e !== 'say')).toEqual([])
})

test('a file that looks like a key is refused, and the key is not printed', async () => {
  const secret = `sk-${'q7W3'.repeat(8)}`
  const cwd = game({ 'notes.txt': `my key ${secret}` })
  const t = setup(cwd, 'tok')
  expect(await link(t.ctx, t.deps)).toBe(1)
  expect(t.said.join('\n')).toContain('notes.txt, line 1')
  expect(t.said.join('\n')).not.toContain(secret)
  expect(t.events.filter((e) => e !== 'say')).toEqual([])
})

test('with no sign-in it says one plain sentence and makes nothing', async () => {
  const t = setup(game(), null)
  expect(await link(t.ctx, t.deps)).toBe(1)
  expect(t.said).toHaveLength(1)
  expect(t.events).toEqual(['say'])
})

test('it says the files will be public before it makes the repo', async () => {
  const t = setup(game(), 'tok')
  expect(await link(t.ctx, t.deps)).toBe(0)
  const sentence = t.events.indexOf('say', t.events.indexOf('GET /repos/me/my-game'))
  expect(t.events.indexOf('POST /user/repos')).toBeGreaterThan(sentence)
  expect(t.said.some((s) => s.includes('public on GitHub'))).toBe(true)
  expect(t.said.at(-1)).toContain('Your game is live')
})

test('link: command line: a game with a mistake is refused in plain words', async () => {
  const cwd = game()
  writeFileSync(join(cwd, 'public/automata.json'), '{ "format": 1 ')
  const result = await cli(cwd, ['link'])
  expect(result.code).toBe(1)
  expect(result.said).toContain("didn't put it on a link")
})

test('link: MCP: the same refusal as a tool', async () => {
  const cwd = game()
  writeFileSync(join(cwd, 'public/automata.json'), '{ "format": 1 ')
  const result = await mcp(cwd, 'make_link')
  expect(result.error).toBe(true)
  expect(result.said).toContain("didn't put it on a link")
})
