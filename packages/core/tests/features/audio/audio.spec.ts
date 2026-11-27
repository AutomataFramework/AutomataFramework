// Criterion 4: the volumes are real gain nodes, and mute puts the master at 0. Each test checks both what `gain` answers
// and the gain nodes themselves. A node is read only once the audio thread has caught up (`settled`): read straight after
// it is set, a running node can still give the value from before (run 46017760960 read 0.5 for a muted master).
import { expect, test } from '@playwright/test'
import { openCorePage } from '../../lib/browser-page.ts'

type Audio = {
  setGain(bus: string, value: number): void
  mute(on: boolean): void
  gain(bus: string): number
  load(id: string, bytes: ArrayBuffer): Promise<void>
  playQueued(): void
}
type Bus = 'master' | 'music' | 'effects'
declare global {
  interface Window {
    audio: Audio
    /** The gain nodes, once the audio thread has caught up with what was last set on them. */
    settled(): Promise<Record<Bus, number>>
  }
}

test.beforeEach(async ({ page }) => {
  await openCorePage(page)
  await page.evaluate(async () => {
    // Keeps the gain nodes `createAudio` makes, in the order it makes them: master, then music, then effects.
    const made: GainNode[] = []
    const createGain = AudioContext.prototype.createGain
    AudioContext.prototype.createGain = function (this: AudioContext) {
      const node = createGain.call(this)
      made.push(node)
      return node
    }
    const { createAudio } = await import(`${'/src/browser.ts'}`)
    window.audio = createAudio()
    const [master, music, effects] = made as [GainNode, GainNode, GainNode]
    const context = master.context as AudioContext
    window.settled = async () => {
      // Three blocks of sound after now, the audio thread has taken in every value set before now. A stopped context
      // has no audio thread, so its nodes already read what was set.
      const after = context.currentTime + (3 * 128) / context.sampleRate
      const wait = (): Promise<void> =>
        context.state === 'running' && context.currentTime < after
          ? new Promise((r) => setTimeout(r, 1)).then(wait)
          : Promise.resolve()
      await wait()
      return { master: master.gain.value, music: music.gain.value, effects: effects.gain.value }
    }
  })
})

test("setGain('music', 0.3) reads back 0.3 from the gain node, and the other buses are not moved", async ({ page }) => {
  const { read, nodes } = await page.evaluate(async () => {
    window.audio.setGain('music', 0.3)
    return { read: ['music', 'effects', 'master'].map((bus) => window.audio.gain(bus)), nodes: await window.settled() }
  })
  expect(read[0]).toBeCloseTo(0.3, 5)
  expect(read.slice(1)).toEqual([1, 1])
  expect(nodes.music).toBeCloseTo(0.3, 5)
  expect([nodes.effects, nodes.master]).toEqual([1, 1])
})

test('mute(true) puts the master at 0 and mute(false) brings back the volume it had', async ({ page }) => {
  const { read, nodes } = await page.evaluate(async () => {
    const { audio } = window
    audio.setGain('master', 0.5)
    audio.mute(true)
    const muted = [audio.gain('master'), (await window.settled()).master]
    audio.setGain('master', 0.25)
    const stillMuted = [audio.gain('master'), (await window.settled()).master]
    audio.mute(false)
    const back = [audio.gain('master'), (await window.settled()).master]
    return { read: [muted[0], stillMuted[0], back[0]], nodes: [muted[1], stillMuted[1], back[1]] }
  })
  expect(read.slice(0, 2)).toEqual([0, 0])
  expect(read[2]).toBeCloseTo(0.25, 5)
  expect(nodes.slice(0, 2)).toEqual([0, 0])
  expect(nodes[2]).toBeCloseTo(0.25, 5)
})

test('a volume stays between 0 and 1', async ({ page }) => {
  const read = await page.evaluate(async () => {
    window.audio.setGain('effects', 3)
    const high = [window.audio.gain('effects'), (await window.settled()).effects]
    window.audio.setGain('effects', -1)
    return [...high, window.audio.gain('effects'), (await window.settled()).effects]
  })
  expect(read).toEqual([1, 1, 0, 0])
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
