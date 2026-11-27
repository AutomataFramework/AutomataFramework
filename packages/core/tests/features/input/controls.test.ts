import { expect, test } from 'bun:test'
import { type Controls, defaultBindings, schemas } from '../../../src/index.ts'

const controls: Controls = {
  format: 1,
  id: 'controls',
  actions: [
    { id: 'move', label: 'Move', kind: 'stick', keys: ['KeyA', 'KeyD', 'KeyW', 'KeyS'], pad: ['stick:left'] },
    { id: 'jump', label: 'Jump', kind: 'button', keys: ['Space'], pad: ['button:0'], canTap: true },
  ],
  players: [{}, { keys: { jump: ['KeyI'] } }],
}
const schema = () => schemas['kind:controls']

test('the controls kind is registered by the main entry and accepts good controls', () => {
  expect(schema()?.safeParse({ ...controls, kind: 'controls' }).success).toBe(true)
})

test('the controls kind refuses a stick without four keys, a repeated action and no actions', () => {
  const stick = structuredClone(controls)
  stick.actions[0]!.keys = ['KeyA']
  expect(schema()?.safeParse(stick).success).toBe(false)
  expect(schema()?.safeParse({ ...controls, actions: [controls.actions[1], controls.actions[1]] }).success).toBe(false)
  expect(schema()?.safeParse({ ...controls, actions: [] }).success).toBe(false)
})

test("default bindings: one per player, each player's own keys where given, nothing set to tap", () => {
  const [one, two] = defaultBindings(controls)
  expect(one).toEqual({
    keys: { move: ['KeyA', 'KeyD', 'KeyW', 'KeyS'], jump: ['Space'] },
    pad: { move: ['stick:left'], jump: ['button:0'] },
    tap: [],
  })
  expect(two?.keys.jump).toEqual(['KeyI'])
  expect(defaultBindings({ ...controls, players: [] })).toHaveLength(1)
})
