import { describe, expect, test } from 'bun:test'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  listed,
  onNpm,
  pack,
  plan,
  previewVersion,
  promisedFiles,
  publishOrder,
  publishable,
  tarballProblems,
  templateMismatches,
  upload,
  waitForAll,
  withVersion,
  type Manifest,
} from '../../scripts/publish-preview.ts'

describe('previewVersion', () => {
  test('adds the run and the short commit to the base version', () => {
    expect(previewVersion('0.0.1', '42', '1a2b3c4d5e6f')).toBe('0.0.1-preview.42.sha-1a2b3c4')
  })

  test('starts from the release part of a version that is already a prerelease', () => {
    expect(previewVersion('0.2.0-beta.1', '7', 'abcdef0')).toBe('0.2.0-preview.7.sha-abcdef0')
  })

  test('stays a valid version when the commit starts with a zero', () => {
    // A bare all-digit identifier with a leading zero is not valid semver; `sha-` keeps it a word.
    expect(previewVersion('1.0.0', '3', '0123456')).toBe('1.0.0-preview.3.sha-0123456')
  })

  test('refuses what is not a version, a run number or a commit', () => {
    expect(() => previewVersion('one', '1', 'abcdef0')).toThrow()
    expect(() => previewVersion('1.0.0', '0', 'abcdef0')).toThrow()
    expect(() => previewVersion('1.0.0', '1', 'xyz')).toThrow()
  })
})

describe('publishable', () => {
  const root = mkdtempSync(join(tmpdir(), 'publishable-'))
  const add = (folder: string, manifest: object | string): void => {
    mkdirSync(join(root, 'packages', folder), { recursive: true })
    const text = typeof manifest === 'string' ? manifest : JSON.stringify(manifest)
    writeFileSync(join(root, 'packages', folder, 'package.json'), text)
  }
  add('b', { name: '@automataframework/b', version: '0.0.1' })
  add('a', { name: 'create-automata', version: '0.0.1' })
  add('hidden', { name: 'hidden', version: '0.0.1', private: true })
  add('broken', '{ not json')

  test('lists the public packages by name, leaving out private and unreadable ones', () => {
    expect(publishable(root).map(({ manifest }) => manifest.name)).toEqual(['@automataframework/b', 'create-automata'])
  })

  test('finds nothing when there is no packages folder', () => {
    expect(publishable(mkdtempSync(join(tmpdir(), 'empty-')))).toEqual([])
  })

  test('finds create-automata in this repo', () => {
    const names = publishable(join(import.meta.dir, '../..')).map(({ manifest }) => manifest.name)
    expect(names).toContain('create-automata')
  })

  test('every package names this repo, which npm checks against the provenance', () => {
    for (const { dir } of publishable(join(import.meta.dir, '../..'))) {
      const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        repository?: { type?: string; url?: string; directory?: string }
      }
      expect(manifest.repository?.url).toBe('git+https://github.com/AutomataFramework/AutomataFramework.git')
      expect(manifest.repository?.directory).toBe(relative(join(import.meta.dir, '../..'), dir))
    }
  })
})

const answer = (status: number) => () => Promise.resolve({ status })

describe('onNpm', () => {
  test('is false for a package npm has never seen, so CI never makes its first version', async () => {
    expect(await onNpm('@automataframework/new', answer(404))).toBe(false)
  })

  test('is true for a package npm has', async () => {
    expect(await onNpm('create-automata', answer(200))).toBe(true)
  })

  test('stops on any other answer rather than guess', async () => {
    await expect(onNpm('create-automata', answer(503))).rejects.toThrow('503')
  })

  test('asks npm with the scope slash written as %2f', async () => {
    let asked = ''
    await onNpm('@automataframework/core', (url) => {
      asked = url
      return Promise.resolve({ status: 404 })
    })
    expect(asked).toBe('https://registry.npmjs.org/@automataframework%2fcore')
  })
})

