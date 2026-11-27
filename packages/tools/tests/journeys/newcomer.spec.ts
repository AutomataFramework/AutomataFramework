// Criterion 20, as far as P1 can: pack the packages, install them outside the repo, make a game with one line,
// check it, build it, play it to a win in a small phone, then put it on a link against a stand-in GitHub.
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { type Server, type ServerResponse, createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { expect, test } from '@playwright/test'

// Playwright runs from the folder that holds playwright.config.ts, the repo's root.
const repo = process.cwd()
const names = ['core', '2d', 'tools', 'create-automata']
const work = mkdtempSync(join(tmpdir(), 'newcomer-'))
const run = (cwd: string, command: string, args: string[], env: Record<string, string> = {}): string =>
  execFileSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' }

/** Serves a folder under a prefix, the way GitHub Pages serves a game at /my-game/. */
function servePages(dir: string, prefix: string): Promise<Server> {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://x').pathname
    if (!path.startsWith(prefix)) return void response.writeHead(404).end()
    const file = join(dir, path.slice(prefix.length) || 'index.html')
    const target = existsSync(file) && !file.endsWith('/') ? file : join(file, 'index.html')
    if (!existsSync(target)) return void response.writeHead(404).end()
    response.writeHead(200, { 'content-type': types[extname(target)] ?? 'application/octet-stream' })
    response.end(readFileSync(target))
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)))
}

const reply = (response: ServerResponse) => (status: number, value: unknown) =>
  response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(value))

/** A stand-in for GitHub: records each call, makes bare repos in a folder, and answers like Pages once pushed. */
function standInGithub(bareRoot: string, calls: string[]): Promise<Server> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://x')
    let body = ''
    request.on('data', (chunk) => (body += chunk))
    request.on('end', () => {
      const send = reply(response)
      const sentToken = request.headers.authorization
      if (url.pathname.startsWith('/pages/')) {
        const [, , owner, name] = url.pathname.split('/')
        const bare = join(bareRoot, `${owner}/${name}.git`)
        if (!existsSync(bare)) return send(404, {})
        return send(200, { commit: run(bare, 'git', ['rev-parse', 'main']).trim() })
      }
      calls.push(`${request.method} ${url.pathname} ${body}`.trim())
      if (sentToken !== 'Bearer ghp_standin_token_for_tests_only_000000000') return send(401, {})
      if (request.method === 'GET' && url.pathname === '/api/user') return send(200, { login: 'newcomer' })
      if (request.method === 'GET' && url.pathname.startsWith('/api/repos/')) return send(404, {})
      if (request.method === 'POST' && url.pathname === '/api/user/repos') {
        const { name } = JSON.parse(body) as { name: string }
        mkdirSync(join(bareRoot, 'newcomer'), { recursive: true })
        run(bareRoot, 'git', ['init', '--bare', '-b', 'main', join(bareRoot, `newcomer/${name}.git`)])
        return send(201, { name, full_name: `newcomer/${name}` })
      }
      if (request.method === 'POST' && url.pathname.endsWith('/pages')) return send(201, {})
      return send(404, {})
    })
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)))
}

