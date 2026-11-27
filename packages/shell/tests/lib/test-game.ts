// The test game, built the way a game's own `npm run build` builds it, and served on this computer only.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs'
import { type Server, createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { build } from 'vite'

const packages = fileURLToPath(new URL('../../../', import.meta.url))
const gameDir = fileURLToPath(new URL('../fixtures/test-game/', import.meta.url))

const at = (path: string): string => join(packages, path)

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

/** Builds the test game into a new folder and returns it. The packages are read from their source, not from `dist/`. */
export async function buildTestGame(): Promise<string> {
  const outDir = join(mkdtempSync(join(tmpdir(), 'shell-game-')), 'dist')
  await build({
    root: gameDir,
    configFile: join(gameDir, 'vite.config.ts'),
    logLevel: 'silent',
    plugins: [svelte()],
    resolve: {
      alias: [
        { find: /^@automataframework\/core\/browser$/, replacement: at('core/src/browser.ts') },
        { find: /^@automataframework\/core$/, replacement: at('core/src/index.ts') },
        { find: /^@automataframework\/2d$/, replacement: at('2d/src/index.ts') },
        { find: /^@automataframework\/shell$/, replacement: at('shell/src/index.ts') },
      ],
    },
    build: { outDir, emptyOutDir: true },
  })
  return outDir
}

/** A copy of a built game, so a test can change its files without touching the others. */
export function copyOf(dir: string): string {
  const to = join(mkdtempSync(join(tmpdir(), 'shell-copy-')), 'dist')
  mkdirSync(to, { recursive: true })
  cpSync(dir, to, { recursive: true })
  return to
}

export const readIn = (dir: string, file: string): string => readFileSync(join(dir, file), 'utf8')

/** Serves a folder on this computer only. */
export function serve(dir: string): Promise<{ url: string; close(): Promise<void> }> {
  const server: Server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname)).replace(
      /^(\.\.[/\\])+/,
      '',
    )
    let file = join(dir, path)
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) return void response.writeHead(404).end()
    response.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    response.end(readFileSync(file))
  })
  return new Promise((done) =>
    server.listen(0, '127.0.0.1', () =>
      done({
        url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`,
        // The browser may keep a connection open for later; closing the server must not wait for it.
        close: () =>
          new Promise((closed) => {
            server.close(() => closed())
            server.closeAllConnections()
          }),
      }),
    ),
  )
}
