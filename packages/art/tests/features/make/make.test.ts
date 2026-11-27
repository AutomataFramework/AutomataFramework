import { expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from '../../../src/bin.ts'
import type { Cleaned } from '../../../src/features/clean/clean.ts'
import { monthSpend, readLedger } from '../../../src/features/make/ledger.ts'
import { type Deps, makeArt, reviewArt } from '../../../src/features/make/make.ts'
import { MODELS } from '../../../src/features/make/models.ts'
import { sidecarPath, sidecarProblems } from '../../../src/features/sidecar/sidecar.ts'

const NOW = new Date('2026-11-27T14:00:00Z')
const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])

/** A stand-in fal.ai: answers each model call with a picture link, and the link with `PNG`. It records every call. */
function standIn(status = 200) {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  const fake = (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : {} })
    if (url.startsWith('https://fal.run/')) {
      if (status !== 200) return new Response('no credit', { status })
      return Response.json({ images: [{ url: 'https://fal.media/made.png' }], seed: 41 })
    }
    return new Response(PNG)
  }) as typeof fetch
  return { fake, calls }
}

// The stand-in cleaner gives back a 2 by 1 picture: one odd colour and one clear pixel.
const cleaned: Cleaned = { width: 2, height: 1, rgba: Uint8Array.from([1, 2, 250, 255, 9, 9, 9, 0]), scale: 8 }

function setup(status = 200, cleaner: Deps['clean'] = async () => cleaned) {
  const dir = mkdtempSync(join(tmpdir(), 'art-'))
  const { fake, calls } = standIn(status)
  const deps: Deps = {
    fetch: fake,
    key: 'test-key',
    ledger: join(dir, 'ledger.json'),
    now: () => NOW,
    seed: () => 7,
    clean: cleaner,
  }
  writeFileSync(
    join(dir, 'hero.json'),
    JSON.stringify({ name: 'hero', prompt: 'a small knight, pixel art', folder: 'out' }),
  )
  return { dir, deps, calls, brief: join(dir, 'hero.json') }
}

test('a brief makes a PNG with a complete sidecar, and its call is in the ledger', async () => {
  const { dir, deps, calls, brief } = setup()
  const path = await makeArt(brief, deps)
  expect(path).toBe(join(dir, 'out', 'hero.png'))
  expect([...readFileSync(path).subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const sidecar = JSON.parse(readFileSync(sidecarPath(path), 'utf8'))
  expect(sidecarProblems(sidecar)).toEqual([])
  expect(sidecar).toMatchObject({ prompt: 'a small knight, pixel art', model: MODELS.sprite.id, seed: 41, cost: 0.008 })
  expect(sidecar.madeAt).toBe(NOW.toISOString())
  expect(sidecar.steps).toHaveLength(3)
  expect(calls[0]?.url).toBe(`https://fal.run/${MODELS.sprite.id}`)
  expect(calls[0]?.body).toMatchObject({ prompt: 'a small knight, pixel art', seed: 7 })
  expect(readLedger(deps.ledger)).toEqual([
    { at: NOW.toISOString(), model: MODELS.sprite.id, name: 'hero', cost: 0.008, kept: true },
  ])
})

test('a call whose picture is thrown away still adds its line', async () => {
  const { deps, brief } = setup(200, async () => {
    throw new Error('the cleaner broke')
  })
  await expect(makeArt(brief, deps)).rejects.toThrow('the cleaner broke')
  expect(readLedger(deps.ledger)).toMatchObject([{ kept: false, cost: 0.008 }])
})

test('a call fal.ai refuses adds its line too, and says why', async () => {
  const { deps, brief } = setup(402)
  await expect(makeArt(brief, deps)).rejects.toThrow('fal.ai said no (402)')
  expect(readLedger(deps.ledger)).toMatchObject([{ kept: false }])
})

const line = (at: string, cost: number) => ({ at, model: 'm', name: 'n', cost, kept: true })

test('at $50 this month, no call is made; last month does not count', async () => {
  const { deps, calls, brief } = setup()
  writeFileSync(deps.ledger, JSON.stringify([line('2026-10-30T00:00:00Z', 49), line('2026-11-01T00:00:00Z', 49.995)]))
  expect(monthSpend(readLedger(deps.ledger), NOW)).toBe(49.995)
  await expect(makeArt(brief, deps)).rejects.toThrow('the most is $50')
  expect(calls).toEqual([])
  expect(readLedger(deps.ledger)).toHaveLength(2)
})

test('review sends the picture to the reimagine model and saves the answer beside it', async () => {
  const { dir, deps, calls } = setup()
  const picture = join(dir, 'hero.png')
  writeFileSync(picture, PNG)
  const path = await reviewArt(picture, deps)
  expect(path).toBe(join(dir, 'hero.reimagined.png'))
  expect([...readFileSync(path)]).toEqual([...PNG])
  expect(sidecarProblems(JSON.parse(readFileSync(sidecarPath(path), 'utf8')))).toEqual([])
  expect(calls[0]?.url).toBe(`https://fal.run/${MODELS.reimagine.id}`)
  expect(String((calls[0]?.body['image_urls'] as string[] | undefined)?.[0])).toStartWith('data:image/png;base64,')
  expect(readLedger(deps.ledger)).toMatchObject([{ model: MODELS.reimagine.id, name: 'hero (review)', kept: true }])
})

test('a brief without a good name or prompt is refused in plain words, before any call', async () => {
  const { dir, deps, calls } = setup()
  writeFileSync(join(dir, 'bad.json'), JSON.stringify({ name: 'Hero Run', prompt: 'x' }))
  await expect(makeArt(join(dir, 'bad.json'), deps)).rejects.toThrow('small letters')
  writeFileSync(join(dir, 'bad.json'), JSON.stringify({ name: 'hero' }))
  await expect(makeArt(join(dir, 'bad.json'), deps)).rejects.toThrow('needs a "prompt"')
  expect(calls).toEqual([])
  expect(existsSync(deps.ledger)).toBe(false)
})

test('the command explains itself, and asks for the key before spending', async () => {
  const lines: string[] = []
  expect(await main([], {}, (l) => lines.push(l))).toBe(1)
  expect(lines.join('\n')).toContain('make-art <brief.json> --ledger')
  expect(await main(['hero.json', '--ledger', 'l.json'], {}, (l) => lines.push(l))).toBe(1)
  expect(lines.at(-1)).toBe('There is no fal.ai key. Put it in FAL_KEY and try again.')
})
