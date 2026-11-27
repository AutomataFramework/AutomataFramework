import { type SoundOptions, takeSounds } from './queue.ts'

type Bus = 'master' | 'music' | 'effects'

/**
 * Sound through the Web Audio API: a master volume with a music bus and an effects bus under it. Browsers keep sound
 * off until the person first touches or presses something, so it wakes on the first one.
 */
export function createAudio() {
  const context = new AudioContext()
  const master = context.createGain()
  master.connect(context.destination)
  const buses: Record<Bus, GainNode> = { master, music: context.createGain(), effects: context.createGain() }
  for (const bus of [buses.music, buses.effects]) bus.connect(master)
  const sounds = new Map<string, AudioBuffer>()
  const playing = new Map<string, Set<AudioBufferSourceNode>>()
  // The volumes as they were last set. `gain` answers from these, not from the nodes: while sound is running, reading a
  // node's `gain.value` straight after setting it can give the value from before, because the audio thread writes it too.
  const levels: Record<Bus, number> = { master: 1, music: 1, effects: 1 }
  let muted = false
  const level = (bus: Bus): number => (bus === 'master' && muted ? 0 : levels[bus])
  const apply = (bus: Bus): void => {
    buses[bus].gain.value = level(bus)
  }

  const wake = (): void => void context.resume().catch(() => {})
  for (const type of ['pointerdown', 'keydown'] as const) globalThis.addEventListener?.(type, wake, { once: true })

  function play(id: string, options: SoundOptions = {}): void {
    const buffer = sounds.get(id)
    if (!buffer) return
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = options.loop === true
    const volume = context.createGain()
    volume.gain.value = options.volume ?? 1
    source.connect(volume).connect(buses[options.bus ?? 'effects'])
    const voices = playing.get(id) ?? new Set<AudioBufferSourceNode>()
    playing.set(id, voices)
    voices.add(source)
    source.addEventListener('ended', () => voices.delete(source))
    source.start()
  }

  return {
    play,
    /** Makes a sound ready to play by its id, from the bytes of a sound file. */
    async load(id: string, bytes: ArrayBuffer): Promise<void> {
      sounds.set(id, await context.decodeAudioData(bytes))
    },
    /** Plays what the game asked for with `playSound` since the last call. Call it once a frame. */
    playQueued(): void {
      for (const sound of takeSounds()) play(sound.id, sound.options)
    },
    stop(id: string): void {
      for (const source of playing.get(id) ?? []) source.stop()
    },
    setGain(bus: Bus, value: number): void {
      levels[bus] = Math.min(1, Math.max(0, value))
      apply(bus)
    },
    mute(on: boolean): void {
      muted = on
      apply('master')
    },
    /** The volume a bus is set to, between 0 and 1: what its gain node is given. The master reads 0 while muted. */
    gain: (bus: string): number => (Object.hasOwn(levels, bus) ? level(bus as Bus) : 0),
  }
}
