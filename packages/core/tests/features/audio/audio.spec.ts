// Criterion 4: the volumes are real gain nodes, and mute puts the master at 0.
import { expect, test } from '@playwright/test'
import { openCorePage } from '../../lib/browser-page.ts'

type Audio = {
  setGain(bus: string, value: number): void
  mute(on: boolean): void
  gain(bus: string): number
  load(id: string, bytes: ArrayBuffer): Promise<void>
  playQueued(): void
}
declare global {
  interface Window {
    audio: Audio
  }
}

test.beforeEach(async ({ page }) => {
  await openCorePage(page)
  await page.evaluate(async () => {
    const { createAudio } = await import(`${'/src/browser.ts'}`)
    window.audio = createAudio()
  })
})

test("setGain('music', 0.3) reads back 0.3 from the gain node, and the other buses are not moved", async ({ page }) => {
  const read = await page.evaluate(() => {
    window.audio.setGain('music', 0.3)
    return ['music', 'effects', 'master'].map((bus) => window.audio.gain(bus))
  })
  expect(read[0]).toBeCloseTo(0.3, 5)
  expect(read.slice(1)).toEqual([1, 1])
})

test('mute(true) puts the master at 0 and mute(false) brings back the volume it had', async ({ page }) => {
  const read = await page.evaluate(() => {
    const { audio } = window
    audio.setGain('master', 0.5)
    audio.mute(true)
    const muted = audio.gain('master')
    audio.setGain('master', 0.25)
    const stillMuted = audio.gain('master')
    audio.mute(false)
    return [muted, stillMuted, audio.gain('master')]
  })
  expect(read.slice(0, 2)).toEqual([0, 0])
  expect(read[2]).toBeCloseTo(0.25, 5)
})

test('a volume stays between 0 and 1', async ({ page }) => {
  const read = await page.evaluate(() => {
    window.audio.setGain('effects', 3)
    const high = window.audio.gain('effects')
    window.audio.setGain('effects', -1)
    return [high, window.audio.gain('effects')]
  })
  expect(read).toEqual([1, 0])
})

test('a loaded sound plays what the game asked for, and the list is emptied', async ({ page }) => {
  const left = await page.evaluate(async () => {
    const { takeSounds } = await import(`${'/src/features/audio/queue.ts'}`)
    const { playSound } = await import(`${'/src/features/audio/queue.ts'}`)
    // A tenth of a second of silence as a WAV file: 16-bit, mono, 8000 samples a second.
    const samples = 800
    const bytes = new ArrayBuffer(44 + samples * 2)
    const view = new DataView(bytes)
    const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
    text(0, 'RIFF')
    view.setUint32(4, 36 + samples * 2, true)
    text(8, 'WAVEfmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 8000, true)
    view.setUint32(28, 16000, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    text(36, 'data')
    view.setUint32(40, samples * 2, true)
    await window.audio.load('blip', bytes)
    playSound('blip')
    playSound('missing')
    window.audio.playQueued()
    return takeSounds().length
  })
  expect(left).toBe(0)
})
