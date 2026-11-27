// Publishes every public package in `packages/` to npm as a preview, after each merge to `main`
// (`.github/workflows/publish.yml`). A preview's version is the package's own version with `-preview.<run>.sha-<commit>`
// after it, under the `preview` dist-tag, so `latest` never moves here.
//
// How it signs in: npm's trusted publishing (GitHub's OIDC token, no secret) once the package has a trusted publisher on
// npm (`npm trust github <package> --file publish.yml ...`), and `NPM_TOKEN` until then. npm tries OIDC first by
// itself, so nothing here changes when a package moves over. npm stops 2FA-bypass tokens publishing in January 2027,
// so every package moves to trusted publishing as soon as it first exists on npm.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** What this script reads from a package's `package.json`. */
export interface Manifest {
  name: string
  version: string
  private?: boolean
}

/** The preview version for a base version, a run number and a commit: `0.0.1-preview.42.sha-1a2b3c4`. */
export function previewVersion(base: string, run: string, sha: string): string {
  const release = base.split(/[-+]/)[0] ?? ''
  if (!/^\d+\.\d+\.\d+$/.test(release)) throw new Error(`"${base}" is not a version like 1.2.3.`)
  if (!/^[1-9]\d*$/.test(run)) throw new Error(`"${run}" is not a run number.`)
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error(`"${sha}" is not a commit.`)
  return `${release}-preview.${run}.sha-${sha.slice(0, 7)}`
}

/** The packages to publish: every folder in `packages/` whose `package.json` is not private, by name. */
export function publishable(root: string): { dir: string; manifest: Manifest }[] {
  const packages = join(root, 'packages')
  let dirs: string[]
  try {
    dirs = readdirSync(packages)
  } catch {
    return []
  }
  return dirs
    .map((name) => join(packages, name))
    .flatMap((dir) => {
      try {
        return [{ dir, manifest: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest }]
      } catch {
        return []
      }
    })
    .filter(({ manifest }) => manifest.private !== true)
    .toSorted((a, b) => a.manifest.name.localeCompare(b.manifest.name))
}

/**
 * Whether npm already has the package. CI never makes a package's first version: npm gives a first version the
 * `latest` tag whatever `--tag` says, and a package can get its trusted publisher only once it exists. So the owner's
 * setup step publishes each new package once, by hand, and adds its trusted publisher.
 */
export async function onNpm(name: string, get: (url: string) => Promise<{ status: number }> = fetch): Promise<boolean> {
  const response = await get(`https://registry.npmjs.org/${name.replace('/', '%2f')}`)
  if (response.status === 404) return false
  if (response.status !== 200) throw new Error(`npm answered ${response.status} for ${name}.`)
  return true
}

/** The package.json text with only its version changed. */
export function withVersion(text: string, version: string): string {
  const manifest = JSON.parse(text) as Record<string, unknown>
  manifest.version = version
  return `${JSON.stringify(manifest, null, 2)}\n`
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

/** Waits until npm serves the version, so the run shows it is really there. */
async function waitForNpm(name: string, version: string): Promise<void> {
  for (let tries = 1; tries <= 10; tries++) {
    // oxlint-disable-next-line no-await-in-loop -- one try after another, a few seconds apart
    const response = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}/${version}`)
    if (response.ok) {
      console.log(`npm serves ${name}@${version}.`)
      return
    }
    // oxlint-disable-next-line no-await-in-loop -- the wait between tries
    await sleep(6000)
  }
  throw new Error(`npm does not serve ${name}@${version} a minute after it was published.`)
}

async function main(): Promise<void> {
  const { RUN_NUMBER: run, HEAD_SHA: sha } = process.env
  if (run === undefined || sha === undefined) throw new Error('RUN_NUMBER and HEAD_SHA must be set.')
  const root = fileURLToPath(new URL('..', import.meta.url))
  const packages = publishable(root)
  if (packages.length === 0) {
    console.log('No public package in packages/, so there is nothing to publish.')
    return
  }
  for (const { dir, manifest } of packages) {
    // oxlint-disable-next-line no-await-in-loop -- one package at a time, so a failure stops the rest
    if (!(await onNpm(manifest.name))) {
      console.log(`${manifest.name} is not on npm yet, so it is left out: its first version is the owner's step.`)
      continue
    }
    const version = previewVersion(manifest.version, run, sha)
    const file = join(dir, 'package.json')
    writeFileSync(file, withVersion(readFileSync(file, 'utf8'), version))
    console.log(`Publishing ${manifest.name}@${version} under the preview tag.`)
    execFileSync('npm', ['publish', '--tag', 'preview', '--access', 'public', '--provenance'], {
      cwd: dir,
      stdio: 'inherit',
    })
    // oxlint-disable-next-line no-await-in-loop -- one package at a time, so a failure stops the rest
    await waitForNpm(manifest.name, version)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
