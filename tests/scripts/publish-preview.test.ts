import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { onNpm, previewVersion, publishable, withVersion } from '../../scripts/publish-preview.ts'

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