describe('withVersion', () => {
  test('changes only the version, however the file is written', () => {
    const text = '{"name":"create-automata",  "version" : "0.0.1","bin":{"create-automata":"index.js"}}'
    expect(JSON.parse(withVersion(text, '0.0.1-preview.1.sha-abcdef0'))).toEqual({
      name: 'create-automata',
      version: '0.0.1-preview.1.sha-abcdef0',
      bin: { 'create-automata': 'index.js' },
    })
  })
})

const pkg = (name: string, dependencies: Record<string, string> = {}): { manifest: Manifest } => ({
  manifest: { name, version: '0.0.1', dependencies },
})
const names = (items: { manifest: Manifest }[]): string[] => items.map(({ manifest }) => manifest.name)

describe('publishOrder', () => {
  test('puts a dependency before the packages that use it, whatever their names', () => {
    const order = publishOrder([
      pkg('@automataframework/2d', { '@automataframework/core': 'workspace:*' }),
      pkg('@automataframework/core', { zod: '4.6.6' }),
      pkg('@automataframework/tools', { '@automataframework/core': 'workspace:*' }),
      pkg('create-automata'),
    ])
    expect(names(order)).toEqual([
      '@automataframework/core',
      '@automataframework/2d',
      '@automataframework/tools',
      'create-automata',
    ])
  })

  test('refuses packages that depend on each other in a circle', () => {
    expect(() => publishOrder([pkg('a', { b: 'workspace:*' }), pkg('b', { a: 'workspace:*' })])).toThrow('circle')
  })
})

describe('plan', () => {
  const all = [
    pkg('@automataframework/2d', { '@automataframework/core': 'workspace:*' }),
    pkg('@automataframework/core'),
    pkg('create-automata'),
  ]

  test('leaves out a package npm has never seen, and every package that depends on it', () => {
    const { publish, leftOut } = plan(all, new Set(['@automataframework/2d', 'create-automata']))
    expect(names(publish)).toEqual(['create-automata'])
    expect(leftOut.join('\n')).toContain('@automataframework/core is not on npm yet')
    expect(leftOut.join('\n')).toContain('@automataframework/2d is left out because @automataframework/core')
  })

  test('publishes everything npm has, dependencies first', () => {
    const { publish, leftOut } = plan(all, new Set(names(all)))
    expect(names(publish)).toEqual(['@automataframework/core', '@automataframework/2d', 'create-automata'])
    expect(leftOut).toEqual([])
  })
})

describe('promisedFiles and tarballProblems', () => {
  const manifest: Manifest = {
    name: 'create-automata',
    version: '0.0.1',
    bin: { 'create-automata': 'dist/bin.js' },
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
    dependencies: { zod: '4.6.6' },
  }

  test('lists every bin and exports target once, without "./"', () => {
    expect(promisedFiles(manifest)).toEqual(['dist/bin.js', 'dist/index.d.ts', 'dist/index.js'])
    expect(promisedFiles({ name: 'x', version: '1.0.0', bin: 'cli.js', main: './a.js', types: 'a.d.ts' })).toEqual([
      'cli.js',
      'a.js',
      'a.d.ts',
    ])
  })

  test('is happy with a tarball that holds every promised file', () => {
    const files = ['package/package.json', 'package/dist/bin.js', 'package/dist/index.js', 'package/dist/index.d.ts']
    expect(tarballProblems(manifest, files)).toEqual([])
  })

  test('names a missing bin file and a missing exports file', () => {
    const problems = tarballProblems(manifest, ['package/package.json', 'package/dist/index.d.ts'])
    expect(problems).toEqual([
      'create-automata: the tarball has no dist/bin.js, which its package.json promises.',
      'create-automata: the tarball has no dist/index.js, which its package.json promises.',
    ])
  })

  test('names a workspace range left in', () => {
    const left: Manifest = { name: 'create-automata', version: '0.0.1', dependencies: { core: 'workspace:*' } }
    expect(tarballProblems(left, [])).toEqual(['create-automata: dependencies still says core@workspace:*.'])
  })
})

