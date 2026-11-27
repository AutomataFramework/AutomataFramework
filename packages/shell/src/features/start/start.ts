import {
  type Game,
  type Inputs,
  type Problem,
  type State,
  createFeed,
  createSaves,
  defaultBindings,
  loadGame,
  newState,
  step,
} from '@automataframework/core'
import { browserStore, readInputs, startLoop } from '@automataframework/core/browser'
import { frameStats, openStage } from '@automataframework/2d'
import { mount } from 'svelte'
import { get, writable } from 'svelte/store'
import * as shellMessages from '../../../compiled/messages.js'
import { questionScreen, somethingWentWrong } from '../error/error.ts'
import { type Credits, type Flow, type Hud, type Screen, type Theme, defineShellKinds } from '../formats/formats.ts'
import { createFlow, flowProblems } from '../flow/flow.ts'
import { type Host, type View } from '../host/host.ts'
import Shell from '../screens/Shell.svelte'
import { readPath } from '../hud/read-path.ts'
import { createSettings } from '../settings/settings.ts'
import { registerFonts } from '../theme/css.ts'
import { lookOf } from '../theme/default.ts'
import { type Messages, createWords } from '../words/words.ts'

export type StartOptions = {
  /** Where the game goes. The whole page by default. */
  root?: HTMLElement
  /** The game's own words, compiled by Paraglide: `import * as messages from './paraglide/messages.js'`. */
  messages?: Messages
}

const readText = (path: string): Promise<string> =>
  fetch(path).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${path} is not there.`))))
const readBlob = (path: string): Promise<Blob> =>
  fetch(path).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${path} is not there.`))))

const nothing = (_event: string): void => undefined

const lineOf = (text: string, name: string): number => {
  const at = text.split('\n').findIndex((line) => line.includes(`"${name}"`))
  return at < 0 ? 1 : at + 1
}

/** Mistakes in a game's files, written on the page for a person. No game starts. */
function say(root: HTMLElement, problems: Problem[]): void {
  const box = document.createElement('div')
  box.setAttribute('role', 'alert')
  box.style.cssText =
    'position:absolute;inset:0;overflow:auto;padding:1em;background:#000;color:#fff;font:17px/1.4 system-ui,sans-serif;white-space:pre-wrap'
  box.textContent = problems.map((p) => `${p.file}, line ${p.line}: ${p.message} ${p.fix}`).join('\n')
  root.replaceChildren(box)
}

/**
 * The whole of a game's main file: loads the game's files, draws its screens from them over the canvas, and plays it.
 * A mistake in a file is written on the page and no game starts. `window.__automata` is there from the start, and
 * `ready` is true once the first frame is on the screen.
 */
export function startGame<G>(game: Game<G>, options: StartOptions = {}): void {
  const root = options.root ?? document.body
  const feed = createFeed()
  let state: State<G> | undefined
  let place = 'loading'
  let send = nothing
  const api = {
    ready: false,
    state: () => state as State<G>,
    stats: () => ({ ticks: state?.tick ?? 0, ...frameStats() }),
    feed: (inputs: Inputs | null) => feed.hold(inputs),
    feedRuns: (runs: [number, Inputs][]) => feed.runs(runs),
    /** Does what a button does: `send('new-game')`. An event the screen does not handle changes nothing. */
    send: (event: string) => send(event),
    /** The name of the flow state the player is in. */
    screen: () => place,
  }
  Object.assign(window, { __automata: api })
  begin(
    game,
    root,
    options,
    feed,
    api,
    (next) => (state = next),
    (fn) => (send = fn),
    (name) => (place = name),
  ).catch((error: unknown) =>
    say(root, [
      {
        file: 'the game',
        line: 1,
        message: `It cannot start here. ${error instanceof Error ? error.message : String(error)}`,
        fix: 'Check the files and reload.',
      },
    ]),
  )
}

