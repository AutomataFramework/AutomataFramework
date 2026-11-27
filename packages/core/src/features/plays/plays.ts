import { type Game, type Inputs, type State, newState } from '../game/game.ts'
import { step } from '../game/tick.ts'
import { upgrade } from '../upgrade/upgrade.ts'
import { hashState } from './hash.ts'

/** Every input a player made, in runs of the same inputs, and where the play ended: enough to play it again exactly. */
export type Play = {
  format: 1
  id: string
  game: string
  build: string
  seed: number
  players: number
  runs: [ticks: number, inputs: Inputs][]
  end: { tick: number; hash: string }
}

/** `about` says which game and build made the play; a replay in CI uses it to find the right one. */
export function recordPlay<G>(
  game: Game<G>,
  start: { players: number; seed: number },
  about: { game: string; build: string } = { game: '', build: '' },
): { push(inputs: Inputs): State<G>; finish(): Play } {
  let state = newState(game, start)
  const runs: Play['runs'] = []
  let lastText = ''
  return {
    push(inputs) {
      const copy = structuredClone(inputs)
      const text = JSON.stringify(copy)
      const last = runs[runs.length - 1]
      if (last && text === lastText) last[0] += 1
      else runs.push([1, copy])
      lastText = text
      state = step(game, state, copy)
      return state
    },
    finish: () => ({
      format: 1,
      id: `play-${start.seed}`,
      ...about,
      seed: start.seed,
      players: start.players,
      runs: structuredClone(runs),
      end: { tick: state.tick, hash: hashState(state) },
    }),
  }
}

/** Plays the recording again from its seed. `same` says the end is the very one it was recorded with. */
export function replayPlay<G>(game: Game<G>, play: Play): { state: State<G>; hash: string; same: boolean } {
  const upgraded = upgrade('play', play)
  const file = (upgraded.ok ? upgraded.value : play) as Play
  let state = newState(game, { players: file.players, seed: file.seed })
  if (!upgraded.ok) return { state, hash: '', same: false }
  for (const [ticks, inputs] of file.runs) {
    for (let n = 0; n < ticks; n += 1) state = step(game, state, structuredClone(inputs))
  }
  const hash = hashState(state)
  return { state, hash, same: hash === file.end.hash && state.tick === file.end.tick }
}