describe('pack, on the real packages', () => {
  const root = join(import.meta.dir, '../..')
  const into = mkdtempSync(join(tmpdir(), 'packed-'))
  execFileSync('pnpm', ['build'], { cwd: root, stdio: 'ignore' })

  test('every built package packs with all its files and no workspace range', () => {
    const packages = publishable(root)
    expect(packages.length).toBeGreaterThan(0)
    for (const { dir } of packages) {
      const { manifest, files } = pack(dir, into)
      expect(tarballProblems(manifest, files)).toEqual([])
    }
  }, 60_000)

  test('a package without its built files fails the check, as an unbuilt run would', () => {
    const copy = join(mkdtempSync(join(tmpdir(), 'unbuilt-')), 'create-automata')
    cpSync(join(root, 'packages/create-automata'), copy, { recursive: true })
    rmSync(join(copy, 'dist'), { recursive: true, force: true })
    const { manifest, files } = pack(copy, into)
    expect(tarballProblems(manifest, files)).toContain(
      'create-automata: the tarball has no dist/bin.js, which its package.json promises.',
    )
  }, 60_000)

  test('pnpm writes the exact version of a dependency in place of workspace:*', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'workspace-'))
    writeFileSync(join(workspace, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')
    writeFileSync(join(workspace, 'package.json'), '{"name":"root","private":true}')
    for (const [name, deps] of [
      ['base', {}],
      ['user', { base: 'workspace:*' }],
    ] as const) {
      mkdirSync(join(workspace, 'packages', name, 'dist'), { recursive: true })
      writeFileSync(join(workspace, 'packages', name, 'dist/index.js'), '')
      const version = name === 'base' ? '0.0.1-preview.9.sha-abcdef0' : '0.0.1'
      const manifest = { name, version, exports: './dist/index.js', files: ['dist'], dependencies: deps }
      writeFileSync(join(workspace, 'packages', name, 'package.json'), JSON.stringify(manifest))
    }
    // pnpm reads the dependency's version through its link in node_modules, as after the workflow's install.
    execFileSync('pnpm', ['install', '--offline'], { cwd: workspace, stdio: 'ignore' })
    const { manifest, files } = pack(join(workspace, 'packages/user'), into)
    expect(manifest.dependencies).toEqual({ base: '0.0.1-preview.9.sha-abcdef0' })
    expect(tarballProblems(manifest, files)).toEqual([])
  }, 60_000)
})

const npm =
  (lists: string[], one: number = 404, asked: { url: string; init?: RequestInit | undefined }[] = []) =>
  (url: string, init?: RequestInit) => {
    asked.push({ url, init })
    if (/\/[^/?]+\?fresh=/.test(url.replace('https://registry.npmjs.org/', ''))) return Promise.resolve({ status: one })
    const versions = Object.fromEntries(lists.map((version) => [version, {}]))
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ versions }) })
  }

describe('listed', () => {
  test('is true once the package lists the version, asking past any cache with a fresh query', async () => {
    const asked: { url: string; init?: RequestInit | undefined }[] = []
    expect(await listed('@automataframework/core', '0.0.1-preview.9', npm(['0.0.1-preview.9'], 404, asked), '7')).toBe(
      true,
    )
    expect(asked[0]?.url).toBe('https://registry.npmjs.org/@automataframework%2fcore?fresh=7')
    expect(asked[0]?.init?.headers).toEqual({ 'cache-control': 'no-cache' })
  })

  test('falls back to the version page, and is false when neither has it', async () => {
    expect(await listed('create-automata', '0.0.2', npm([], 200))).toBe(true)
    expect(await listed('create-automata', '0.0.2', npm([], 404))).toBe(false)
  })
})

