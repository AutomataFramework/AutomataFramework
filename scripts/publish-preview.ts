// Publishes every public package in `packages/` to npm as a preview, after each merge to `main`
// (`.github/workflows/publish.yml`, which installs and builds first). A preview's version is the package's own version
// with `-preview.<run>.sha-<commit>` after it, under the `preview` dist-tag, so `latest` never moves here.
//
// Each package is packed by pnpm, which turns `workspace:*` into the exact version of the other package in this run,
// and the tarball is checked before anything is uploaded: a missing `bin` or `exports` file, or a `workspace:` range
// left in, stops the whole run with nothing published. Packages go out dependencies first.
//
// How it signs in: npm's trusted publishing (GitHub's OIDC token, no secret) once the package has a trusted publisher on
// npm (`npm trust github <package> --file publish.yml ...`), and `NPM_TOKEN` until then. npm tries OIDC first by
// itself, so nothing here changes when a package moves over. npm stops 2FA-bypass tokens publishing in January 2027,
// so every package moves to trusted publishing as soon as it first exists on npm.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** What this script reads from a package's `package.json`. */
export interface Manifest {
  name: string
  version: string
  private?: boolean
  bin?: string | Record<string, string>
  exports?: unknown
  main?: string
  types?: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

/** A package, with the dependencies its `template/package.json` asks for when it has one (`create-automata`). */
interface Package {
  dir: string
  manifest: Manifest
  template?: Record<string, string>
}

type Item = { manifest: Manifest; template?: Record<string, string> }

type Get = (url: string, init?: RequestInit) => Promise<{ status: number; json?: () => Promise<unknown> }>

const registry = (name: string): string => `https://registry.npmjs.org/${name.replace('/', '%2f')}`
const ranges = ['dependencies', 'peerDependencies', 'optionalDependencies'] as const

/** The preview version for a base version, a run number and a commit: `0.0.1-preview.42.sha-1a2b3c4`. */
export function previewVersion(base: string, run: string, sha: string): string {
  const release = base.split(/[-+]/)[0] ?? ''
  if (!/^\d+\.\d+\.\d+$/.test(release)) throw new Error(`"${base}" is not a version like 1.2.3.`)
  if (!/^[1-9]\d*$/.test(run)) throw new Error(`"${run}" is not a run number.`)
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error(`"${sha}" is not a commit.`)
  return `${release}-preview.${run}.sha-${sha.slice(0, 7)}`
}

/** The packages to publish: every folder in `packages/` whose `package.json` is not private, by name. */
export function publishable(root: string): Package[] {
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
      let manifest: Manifest
      try {
        manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest
      } catch {
        return []
      }
      try {
        const template = JSON.parse(readFileSync(join(dir, 'template/package.json'), 'utf8')) as Manifest
        return [{ dir, manifest, template: template.dependencies ?? {} }]
      } catch {
        return [{ dir, manifest }]
      }
    })
    .filter(({ manifest }) => manifest.private !== true)
    .toSorted((a, b) => a.manifest.name.localeCompare(b.manifest.name))
}

/**
 * The other packages of this repo that a package depends on, the ones its template asks for included: a game made by
 * `create-automata` installs them at `create-automata`'s own version, so they must be on npm first.
 */
function workspaceDeps({ manifest, template }: Item, names: Set<string>): string[] {
  const deps = [...ranges.flatMap((field) => Object.keys(manifest[field] ?? {})), ...Object.keys(template ?? {})]
  return [...new Set(deps)].filter((name) => names.has(name))
}

const base = (version: string): string => version.split(/[-+]/)[0] ?? ''

/** Template dependencies whose base version differs from their package's, so the template would ask for a version that does not exist. */
export function templateMismatches(packages: Item[]): string[] {
  const names = new Set(packages.map(({ manifest }) => manifest.name))
  const byName = new Map(packages.map(({ manifest }) => [manifest.name, manifest]))
  return packages.flatMap((item) =>
    Object.keys(item.template ?? {})
      .filter((dep) => names.has(dep) && base(byName.get(dep)?.version ?? '') !== base(item.manifest.version))
      .map(
        (dep) =>
          `${item.manifest.name} ${item.manifest.version} makes games that ask for ${dep} at its own version, but ${dep} is ${byName.get(dep)?.version}.`,
      ),
  )
}

