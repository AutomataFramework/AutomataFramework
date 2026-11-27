import { expect, test } from 'bun:test'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Sidecar, sidecarPath, sidecarProblems, writeSidecar } from '../../../src/features/sidecar/sidecar.ts'

const good: Sidecar = {
  prompt: 'a knight',
  model: 'm',
  seed: 3,
  madeAt: '2026-11-27T14:00:00.000Z',
  steps: ['x'],
  cost: 0.008,
}

test('a picture keeps its sidecar beside it', () => {
  expect(sidecarPath('/a/hero.png')).toBe('/a/hero.art.json')
  const dir = mkdtempSync(join(tmpdir(), 'sidecar-'))
  expect(writeSidecar(join(dir, 'hero.png'), good)).toBe(join(dir, 'hero.art.json'))
  expect(existsSync(join(dir, 'hero.art.json'))).toBe(true)
})

test('each missing or wrong field is named, and an incomplete sidecar is never written', () => {
  for (const field of Object.keys(good)) {
    const { [field as keyof Sidecar]: _, ...rest } = good
    expect(sidecarProblems(rest)).toContain(`The sidecar has no "${field}".`)
  }
  expect(sidecarProblems({ ...good, seed: 1.5, cost: -1, steps: [] })).toHaveLength(3)
  const dir = mkdtempSync(join(tmpdir(), 'sidecar-'))
  expect(() => writeSidecar(join(dir, 'hero.png'), { ...good, prompt: '' })).toThrow('"prompt" must be words.')
  expect(existsSync(join(dir, 'hero.art.json'))).toBe(false)
})