describe('waitForAll', () => {
  test('waits for every version within one budget and then passes', async () => {
    let clock = 0
    let rounds = 0
    const get = (url: string, init?: RequestInit) => npm(rounds >= 3 ? ['1.0.0'] : [])(url, init)
    await waitForAll([{ name: 'a', version: '1.0.0' }], {
      get,
      now: () => clock,
      wait: (ms) => {
        clock += ms
        rounds += 1
        return Promise.resolve()
      },
    })
    expect(rounds).toBe(3)
  })

  test('waits for all versions together: one shared wait, not one per package', async () => {
    let clock = 0
    let rounds = 0
    const get = (url: string, init?: RequestInit) => npm(rounds >= 2 ? ['1.0.0', '2.0.0'] : ['1.0.0'])(url, init)
    const all = ['a', 'b', 'c', 'd'].map((name) => ({ name, version: name === 'a' ? '1.0.0' : '2.0.0' }))
    await waitForAll(all, {
      get,
      now: () => clock,
      wait: (ms) => {
        clock += ms
        rounds += 1
        return Promise.resolve()
      },
    })
    expect(rounds).toBe(2)
    expect(clock).toBe(20_000)
  })

  test('fails after the budget, naming what is missing and saying to re-run', async () => {
    let clock = 0
    const wait = (ms: number) => {
      clock += ms
      return Promise.resolve()
    }
    const run = waitForAll([{ name: 'a', version: '1.0.0' }], {
      get: npm([]),
      now: () => clock,
      wait,
      budgetMs: 30_000,
    })
    await expect(run).rejects.toThrow('npm does not serve a@1.0.0 yet. Re-run this run')
    expect(clock).toBe(30_000)
  })
})

describe('the template of create-automata', () => {
  const game = {
    manifest: { name: 'create-automata', version: '0.0.1' },
    template: { '@automataframework/core': '__VERSION__', '@automataframework/2d': '__VERSION__', vite: '8.4.0' },
  }
  const core = pkg('@automataframework/core')
  const twoD = pkg('@automataframework/2d', { '@automataframework/core': 'workspace:*' })

  test('puts create-automata after the packages its games install', () => {
    expect(names(publishOrder([game, twoD, core]))).toEqual([
      '@automataframework/core',
      '@automataframework/2d',
      'create-automata',
    ])
  })

  test('leaves create-automata out when a package its games install is left out', () => {
    const { publish, leftOut } = plan([game, twoD, core], new Set(['create-automata', '@automataframework/core']))
    expect(names(publish)).toEqual(['@automataframework/core'])
    expect(leftOut.join('\n')).toContain('create-automata is left out because @automataframework/2d is left out')
  })

  test('is read from template/package.json in this repo', () => {
    const found = publishable(join(import.meta.dir, '../..')).find(
      ({ manifest }) => manifest.name === 'create-automata',
    )
    expect(Object.keys(found?.template ?? {})).toContain('@automataframework/core')
  })

  test('names a package whose base version differs from create-automata, whose games would ask for it', () => {
    expect(templateMismatches([game, core, twoD])).toEqual([])
    const ahead = { manifest: { name: '@automataframework/core', version: '0.1.0' } }
    expect(templateMismatches([game, ahead])).toEqual([
      'create-automata 0.0.1 makes games that ask for @automataframework/core at its own version, but @automataframework/core is 0.1.0.',
    ])
  })
})

const npmSays =
  (status: number, stderr = '') =>
  () => ({ status, stderr })

describe('upload', () => {
  test('publishes the tarball under the preview tag with provenance', () => {
    let asked: string[] = []
    const run = (command: string, args: string[]) => {
      asked = [command, ...args]
      return { status: 0, stderr: '' }
    }
    expect(upload('/t/a.tgz', '1.0.0-preview.1', run)).toBe('published')
    expect(asked).toEqual(['npm', 'publish', '/t/a.tgz', '--tag', 'preview', '--access', 'public', '--provenance'])
  })

  test('counts "cannot publish over" for this version as already published', () => {
    const stderr =
      'npm error 403 Forbidden - PUT https://registry.npmjs.org/a - You cannot publish over the previously published versions: 1.0.0-preview.1.'
    expect(upload('/t/a.tgz', '1.0.0-preview.1', npmSays(1, stderr))).toBe('already')
  })

  test('stays red on any other failure, or "cannot publish over" for another version', () => {
    expect(() => upload('/t/a.tgz', '1.0.0-preview.1', npmSays(1, 'npm error 401 Unauthorized'))).toThrow('failed')
    const other = 'You cannot publish over the previously published versions: 1.0.0-preview.10.'
    expect(() => upload('/t/a.tgz', '1.0.0-preview.1', npmSays(1, other))).toThrow('failed')
  })
})
