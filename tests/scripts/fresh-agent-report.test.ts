import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { filesWithKeys, gameMade, overCeiling, readClaude, readOpenCode } from '../../scripts/fresh-agent-report.ts'

describe('gameMade', () => {
  test('needs a page with a script and the win words', () => {
    expect(gameMade('<html><script>go()</script><p>You win</p></html>')).toBe(true)
    expect(gameMade('<html><p>You win</p></html>')).toBe(false)
    expect(gameMade('<script></script>')).toBe(false)
    expect(gameMade(null)).toBe(false)
  })
})

describe('readClaude', () => {
  test('reads the dollars, the tokens and the models', () => {
    const text = JSON.stringify({
      total_cost_usd: 0.4123,
      usage: {
        input_tokens: 10,
        output_tokens: 2000,
        cache_read_input_tokens: 30000,
        cache_creation_input_tokens: 5000,
      },
      modelUsage: { 'claude-sonnet-5-5': {}, 'claude-haiku-5-5': {} },
    })
    expect(readClaude(text)).toEqual({
      model: 'claude-sonnet-5-5, claude-haiku-5-5',
      tokens: { input: 10, output: 2000, cacheRead: 30000, cacheWrite: 5000 },
      usd: 0.4123,
    })
  })

  test('counts what is missing as nothing', () => {
    expect(readClaude('{}')).toEqual({
      model: 'unknown',
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      usd: 0,
    })
  })
})

const step = (input: number, output: number, cost: number): string =>
  JSON.stringify({
    type: 'step_finish',
    part: { type: 'step-finish', cost, tokens: { input, output, reasoning: 1, cache: { read: 2, write: 3 } } },
  })

describe('readOpenCode', () => {
  test('sums the finished steps and skips every other line', () => {
    const text = [step(100, 10, 0.01), 'not json', JSON.stringify({ part: { type: 'text' } }), step(50, 5, 0.02)].join(
      '\n',
    )
    const read = readOpenCode(text)
    expect(read.tokens).toEqual({ input: 150, output: 17, cacheRead: 4, cacheWrite: 6 })
    expect(read.usd).toBeCloseTo(0.03)
  })
})

const key = (data: object): string => JSON.stringify({ data })

describe('overCeiling', () => {
  test('refuses a key with no credit limit', () => {
    expect(overCeiling(key({ limit: null, limit_remaining: null, usage: 0 }), 10)).toContain('no credit limit')
  })

  test('refuses a key with more left than the ceiling', () => {
    expect(overCeiling(key({ limit: 50, limit_remaining: 40 }), 10)).toContain('over the $10 ceiling')
  })

  test('lets a key through when what is left is at most the ceiling', () => {
    expect(overCeiling(key({ limit: 10, limit_remaining: 9.5 }), 10)).toBeNull()
    expect(overCeiling(key({ limit: 10, limit_remaining: 10 }), 10)).toBeNull()
  })
})

describe('filesWithKeys', () => {
  const folder = mkdtempSync(join(tmpdir(), 'keep-'))
  writeFileSync(join(folder, 'index.html'), '<script>const key = "sk-or-v1-abcdef0123456789"</script>')
  writeFileSync(join(folder, 'report.json'), '{"usd": 0.1}')
  mkdirSync(join(folder, 'below'))

  test('names each file that holds a key', () => {
    expect(filesWithKeys(folder, ['sk-or-v1-abcdef0123456789'])).toEqual(['index.html'])
  })

  test('finds nothing when no file holds one', () => {
    expect(filesWithKeys(folder, ['sk-ant-0000000000000000'])).toEqual([])
  })

  test('refuses to pass when no key was given, since that would check nothing', () => {
    expect(() => filesWithKeys(folder, ['', ' '])).toThrow('No key')
  })
})
