import type { Inputs, PlayerInput } from '../game/game.ts'
import type { Bindings, Controls } from './controls.ts'

type Events = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
/** Where input comes from. The browser's own by default; a test hands in its own. */
export type InputEnv = { events: Events; pads(): (Gamepad | null)[] }
type Vector = [number, number]

const deadzone = 0.2
const browserEnv = (): InputEnv => ({
  events: globalThis,
  pads: () => Array.from(globalThis.navigator?.getGamepads?.() ?? []),
})

const press = (pad: Gamepad, button: number): boolean => pad.buttons[button]?.pressed === true
const axis = (pad: Gamepad, index: number): number => pad.axes[index] ?? 0

/** One pad input as true or false: `button:3`, `axis:0:+` or `axis:0:-`. */
function padDown(pad: Gamepad, id: string): boolean {
  const [kind, index, sign] = id.split(':')
  const n = Number(index)
  if (kind === 'button') return press(pad, n)
  if (kind === 'axis') return sign === '-' ? axis(pad, n) < -0.5 : axis(pad, n) > 0.5
  return false
}

/** One pad input as a push in two directions: `stick:left`, `stick:right` or `dpad`. Down is positive, as on the screen. */
function padVector(pad: Gamepad, id: string): Vector {
  if (id === 'dpad')
    return [Number(press(pad, 15)) - Number(press(pad, 14)), Number(press(pad, 13)) - Number(press(pad, 12))]
  if (id !== 'stick:left' && id !== 'stick:right') return [0, 0]
  const start = id === 'stick:left' ? 0 : 2
  const vector: Vector = [axis(pad, start), axis(pad, start + 1)]
  const length = Math.hypot(...vector)
  if (length < deadzone) return [0, 0]
  return length > 1 ? [vector[0] / length, vector[1] / length] : vector
}

const nonzero = (vector: Vector | undefined): vector is Vector =>
  vector !== undefined && (vector[0] !== 0 || vector[1] !== 0)

/**
 * Reads the keyboard, the gamepads and the touch controls into the `Inputs` a game's `update` takes, one entry per
 * entry of `bindings` (player 1 first). When two kinds are used at once, touch beats the pad and the pad beats the keys.
 * Player `n` reads only the pad with index `n` and only the keys in `bindings[n]`.
 */
export function readInputs(controls: Controls, bindings: Bindings[], env: InputEnv = browserEnv()) {
  const held = new Set<string>()
  const keysPending = new Set<string>()
  const touchHeld = new Map<string, boolean | Vector>()
  const touchPending = new Set<string>()
  const latched = new Set<string>()
  const wasDown = new Set<string>()
  const seenPads = new Set<number>()
  let used: 'touch' | 'pad' | 'keys' = 'keys'
  let padBusy = false

  const onDown = (event: Event): void => {
    const code = (event as KeyboardEvent).code
    held.add(code)
    keysPending.add(code)
    used = 'keys'
  }
  const onUp = (event: Event): void => void held.delete((event as KeyboardEvent).code)
  const onBlur = (): void => held.clear()
  env.events.addEventListener('keydown', onDown)
  env.events.addEventListener('keyup', onUp)
  env.events.addEventListener('blur', onBlur)

  /** Which player's pads are there, and which were there and have gone. */
  function scan(pads: (Gamepad | null)[]): { pad: (player: number) => Gamepad | undefined; missing: number[] } {
    const pad = (player: number): Gamepad | undefined =>
      pads.find((one) => one?.connected && one.index === player) ?? undefined
    const missing: number[] = []
    let busy = false
    for (let player = 0; player < bindings.length; player += 1) {
      const one = pad(player)
      if (one) {
        seenPads.add(player)
        busy ||= one.buttons.some((button) => button.pressed) || one.axes.some((value) => Math.abs(value) > 0.5)
      } else if (seenPads.has(player)) missing.push(player)
    }
    if (busy && !padBusy) used = 'pad'
    padBusy = busy
    return { pad, missing }
  }

  const keyOn = (code: string | undefined): number =>
    code !== undefined && (held.has(code) || keysPending.has(code)) ? 1 : 0
  const keyVector = (codes: string[]): Vector => [keyOn(codes[1]) - keyOn(codes[0]), keyOn(codes[3]) - keyOn(codes[2])]

  return {
    /** The inputs for this tick. A press that began and ended since the last call still counts once. */
    read(): Inputs {
      const { pad } = scan(env.pads())
      const inputs = bindings.map((own, player): PlayerInput => {
        const down: string[] = []
        const sticks: Record<string, Vector> = {}
        const one = pad(player)
        for (const action of controls.actions) {
          const key = `${player}:${action.id}`
          const codes = own.keys[action.id] ?? []
          const padIds = own.pad[action.id] ?? []
          const touch = touchHeld.get(key)
          if (action.kind === 'stick') {
            const fromTouch = Array.isArray(touch) ? touch : undefined
            const fromPad = one ? padIds.map((id) => padVector(one, id)).find(nonzero) : undefined
            const chosen = [fromTouch, fromPad, keyVector(codes)].find(nonzero)
            if (chosen) sticks[action.id] = chosen
            continue
          }
          const raw =
            touch === true ||
            touchPending.has(key) ||
            (one !== undefined && padIds.some((id) => padDown(one, id))) ||
            codes.some((code) => held.has(code) || keysPending.has(code))
          if (own.tap.includes(action.id) && action.canTap === true) {
            if (raw && !wasDown.has(key)) {
              if (latched.has(key)) latched.delete(key)
              else latched.add(key)
            }
            if (latched.has(key)) down.push(action.id)
          } else if (raw) down.push(action.id)
          if (raw) wasDown.add(key)
          else wasDown.delete(key)
        }
        return { down, sticks }
      })
      keysPending.clear()
      touchPending.clear()
      return inputs
    },
    /** Which kind of control was used last, so the game can show the right buttons. */
    lastUsed: (): 'touch' | 'pad' | 'keys' => used,
    /** The players (0 is player 1) whose gamepad was there and is not any more. */
    padsMissing: (): number[] => scan(env.pads()).missing,
    /** What the on-screen controls call: a button is held (`true`) or let go (`false`); a stick is pushed `[x, y]` or let go. */
    touch(action: string, value: boolean | Vector, player = 0): void {
      const key = `${player}:${action}`
      const released = value === false || (Array.isArray(value) && !nonzero(value))
      if (released) touchHeld.delete(key)
      else {
        touchHeld.set(key, value)
        touchPending.add(key)
        used = 'touch'
      }
    },
    /** Stops listening. */
    stop(): void {
      env.events.removeEventListener('keydown', onDown)
      env.events.removeEventListener('keyup', onUp)
      env.events.removeEventListener('blur', onBlur)
    },
  }
}