/** The packages with every dependency before the packages that depend on it, name order otherwise. */
export function publishOrder<T extends Item>(packages: T[]): T[] {
  const names = new Set(packages.map(({ manifest }) => manifest.name))
  const byName = new Map(packages.map((item) => [item.manifest.name, item]))
  const done = new Set<string>()
  const order: T[] = []
  const visit = (item: T, path: string[]): void => {
    const { name } = item.manifest
    if (done.has(name)) return
    if (path.includes(name))
      throw new Error(`The packages depend on each other in a circle: ${[...path, name].join(' > ')}.`)
    for (const dep of workspaceDeps(item, names).toSorted()) visit(byName.get(dep) as T, [...path, name])
    done.add(name)
    order.push(item)
  }
  for (const item of packages.toSorted((a, b) => a.manifest.name.localeCompare(b.manifest.name))) visit(item, [])
  return order
}

/**
 * Which packages this run publishes, in order, and why each other one is left out. CI never makes a package's first
 * version: npm gives a first version the `latest` tag whatever `--tag` says, and a package can get its trusted
 * publisher only once it exists. A package whose dependency in this repo is left out is left out too, so no preview
 * points at a version that is not on npm.
 */
export function plan<T extends Item>(packages: T[], known: Set<string>): { publish: T[]; leftOut: string[] } {
  const names = new Set(packages.map(({ manifest }) => manifest.name))
  const out = new Set<string>()
  const publish: T[] = []
  const leftOut: string[] = []
  for (const item of publishOrder(packages)) {
    const { name } = item.manifest
    const missing = workspaceDeps(item, names).filter((dep) => out.has(dep))
    if (!known.has(name)) {
      out.add(name)
      leftOut.push(`${name} is not on npm yet, so it is left out: its first version is the owner's step.`)
    } else if (missing.length > 0) {
      out.add(name)
      leftOut.push(`${name} is left out because ${missing.join(' and ')} is left out, and it depends on it.`)
    } else {
      publish.push(item)
    }
  }
  return { publish, leftOut }
}

