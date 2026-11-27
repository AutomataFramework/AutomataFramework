import type { Flow } from '../formats/formats.ts'

/** Where the player is: on a screen, playing, or being asked a question over either. */
export type Place = {
  /** The flow's name for this state. */
  at: string
  screen?: string | undefined
  hud?: string | undefined
  /** Set while a question is up: the word that asks it. */
  asking?: string | undefined
  /** Milliseconds until `timeout` happens by itself, when this state says so. */
  after?: number | undefined
}

/**
 * The flow file as a plain machine. An event moves the player from one state to the next by the state's `on`. `back`
 * goes to where the player came from unless the state says otherwise. A target `{ ask, yes }` asks first: `ask-yes`
 * goes on, `ask-no` (or `back`) stays. Built-in events are skip, timeout, new-game, continue, pause, resume, win,
 * lose, retry and back; a flow may add its own.
 */
export function createFlow(flow: Flow, options: { startPlaying?: boolean } = {}) {
  const playing = Object.entries(flow.screens).find(([, state]) => state.hud !== undefined)?.[0]
  let at = options.startPlaying && playing ? playing : flow.start
  let stack: string[] = []
  let question: { word: string; yes: string } | undefined

  const place = (): Place => {
    const state = flow.screens[at]
    return { at, screen: state?.screen, hud: state?.hud, asking: question?.word, after: state?.after }
  }
  function go(target: string): void {
    const seen = stack.indexOf(target)
    if (seen >= 0) stack = stack.slice(0, seen)
    else if (target !== at) stack = [...stack, at]
    at = target
    question = undefined
  }

  return {
    place,
    /** True when the event changed where the player is. */
    send(event: string): boolean {
      if (question) {
        if (event === 'ask-yes') go(question.yes)
        else if (event === 'ask-no' || event === 'back') question = undefined
        else return false
        return true
      }
      const target = flow.screens[at]?.on[event]
      if (target === undefined) {
        if (event !== 'back' || stack.length === 0) return false
        const previous = stack.at(-1) as string
        stack = stack.slice(0, -1)
        at = previous
        return true
      }
      if (typeof target === 'string') go(target)
      else question = { word: target.ask, yes: target.yes }
      return true
    },
    /** Goes straight to a named state, forgetting the way back. */
    to(name: string): void {
      at = name in flow.screens ? name : flow.start
      stack = []
      question = undefined
    },
    /** Goes straight to the state that plays the game (a saved game being continued). */
    play(): boolean {
      if (!playing) return false
      stack = []
      question = undefined
      at = playing
      return true
    },
    /** True when the state handles this event. */
    handles: (event: string): boolean => flow.screens[at]?.on[event] !== undefined,
  }
}

/** What is wrong with the flow's links to the other files, one plain sentence each. */
export function flowProblems(
  flow: Flow,
  screens: Set<string>,
  huds: Set<string>,
): { name: string; message: string; fix: string }[] {
  const found: { name: string; message: string; fix: string }[] = []
  const known = new Set(Object.keys(flow.screens))
  const unknown = (name: string, message: string, fix: string): number => found.push({ name, message, fix })
  if (!known.has(flow.start))
    unknown(flow.start, `The flow starts at "${flow.start}", which it does not have.`, 'Start at one of its screens.')
  for (const [name, state] of Object.entries(flow.screens)) {
    if ((state.screen === undefined) === (state.hud === undefined))
      unknown(name, `"${name}" must show either a screen or a hud.`, 'Give it a "screen" or a "hud", not both.')
    if (state.screen !== undefined && !screens.has(state.screen))
      unknown(
        state.screen,
        `"${name}" shows the screen "${state.screen}", which is not in automata.json.`,
        'List that screen file, or use another.',
      )
    if (state.hud !== undefined && !huds.has(state.hud))
      unknown(
        state.hud,
        `"${name}" shows the hud "${state.hud}", which is not in automata.json.`,
        'List that hud file, or use another.',
      )
    for (const target of Object.values(state.on)) {
      const to = typeof target === 'string' ? target : target.yes
      if (!known.has(to))
        unknown(to, `"${name}" goes to "${to}", which the flow does not have.`, 'Go to one of its screens.')
    }
  }
  return found
}
