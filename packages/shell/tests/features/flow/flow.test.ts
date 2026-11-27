import { expect, test } from 'bun:test'
import { type Flow, flowSchema } from '../../../src/features/formats/formats.ts'
import { createFlow, flowProblems } from '../../../src/features/flow/flow.ts'

const flow: Flow = flowSchema.parse({
  format: 1,
  id: 'flow',
  kind: 'flow',
  start: 'splash',
  screens: {
    splash: { screen: 'splash', on: { skip: 'menu', timeout: 'menu' } },
    menu: { screen: 'menu', on: { 'new-game': 'play', continue: 'play', settings: 'settings' } },
    play: { hud: 'hud', on: { pause: 'pause', win: 'win' } },
    pause: {
      screen: 'pause',
      on: { resume: 'play', back: 'play', 'main-menu': { ask: 'askMainMenu', yes: 'menu' } },
    },
    settings: { screen: 'settings', on: {} },
    win: { screen: 'win', on: { retry: 'play' } },
  },
})

test('the splash goes to the menu on skip, and the menu to the game', () => {
  const machine = createFlow(flow)
  expect(machine.place().screen).toBe('splash')
  expect(machine.send('skip')).toBe(true)
  expect(machine.place().screen).toBe('menu')
  machine.send('new-game')
  expect(machine.place().hud).toBe('hud')
})

test('Back goes to where the player came from, and an event the state does not handle changes nothing', () => {
  const machine = createFlow(flow)
  machine.send('skip')
  machine.send('settings')
  expect(machine.send('win')).toBe(false)
  expect(machine.send('back')).toBe(true)
  expect(machine.place().screen).toBe('menu')
  expect(createFlow(flow).send('back')).toBe(false)
})

test('Main menu from the pause screen asks first: Stay keeps the game, Yes leaves it', () => {
  const machine = createFlow(flow)
  machine.send('skip')
  machine.send('new-game')
  machine.send('pause')
  machine.send('main-menu')
  expect(machine.place()).toMatchObject({ at: 'pause', asking: 'askMainMenu' })
  machine.send('ask-no')
  expect(machine.place()).toMatchObject({ at: 'pause', asking: undefined })
  machine.send('main-menu')
  machine.send('ask-yes')
  expect(machine.place().screen).toBe('menu')
})

test('start: play skips the splash and the menu', () => {
  expect(createFlow(flow, { startPlaying: true }).place().hud).toBe('hud')
})

test('a saved game can be continued: play() goes straight to the game', () => {
  const machine = createFlow(flow)
  expect(machine.play()).toBe(true)
  expect(machine.place().at).toBe('play')
})

test('a flow that points at a screen, hud or state it does not have says so in plain words', () => {
  const bad = flowSchema.parse({
    format: 1,
    id: 'flow',
    kind: 'flow',
    start: 'nowhere',
    screens: { a: { screen: 'gone', on: { go: 'missing' } }, b: { screen: 'x', hud: 'y', on: {} } },
  })
  const problems = flowProblems(bad, new Set(['x']), new Set())
  const text = problems.map((p) => p.message).join('\n')
  expect(text).toContain('starts at "nowhere"')
  expect(text).toContain('screen "gone"')
  expect(text).toContain('goes to "missing"')
  expect(text).toContain('either a screen or a hud')
  expect(flowProblems(flow, new Set(['splash', 'menu', 'pause', 'settings', 'win']), new Set(['hud']))).toEqual([])
})
