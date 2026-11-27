// Cleans an AI-made picture with unfake.js, which is a browser library, so it runs inside Chromium. unfake.js finds
// the picture's real pixel size and shrinks it to one pixel per cell, without new colours or blur.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createRequire } from 'node:module'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from 'playwright-core'
import type { Picture } from '../palette/palette.ts'

/** The unfake.js commit copied into `vendor/unfake/`, and where it came from. */
export const UNFAKE = {
  repo: 'https://github.com/jenissimo/unfake.js',
  commit: '663686899e8394dfda25efd7f2a947f008c6f676',
}

const vendor = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'vendor', 'unfake')
const types: Record<string, string> = { '.js': 'text/javascript', '.wasm': 'application/wasm' }

/** What unfake.js made, and the pixel size it found (8 means each real pixel was 8 by 8). */
export type Cleaned = Picture & { scale: number }

// The browser is fetched the first time it is needed, not when the package is installed.
async function launch(executablePath: string | undefined): Promise<Browser> {
  try {
    return await chromium.launch(executablePath ? { executablePath } : {})
  } catch (error) {
    if (executablePath || !String(error).includes("Executable doesn't exist")) throw error
    const cli = join(dirname(createRequire(import.meta.url).resolve('playwright-core/package.json')), 'cli.js')
    execFileSync(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit' })
    return chromium.launch()
  }
}

/** Runs unfake.js on a PNG, in Chromium, and gives back the cleaned picture. */
export async function clean(png: Uint8Array, executablePath = process.env['AUTOMATA_CHROMIUM']): Promise<Cleaned> {
  const server = createServer((req, res) => {
    const path = normalize(join(vendor, decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')))
    if (req.url === '/')
      return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>art</title>')
    try {
      if (!path.startsWith(vendor)) throw new Error('outside')
      const body = readFileSync(path)
      res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const browser = await launch(executablePath)
  try {
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`)
    const result = await page.evaluate(async (base64: string) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const file = Object.assign(new Blob([bytes], { type: 'image/png' }), { name: 'picture.png' })
      const { processImage } = await import('/lib/pixel.js' as string)
      // 256 colours lets every DUEL colour through; the palette step picks the real ones after.
      const out = await processImage({ file, maxColors: 256 })
      const image = out.imageData as ImageData
      const scale = out.manifest.processing_steps.scale_detection.detected_scale as number
      return { width: image.width, height: image.height, rgba: Array.from(image.data), scale }
    }, Buffer.from(png).toString('base64'))
    return { ...result, rgba: Uint8Array.from(result.rgba) }
  } finally {
    await browser.close()
    server.close()
  }
}
