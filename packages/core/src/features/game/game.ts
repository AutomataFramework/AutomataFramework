export type Player = { id: number }
export type State<G> = {
  tick: number
  seed: number
  players: Player[]
  outcome: null | 'win' | 'lose'
  /** The named place for the physics world's saved form (slice 3). Always null in 1a. */
  physics: unknown
  game: G
}
export type PlayerInput = { down: string[]; sticks: Record<string, [number, number]> }
/** One per player, in the same order as `state.players`. */
export type Inputs = PlayerInput[]
export type Start = { players: number; seed: number }
export type Game<G> = {
  init(start: Start): G
  /** May change the state and return it. Runs in plain Node: no drawing, no clock, no `Math.random`. */
  update(state: State<G>, inputs: Inputs): State<G>
  draw?(state: State<G>): void
}

export function newState<G>(game: Game<G>, start: Start): State<G> {
  resetInputs()
  return {
    tick: 0,
    seed: start.seed | 0,
    players: Array.from({ length: start.players }, (_, id) => ({ id })),
    outcome: null,
    physics: null,
    game: game.init(start),
  }
}

export const win = (state: State<unknown>): void => {
  state.outcome ??= 'win'
}
export const lose = (state: State<unknown>): void => {
  state.outcome ??= 'lose'
}

// Input is held here, not in the state, so `update` reads it with plain calls like `isDown('left')`.
let now: Inputs = []
let before: Inputs = []

function resetInputs(): void {
  now = []
  before = []
}
/** Used by `step`: makes `inputs` the ones the game's functions read. */
export function setInputs(inputs: Inputs): void {
  before = now
  now = inputs
}

export const isDown = (action: string, player = 0): boolean => now[player]?.down.includes(action) ?? false
/** True for the one tick where the action went down. */
export const wasPressed = (action: string, player = 0): boolean =>
  isDown(action, player) && !(before[player]?.down.includes(action) ?? false)
export const stick = (action: string, player = 0): [number, number] => now[player]?.sticks[action] ?? [0, 0]
