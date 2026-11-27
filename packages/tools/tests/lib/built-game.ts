// Built games for the browser tests. The tools themselves run in the test, through `cli` and `mcp`.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { isSoftware } from '../../src/features/browser/open.ts'
import { templateGame } from './tools.ts'

/**
 * A game already built into `dist/`, written by hand so no bundler is needed: it draws with WebGL each frame and
 * answers `window.__automata` as a real game does.
 */
export function handBuiltGame(): string {
  const dir = templateGame()
  mkdirSync(join(dir, 'dist'))
  writeFileSync(
    join(dir, 'dist', 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>My game</title><body style="margin:0;background:#101820">
<canvas width="320" height="180"></canvas>
<script>
  const gl = document.querySelector('canvas').getContext('webgl2')
  let tick = 0
  window.__automata = {
    ready: false,
    state: () => ({ tick }),
    stats: () => ({ fps: 60, lowest: 60, updateMs: 0.1, drawMs: 0.1, renderMs: 0.1, calls: { rect: 1 } }),
  }
  const frame = () => {
    tick += 1
    gl.clearColor(0.06, 0.09, 0.13, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    window.__automata.ready = true
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
</script>`,
  )
  return dir
}

/** The template game with `files` written over it, built into `dist/` with bun's bundler. */
export function builtTemplate(files: Record<string, string | Uint8Array> = {}): string {
  const dir = templateGame()
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(join(dir, file, '..'), { recursive: true })
    writeFileSync(join(dir, file), text)
  }
  execFileSync('bun', ['build', 'src/main.ts', '--outdir', 'dist', '--target', 'browser'], { cwd: dir, stdio: 'pipe' })
  execFileSync('cp', ['-R', 'public/.', 'dist/'], { cwd: dir })
  writeFileSync(
    join(dir, 'dist', 'index.html'),
    '<!doctype html><meta charset="utf-8"><title>My game</title><body><script type="module" src="./main.js"></script>',
  )
  return dir
}

/** The graphics this machine's browser draws with, so a test that needs a graphics chip can skip without one. */
export async function hasGraphicsChip(): Promise<boolean> {
  const named = process.env['AUTOMATA_CHROMIUM']
  const browser = await chromium.launch({
    ...(named ? { executablePath: named } : {}),
    args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  })
  const page = await browser.newPage()
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'none'
  })
  await browser.close()
  return !isSoftware(renderer)
}
