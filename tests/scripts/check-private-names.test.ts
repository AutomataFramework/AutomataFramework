import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hidePath, parseNames, scanText, selfTest, squash } from '../../scripts/check-private-names.ts'

// Made-up names, so this test never holds a real one.
const NAMES = parseNames('Quiet Heron, moss-lantern')
const script = join(import.meta.dir, '../../scripts/check-private-names.ts')

describe('parseNames', () => {
  test('squashes each name and drops blanks and repeats', () => {
    expect(parseNames(' Quiet Heron ,, quiet-heron\nMoss Lantern ')).toEqual(['quietheron', 'mosslantern'])
  })

  test('refuses an empty or missing secret', () => {
    expect(() => parseNames('')).toThrow('empty')
    expect(() => parseNames(undefined)).toThrow('empty')
    expect(() => parseNames(' , ')).toThrow('empty')
  })

  test('refuses a name too short to match safely', () => {
    expect(() => parseNames('ab, Quiet Heron')).toThrow('under 4 letters')
  })
})

describe('scanText', () => {
  test('finds a name however it is spelled, by line', () => {
    const text = 'one\nthe QuietHeron level\ntwo\nquiet_heron\nMOSS LANTERN'
    expect(scanText('f.ts', text, NAMES).map((f) => f.where)).toEqual(['f.ts, line 2', 'f.ts, line 4', 'f.ts, line 5'])
  })

  test('finds a name split across two lines', () => {
    expect(scanText('msg', 'about the quiet\nheron', NAMES)).toEqual([{ where: 'msg (across lines)' }])
  })

  test('finds nothing in clean text, and never puts the name in a finding', () => {
    expect(scanText('f.ts', 'a quiet room with a heron-free lantern', NAMES)).toEqual([])
    const found = scanText('f.ts', 'Quiet Heron', NAMES)
    expect(JSON.stringify(found).toLowerCase()).not.toContain(squash('Quiet Heron'))
  })
})

describe('hidePath', () => {
  test('hides each part of a path that holds a name, in any spelling', () => {
    expect(hidePath('games/Quiet-Heron/a.txt', NAMES)).toBe('games/[hidden]/a.txt')
    expect(hidePath('MOSS_LANTERN.md', NAMES)).toBe('[hidden]')
    expect(hidePath('games/plain/a.txt', NAMES)).toBe('games/plain/a.txt')
  })

  test('hides the whole path when a name runs across its parts', () => {
    expect(hidePath('quiet/heron.txt', NAMES)).toBe('[a hidden path]')
  })
})

describe('selfTest', () => {
  test('catches every name planted in a file, a commit message and a prompt', () => {
    expect(selfTest(NAMES)).toBe(true)
  })
})

const run = (cwd: string, env: Record<string, string>, ...args: string[]): { code: number; out: string } => {
  try {
    const out = execFileSync('node', [script, ...args], {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: 'pipe',
    })
    return { code: 0, out }
  } catch (error) {
    const e = error as { status: number; stdout: string; stderr: string }
    return { code: e.status, out: e.stdout + e.stderr }
  }
}
const repo = (file: string, message: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'names-'))
  const g = (...args: string[]): void => {
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, stdio: 'pipe' })
  }
  g('init', '-q')
  writeFileSync(join(dir, 'a.txt'), file)
  g('add', '.')
  g('commit', '-qm', message)
  return dir
}

// The command as CI runs it, in a throwaway repo, so a name planted in a file, a commit message and a prompt each
// turns it red, and the name never shows in what it prints.
describe('the command', () => {
  const env = { PRIVATE_NAMES: 'Quiet Heron, moss-lantern' }

  test('passes a clean repo', () => {
    expect(run(repo('hello', 'Start'), env).code).toBe(0)
  })

  test('fails on a name in a file', () => {
    const result = run(repo('the Quiet Heron', 'Start'), env)
    expect(result.code).toBe(1)
    expect(result.out).toContain('a.txt, line 1')
  })

  test('fails on a name in a commit message', () => {
    const result = run(repo('hello', 'Add the moss lantern room'), env)
    expect(result.code).toBe(1)
    expect(result.out).toContain('the message of commit')
  })

  test('fails on a name in the pull request description', () => {
    const result = run(repo('hello', 'Start'), { ...env, PR_TITLE: 'A room', PR_BODY: 'For QuietHeron' })
    expect(result.code).toBe(1)
    expect(result.out).toContain('the pull request description')
  })

  test('fails on a name in a prompt', () => {
    const dir = repo('hello', 'Start')
    writeFileSync(join(dir, 'prompt.txt'), 'Make the Moss Lantern game')
    const result = run(dir, env, '--prompt', 'prompt.txt')
    expect(result.code).toBe(1)
    expect(result.out).toContain('the prompt prompt.txt')
  })

  test('prints no name, in any spelling, when one is in a path', () => {
    const dir = repo('hello', 'Start')
    mkdirSync(join(dir, 'games', 'Quiet-Heron'), { recursive: true })
    writeFileSync(join(dir, 'games', 'Quiet-Heron', 'a.txt'), 'the Moss Lantern')
    execFileSync('git', ['add', '.'], { cwd: dir })
    const result = run(dir, env)
    expect(result.code).toBe(1)
    expect(result.out).toContain('the path games/[hidden]/a.txt')
    expect(result.out).toContain('the file games/[hidden]/a.txt, line 1')
    expect(squash(result.out.replace(/::add-mask::.*\n/g, ''))).not.toMatch(/quietheron|mosslantern/)
  })

  test('says plainly what to do on a fork', () => {
    expect(run(repo('hello', 'Start'), { PRIVATE_NAMES: '' }).out).toContain('a maintainer will bring your change')
  })

  test('fails when the secret is missing, and prints no name', () => {
    expect(run(repo('hello', 'Start'), { PRIVATE_NAMES: '' }).code).toBe(1)
    const result = run(repo('the Quiet Heron', 'Start'), env)
    expect(result.out.toLowerCase().replace(/::add-mask::.*\n/g, '')).not.toMatch(/quiet\s*heron|quietheron/)
  })
})