test('a newcomer makes a game with one line, plays it, and puts it on a link', async ({ page }) => {
  // 1. Pack the packages and install them outside the repo.
  run(repo, 'pnpm', ['--recursive', '--if-present', 'build'])
  const packs = join(work, 'packs')
  mkdirSync(packs)
  for (const name of names) run(join(repo, 'packages', name), 'pnpm', ['pack', '--pack-destination', packs])
  const tarballs = Object.fromEntries(
    readdirSync(packs).map((file) => [
      file.replace(/-\d+\.\d+\.\d+.*$/, '').replace(/^automataframework-/, ''),
      join(packs, file),
    ]),
  )
  expect(Object.keys(tarballs).toSorted()).toEqual(['2d', 'core', 'create-automata', 'tools'])
  const outside = join(work, 'outside')
  mkdirSync(outside)
  run(outside, 'npm', ['init', '-y'])
  run(outside, 'npm', ['install', '--no-audit', '--no-fund', ...Object.values(tarballs)])

  // 2. One line makes a game.
  run(outside, 'npx', ['--no-install', 'create-automata', 'my-game'])
  const game = join(outside, 'my-game')
  expect(existsSync(join(game, 'public/automata.json'))).toBe(true)

  // The game asks npm for these packages by version; here they come from the tarballs just made.
  const manifest = JSON.parse(readFileSync(join(game, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>
    overrides?: Record<string, string>
  }
  for (const name of ['core', '2d', 'tools'])
    manifest.dependencies[`@automataframework/${name}`] = `file:${tarballs[name]}`
  // The other packages need core too; they get the same tarball, so the game has one copy of it.
  manifest.overrides = { '@automataframework/core': `file:${tarballs.core}` }
  writeFileSync(join(game, 'package.json'), JSON.stringify(manifest, null, 2))
  run(game, 'npm', ['install', '--no-audit', '--no-fund'])

  // 3. It checks, builds, and plays.
  run(game, 'npm', ['run', 'check'])
  run(game, 'npm', ['run', 'build'])
  const pages = await servePages(join(game, 'dist'), '/my-game/')
  try {
    await page.goto(`http://127.0.0.1:${(pages.address() as AddressInfo).port}/my-game/`)
    await page.waitForFunction(() => (window as any)['__automata']?.ready === true)
    const goal = await page.evaluate(() => {
      const a = (window as any)['__automata']
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const box = canvas.getBoundingClientRect()
      const [gx, gy] = a.state().game.goal as [number, number]
      return { x: box.left + (gx * box.width) / canvas.width, y: box.top + (gy * box.height) / canvas.height }
    })
    await page.mouse.move(goal.x, goal.y)
    await page.mouse.down()
    await page.waitForFunction(() => (window as any)['__automata'].state().outcome === 'win')
    await page.mouse.up()
    // The same game with keys alone: the arrow keys move the square.
    await page.reload()
    await page.waitForFunction(() => (window as any)['__automata']?.ready === true)
    await page.keyboard.down('ArrowRight')
    await page.waitForFunction(() => (window as any)['__automata'].state().game.x > 60)
    await page.keyboard.up('ArrowRight')
  } finally {
    pages.close()
  }

  // 4. One command puts it on a link: the calls it makes are a repo, Pages from a workflow, and a push.
  const bareRoot = join(work, 'bare')
  mkdirSync(bareRoot)
  const calls: string[] = []
  const github = await standInGithub(bareRoot, calls)
  const base = `http://127.0.0.1:${(github.address() as AddressInfo).port}`
  const gitConfig = join(work, 'gitconfig')
  writeFileSync(
    gitConfig,
    `[user]\n\tname = Newcomer\n\temail = newcomer@example.com\n[credential]\n\thelper = "!f() { echo username=newcomer; echo password=ghp_standin_token_for_tests_only_000000000; }; f"\n`,
  )
  try {
    // Not the blocking `run`: the stand-in GitHub answers from this same process.
    const { stdout: out } = await promisify(execFile)('npm', ['run', 'link'], {
      cwd: game,
      env: {
        ...process.env,
        AUTOMATA_TEST_GITHUB: base,
        AUTOMATA_TEST_GIT: bareRoot,
        GIT_CONFIG_GLOBAL: gitConfig,
        GIT_CONFIG_NOSYSTEM: '1',
      },
    })
    expect(out).toContain(`${base}/pages/newcomer/my-game/`)
    expect(out.indexOf('public')).toBeGreaterThan(-1)
  } finally {
    github.close()
  }
  expect(calls.map((c) => c.split(' ').slice(0, 2).join(' '))).toEqual([
    'GET /api/user',
    'GET /api/repos/newcomer/my-game',
    'POST /api/user/repos',
    'POST /api/repos/newcomer/my-game/pages',
  ])
  expect(calls.find((c) => c.includes('/pages'))).toContain('"build_type":"workflow"')
  expect(run(join(bareRoot, 'newcomer/my-game.git'), 'git', ['log', '--oneline', 'main']).trim()).not.toBe('')
})
