import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { type Server, createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createRequire } from 'node:module'
import { dirname, extname, join, normalize } from 'node:path'
import { type Browser, type Page, chromium } from 'playwright-core'

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
}

/** Serves the built game's folder on this computer only, the way a link would. */
function serve(dir: string): Promise<Server> {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname)).replace(
      /^(\.\.[/\\])+/,
      '',
    )
    let file = join(dir, path)
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) return void response.writeHead(404).end()
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
    response.end(readFileSync(file))
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)))
}

// A machine's graphics chip is often turned off in a browser with no window; these keep it on where there is one.
const gpuArgs = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-unsafe-swiftshader']
const softwareArgs = ['--use-angle=swiftshader', '--use-gl=angle', '--disable-gpu']

/**
 * A browser: the person's own Chrome when there is one, else the one `AUTOMATA_CHROMIUM` names, else Playwright's
 * Chromium, which is fetched once the first time, saying so.
 */
async function launch(env: Record<string, string | undefined>, say: (line: string) => void): Promise<Browser> {
  const args = env['AUTOMATA_SOFTWARE_GL'] === '1' ? softwareArgs : gpuArgs
  const named = env['AUTOMATA_CHROMIUM']
  const tries = [
    ...(named ? [() => chromium.launch({ executablePath: named, args })] : []),
    () => chromium.launch({ channel: 'chrome', args }),
    () => chromium.launch({ args }),
  ]
  for (const attempt of tries) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- each browser is tried only when the one before is missing
      return await attempt()
    } catch {
      // That browser is not on this computer; try the next.
    }
  }
  say('Getting a browser to look at the game with. This happens once and takes a minute or two.')
  const cli = join(dirname(createRequire(import.meta.url).resolve('playwright-core/package.json')), 'cli.js')
  execFileSync(process.execPath, [cli, 'install', 'chromium'], { stdio: 'ignore' })
  return chromium.launch({ args })
}

export type Opened = { page: Page; renderer: string; close(): Promise<void> }

/** Profiles a game is looked at in. The phone is the smallest one a game must play well on. */
export const sizes = {
  phone: { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  computer: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
} as const

/** Opens the built game (`dist/`) and waits until its first frame is on the screen. */
export async function openGame(
  cwd: string,
  env: Record<string, string | undefined>,
  say: (line: string) => void,
  options: { size: keyof typeof sizes; slowCpu?: number },
): Promise<Opened> {
  const server = await serve(join(cwd, 'dist'))
  const browser = await launch(env, say)
  const close = async (): Promise<void> => {
    await browser.close()
    server.close()
  }
  try {
    const page = await browser.newPage(sizes[options.size])
    if (options.slowCpu) {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.slowCpu })
    }
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`)
    await page.waitForFunction(
      () => (window as unknown as Record<string, { ready?: boolean } | undefined>)['__automata']?.ready === true,
      null,
      {
        timeout: 30_000,
      },
    )
    const renderer = await page.evaluate(() => {
      const gl =
        document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')
      if (!gl) return 'none'
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
    })
    return { page, renderer, close }
  } catch (error) {
    await close()
    throw error
  }
}

/** A renderer that draws on the main chip, not a graphics chip, so its frame rate says nothing about a phone. */
export const isSoftware = (renderer: string): boolean => /swiftshader|llvmpipe|software|^none$/i.test(renderer)
