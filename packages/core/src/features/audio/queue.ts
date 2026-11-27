export type SoundOptions = { volume?: number; bus?: 'effects' | 'music'; loop?: boolean }
export type QueuedSound = { id: string; options: SoundOptions }

const limit = 256
const queue: QueuedSound[] = []

/** Asks for a sound. A game's `update` calls this; it only writes a line in a list. The browser plays the list (`createAudio().playQueued()`); in Node nobody does, so it is silent and keeps no more than the newest 256. */
export function playSound(id: string, options: SoundOptions = {}): void {
  queue.push({ id, options })
  if (queue.length > limit) queue.shift()
}

/** Hands over the sounds asked for since the last call, and forgets them. */
export function takeSounds(): QueuedSound[] {
  return queue.splice(0)
}
