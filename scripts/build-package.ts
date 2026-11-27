// Builds the package in the current folder: JavaScript with `bun build`, the type files with `tsc`.
// A package's `build` script runs it from the package's folder.
import { readFileSync, rmSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { bin?: Record<string, string> }
const runsInNode = manifest.bin !== undefined

rmSync('dist', { recursive: true, force: true })
const built = await Bun.build({
  entrypoints: ['src/index.ts', ...(runsInNode ? ['src/bin.ts'] : [])],
  outdir: 'dist',
  target: runsInNode ? 'node' : 'browser',
  packages: 'external',
  format: 'esm',
})
if (!built.success) {
  for (const log of built.logs) console.error(String(log))
  process.exit(1)
}
const types = Bun.spawnSync(['bunx', 'tsc', '-p', 'tsconfig.build.json'], { stdout: 'inherit', stderr: 'inherit' })
process.exit(types.exitCode)