async function begin<G>(
  game: Game<G>,
  root: HTMLElement,
  options: StartOptions,
  feed: ReturnType<typeof createFeed>,
  api: { ready: boolean },
  setState: (state: State<G>) => State<G>,
  setSend: (send: (event: string) => void) => void,
  setPlace: (name: string) => void,
): Promise<void> {
  defineShellKinds()
  const loaded = await loadGame(readText)
  if (!loaded.ok) return say(root, loaded.problems)
  const { manifest, files } = loaded.value
  const ofKind = <T>(kind: string): T[] => manifest.content.filter((c) => c.kind === kind).map((c) => files[c.id] as T)
  const flow = ofKind<Flow>('flow')[0]
  const screens = new Map(ofKind<Screen>('screen').map((s) => [s.id, s]))
  const huds = new Map(ofKind<Hud>('hud').map((h) => [h.id, h]))
  if (!flow)
    return say(root, [
      {
        file: 'automata.json',
        line: 1,
        message: 'No "flow" file is listed.',
        fix: 'List a flow file that says which screen comes first.',
      },
    ])
  const flowPath = manifest.content.find((c) => c.kind === 'flow')?.path ?? 'flow'
  const links = flowProblems(flow, new Set(screens.keys()), new Set(huds.keys()))
  if (links.length > 0) {
    const text = await readText(flowPath).catch(() => '')
    return say(
      root,
      links.map((p) => ({ file: flowPath, line: lineOf(text, p.name), message: p.message, fix: p.fix })),
    )
  }

  const look = lookOf(ofKind<Theme>('theme')[0])
  const store = browserStore()
  const saves = createSaves(store, manifest.id, () => Date.now())
  const settings = createSettings(store, manifest.id, manifest.languages, navigator.languages)
  const words = createWords({ game: options.messages, shell: shellMessages, plain: { gameName: manifest.name } }, () =>
    settings.get('language'),
  )
  document.documentElement.lang = settings.get('language')

  await registerFonts(manifest.assets, document.fonts)

  // --- the page: the canvas, and the shell over it ---
  if (root === document.body) {
    document.body.style.cssText = 'margin:0;background:#000'
    document.documentElement.style.cssText = 'background:#000'
  }
  const box = document.createElement('div')
  box.style.cssText = `position:${root === document.body ? 'fixed' : 'absolute'};inset:0;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center`
  root.replaceChildren(box)
  const stage = await openStage({ manifest, pixelArt: look.pixelArt, parent: box, read: readBlob })
  const fit = (): void => stage.fit(box.clientWidth, box.clientHeight)
  new ResizeObserver(fit).observe(box)
  fit()

  // --- the game ---
  const controls = ofKind<import('@automataframework/core').Controls>('controls')[0]
  const reader = controls ? readInputs(controls, defaultBindings(controls)) : undefined
  let pointer: [number, number] | null = null
  stage.canvas.addEventListener('pointerdown', (e) => (pointer = stage.pointAt(e.clientX, e.clientY)))
  stage.canvas.addEventListener('pointermove', (e) => pointer && (pointer = stage.pointAt(e.clientX, e.clientY)))
  window.addEventListener('pointerup', () => (pointer = null))
  const real = (): Inputs => {
    const inputs = reader?.read() ?? [{ down: [], sticks: {} }]
    const first = inputs[0]
    if (first && pointer) {
      first.down = [...first.down, 'pointer']
      first.sticks = { ...first.sticks, pointer }
    }
    return inputs
  }

  let current = setState(newState(game, { players: 1, seed: 1 }))
  let playing = false
  let slot = '1'
  const newGame = (): void => {
    const empty = (['1', '2', '3'] as const).find((s) => !saves.list().some((row) => row.slot === s))
    slot = empty ?? '1'
    current = setState(newState(game, { players: 1, seed: Date.now() & 0x7fffffff || 1 }))
  }
  const hasSave = writable(saves.list().length > 0)
  const refreshSaves = (): void => hasSave.set(saves.list().length > 0)

  // --- what is on the screen ---
  const view = writable<View>({ kind: 'none' })
  const hudValues = writable<string[]>([])
  const width = writable(0)
  const language = writable(settings.get('language'))
  const settingsStore = writable(settings.all())
  const t = writable(words.word)
  settings.subscribe((all) => {
    settingsStore.set(all)
    if (all.language !== get(language)) {
      language.set(all.language)
      document.documentElement.lang = all.language
      t.set((name, inputs) => words.word(name, inputs))
    }
  })
  let keyboard = false
  const flowMachine = createFlow(flow, { startPlaying: manifest.start === 'play' })
  let failed = false
  let hud: Hud | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const host: Host = {
    t,
    settings: settingsStore,
    set: (name, value) => settings.set(name, value),
    send: (event) => sendEvent(event),
    hasSave,
    languages: manifest.languages,
    look,
    stageWidth: width,
    setStageWidth: (w) => width.set(w),
    noteKeyboard: (on = true) => void (keyboard = on),
    saves: () =>
      (['auto', '1', '2', '3'] as const).map((s) => {
        const found = saves.list().find((row) => row.slot === s)
        return { slot: s, empty: !found, savedAt: found?.savedAt ?? 0 }
      }),
    controls: () =>
      (controls?.actions ?? []).map((action) => ({
        id: action.id,
        label: action.label,
        key: action.kind === 'stick' ? 'arrows' : (action.keys[0] ?? '').replace(/^Key/, '').replace(/^Digit/, ''),
      })),
    credits: () => ofKind<Credits>('credits')[0],
    assetUrl: (id) => manifest.assets.find((asset) => asset.id === id)?.path,
  }
  mount(Shell, {
    target: box,
    props: {
      host,
      view,
      get hud() {
        return hud
      },
      hudValues,
      asking: (word: string) => questionScreen(word, words.has),
    },
  })

  function show(): void {
    clearTimeout(timer)
    if (failed) {
      setPlace('error')
      view.set({ kind: 'screen', screen: somethingWentWrong })
    } else {
      const here = flowMachine.place()
      setPlace(here.at)
      if (here.hud !== undefined) {
        hud = huds.get(here.hud)
        playing = true
        view.set({ kind: 'play' })
      } else {
        playing = false
        if (here.asking !== undefined) view.set({ kind: 'ask', word: here.asking })
        else view.set({ kind: 'screen', screen: screens.get(here.screen ?? '') as Screen })
        if (here.after !== undefined && here.asking === undefined)
          timer = setTimeout(() => sendEvent('timeout'), here.after)
      }
    }
    // A screen takes focus for a keyboard, never for a finger.
    if (keyboard && !playing)
      requestAnimationFrame(() =>
        root.querySelector<HTMLElement>('button.item, .splash')?.focus({ preventScroll: true }),
      )
  }

  const saveHere = (): void => {
    if (current.outcome === null) saves.write(slot, current as State<unknown>)
    refreshSaves()
  }
  const loadSlot = (which: string): boolean => {
    const read = saves.read(which)
    if (!read.ok) return false
    slot = which
    current = setState(read.value as State<G>)
    flowMachine.play()
    return true
  }

  function sendEvent(event: string): void {
    if (failed) {
      if (event === 'retry') {
        failed = false
        newGame()
        flowMachine.play()
        loop.resume()
      } else if (event === 'main-menu') {
        failed = false
        flowMachine.to('menu')
        loop.resume()
      } else return
      return show()
    }
    if (event.startsWith('slot-')) {
      const which = event.slice(5)
      if (!loadSlot(which)) {
        slot = which
        newGame()
        slot = which
        flowMachine.play()
      }
      return show()
    }
    if (event === 'continue' && !flowMachine.handles('continue')) {
      const newest = saves.list().toSorted((a, b) => b.savedAt - a.savedAt)[0]
      if (newest && loadSlot(newest.slot)) show()
      return
    }
    const before = flowMachine.place()
    if (!flowMachine.send(event)) return
    const after = flowMachine.place()
    if (after.hud !== undefined && before.hud === undefined && (event === 'new-game' || event === 'retry')) newGame()
    if (before.hud !== undefined && after.hud === undefined && event === 'pause') saveHere()
    show()
  }
  setSend(sendEvent)

  // --- the loop: only the game stops when it fails; the screens above keep working ---
  const loop = startLoop({
    step(): void {
      if (!playing) return
      const begun = performance.now()
      current = setState(step(game, current, feed.next(real)))
      stage.timeUpdate(performance.now() - begun)
      if (current.outcome !== null) sendEvent(current.outcome)
    },
    draw(): void {
      stage.draw(game, current)
      if (playing) {
        const next = (hud?.items ?? []).map((item) => readPath(current, item.shows))
        if (next.join('\u0000') !== get(hudValues).join('\u0000')) hudValues.set(next)
      }
      api.ready = true
    },
    onError(error: unknown): void {
      console.error(error)
      failed = true
      show()
    },
  })
  // A hidden page stops the loop and, in play, pauses the game; coming back never runs a burst of missed ticks.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      loop.pause()
      if (playing) sendEvent('pause')
    } else if (!failed) loop.resume()
  })

  if (manifest.start === 'play') newGame()
  show()
}