/** Every file a manifest promises: its `bin`, every target in `exports`, `main` and `types`. */
export function promisedFiles(manifest: Manifest): string[] {
  const found: string[] = []
  const walk = (value: unknown): void => {
    if (typeof value === 'string') found.push(value)
    else if (value !== null && typeof value === 'object') for (const inner of Object.values(value)) walk(inner)
  }
  walk(manifest.bin)
  walk(manifest.exports)
  walk(manifest.main)
  walk(manifest.types)
  return [...new Set(found.filter((file) => !file.includes('*')).map((file) => file.replace(/^\.\//, '')))]
}

/** What is wrong with a packed tarball: promised files it lacks and `workspace:` ranges left in. Empty when it is fine. */
export function tarballProblems(manifest: Manifest, files: string[]): string[] {
  const inside = new Set(files.map((file) => file.replace(/^package\//, '')))
  const problems = promisedFiles(manifest)
    .filter((file) => !inside.has(file))
    .map((file) => `${manifest.name}: the tarball has no ${file}, which its package.json promises.`)
  for (const field of ranges) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (range.startsWith('workspace:')) problems.push(`${manifest.name}: ${field} still says ${dep}@${range}.`)
    }
  }
  return problems
}

/** Packs a package with pnpm into `into` and reads back what the tarball really holds. */
export function pack(dir: string, into: string): { tarball: string; manifest: Manifest; files: string[] } {
  const output = execFileSync('pnpm', ['pack', '--pack-destination', into, '--json'], { cwd: dir, encoding: 'utf8' })
  const tarball = (JSON.parse(output) as { filename: string }).filename
  const files = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const manifest = JSON.parse(execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' }))
  return { tarball, manifest: manifest as Manifest, files }
}

/** Whether npm already has the package at all. */
export async function onNpm(name: string, get: Get = fetch): Promise<boolean> {
  const response = await get(registry(name))
  if (response.status === 404) return false
  if (response.status !== 200) throw new Error(`npm answered ${response.status} for ${name}.`)
  return true
}

/**
 * Whether npm lists this version yet. It asks past any cache (a fresh query each time and `no-cache`), first in the
 * package's own list of versions, which is what an install reads, then in the version's own page.
 */
export async function listed(
  name: string,
  version: string,
  get: Get = fetch,
  fresh = String(Date.now()),
): Promise<boolean> {
  const init = { headers: { 'cache-control': 'no-cache' } }
  const whole = await get(`${registry(name)}?fresh=${fresh}`, init)
  if (whole.status === 200 && whole.json) {
    const versions = ((await whole.json()) as { versions?: Record<string, unknown> }).versions ?? {}
    if (version in versions) return true
  }
  const one = await get(`${registry(name)}/${version}?fresh=${fresh}`, init)
  return one.status === 200
}

type Run = (command: string, args: string[]) => { status: number | null; stderr: string }

const runNpm: Run = (command, args) => {
  const result = spawnSync(command, args, { stdio: ['ignore', 'inherit', 'pipe'], encoding: 'utf8' })
  process.stderr.write(result.stderr)
  return { status: result.status, stderr: result.stderr }
}

/**
 * Uploads one tarball. npm's "cannot publish over" for this exact version means an earlier try uploaded it and npm
 * does not list it yet (a re-run while npm lags), so it counts as published and the read-back decides.
 */
export function upload(tarball: string, version: string, run: Run = runNpm): 'published' | 'already' {
  const { status, stderr } = run('npm', ['publish', tarball, '--tag', 'preview', '--access', 'public', '--provenance'])
  if (status === 0) return 'published'
  const over = /cannot publish over the previously published versions?: (\S+?)\.?(?:\s|$)/i.exec(stderr)
  if (over?.[1] === version) return 'already'
  throw new Error(`npm publish of ${tarball} failed.`)
}

/** The package.json text with only its version changed. */
export function withVersion(text: string, version: string): string {
  const manifest = JSON.parse(text) as Record<string, unknown>
  manifest.version = version
  return `${JSON.stringify(manifest, null, 2)}\n`
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

/**
 * Waits until npm lists every version, within one budget for the whole run. npm has taken more than five minutes to
 * serve a version it had taken (run 45966147542), so the budget is ten. A run that still times out can be re-run:
 * versions npm already lists are not uploaded again.
 */
export async function waitForAll(
  versions: { name: string; version: string }[],
  { budgetMs = 600_000, everyMs = 10_000, get = fetch as Get, wait = sleep, now = Date.now } = {},
): Promise<void> {
  const end = now() + budgetMs
  let left = versions
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- one round of reads, then a pause, until all are there
    const seen = await Promise.all(left.map(({ name, version }) => listed(name, version, get)))
    for (const [index, item] of left.entries()) if (seen[index]) console.log(`npm serves ${item.name}@${item.version}.`)
    left = left.filter((_, index) => !seen[index])
    if (left.length === 0) return
    if (now() >= end) {
      const names = left.map(({ name, version }) => `${name}@${version}`).join(', ')
      throw new Error(`npm does not serve ${names} yet. Re-run this run: it uploads nothing npm already has.`)
    }
    // oxlint-disable-next-line no-await-in-loop -- the pause between rounds
    await wait(everyMs)
  }
}

async function main(): Promise<void> {
  const { RUN_NUMBER: run, HEAD_SHA: sha } = process.env
  if (run === undefined || sha === undefined) throw new Error('RUN_NUMBER and HEAD_SHA must be set.')
  const root = fileURLToPath(new URL('..', import.meta.url))
  const packages = publishable(root)
  const known = new Set<string>()
  for (const { manifest } of packages) {
    // oxlint-disable-next-line no-await-in-loop -- a handful of reads, one after another
    if (await onNpm(manifest.name)) known.add(manifest.name)
  }
  const mismatches = templateMismatches(packages)
  if (mismatches.length > 0) throw new Error(`Nothing was published:\n${mismatches.join('\n')}`)
  const { publish, leftOut } = plan(packages, known)
  for (const line of leftOut) console.log(line)
  if (publish.length === 0) {
    console.log('No package to publish.')
    return
  }

  // Every version is set before any package is packed, so pnpm writes the preview version of each dependency.
  for (const { dir, manifest } of publish) {
    const file = join(dir, 'package.json')
    writeFileSync(file, withVersion(readFileSync(file, 'utf8'), previewVersion(manifest.version, run, sha)))
  }
  const into = mkdtempSync(join(tmpdir(), 'preview-'))
  const packed = publish.map(({ dir }) => pack(dir, into))
  const problems = packed.flatMap(({ manifest, files }) => tarballProblems(manifest, files))
  if (problems.length > 0) throw new Error(`Nothing was published:\n${problems.join('\n')}`)

  for (const { tarball, manifest } of packed) {
    // oxlint-disable-next-line no-await-in-loop -- one package at a time, dependencies first
    if (await listed(manifest.name, manifest.version)) {
      console.log(`npm already has ${manifest.name}@${manifest.version}, so it is not uploaded again.`)
      continue
    }
    console.log(`Publishing ${manifest.name}@${manifest.version} under the preview tag.`)
    if (upload(tarball, manifest.version) === 'already') {
      console.log(`npm already took ${manifest.name}@${manifest.version} and does not list it yet.`)
    }
  }
  await waitForAll(packed.map(({ manifest }) => ({ name: manifest.name, version: manifest.version })))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
