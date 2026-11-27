import { type Game, type Inputs, type State, setInputs } from './game.ts'

/** Runs `update` once with `inputs` as the ones `isDown` reads. The browser calls this 60 times a second. */
export function step<G>(game: Game<G>, state: State<G>, inputs: Inputs): State<G> {
  setInputs(inputs)
  if (state.outcome !== null) return state
  const next = game.update(state, inputs)
  next.tick += 1
  return next
}
