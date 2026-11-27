import { expect, test } from 'bun:test'
import { type KeyValue, type State, createSaves, slots } from '../../../src/index.ts'
import { forAll } from '../../lib/property.ts'

const memory = (): KeyValue & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  }
}
const state = (game: unknown, tick = 3): State<unknown> => ({
  tick,
  seed: 7,
  players: [{ id: 0 }],
  outcome: null,
  physics: null,
  game,
})
const clock = () => 1_700_000_000_000

test('the four slots are auto, 1, 2 and 3', () => {
  expect([...slots]).toEqual(['auto', '1', '2', '3'])
})

test('property: save then read gives back the same state', () => {
  forAll((dice) => {
    const saves = createSaves(memory(), 'my-game', clock)
    const slot = dice.pick(slots)
    const saved = state(dice.json(), dice.int(100000))
    expect(saves.write(slot, saved).ok).toBe(true)
    const read = saves.read(slot)
    if (!read.ok) throw new Error('read failed')
    expect(read.value).toEqual(saved)
    expect(saves.list().find((entry) => entry.slot === slot)).toEqual({
      slot,
      savedAt: clock(),
      tick: saved.tick,
    })
  })
})

test('property: export then import gives the same state, in another slot and another store', () => {
  forAll((dice) => {
    const from = createSaves(memory(), 'my-game', clock)
    const to = createSaves(memory(), 'my-game', clock)
    const saved = state(dice.json())
    from.write('1', saved)
    const result = to.importInto('2', from.exportSlot('1'))
    expect(result.ok).toBe(true)
    const read = to.read('2')
    if (!read.ok) throw new Error('read failed')
    expect(read.value).toEqual(saved)
  })
})

test('an exported save is plain JSON with the shape {format, id, game, savedAt, tick, state}', () => {
  const saves = createSaves(memory(), 'my-game', clock)
  saves.write('auto', state({ score: 4 }))
  const file = JSON.parse(saves.exportSlot('auto'))
  expect(Object.keys(file).toSorted()).toEqual(['format', 'game', 'id', 'savedAt', 'state', 'tick'])
  expect(file).toMatchObject({ format: 1, game: 'my-game', savedAt: clock(), tick: 3 })
})

test('a broken file gives a plain problem and every other slot still reads (criterion 7)', () => {
  const store = memory()
  const saves = createSaves(store, 'my-game', clock)
  saves.write('1', state('one'))
  saves.write('3', state('three'))
  store.set(`automata:my-game:save:2`, '{"format": 1, "stat')
  const broken = saves.read('2')
  if (broken.ok) throw new Error('should fail')
  expect(broken.problems[0]?.message.length).toBeGreaterThan(0)
  expect(broken.problems[0]?.fix.length).toBeGreaterThan(0)
  expect(saves.read('1').ok).toBe(true)
  expect(saves.read('3').ok).toBe(true)
  expect(saves.list().map((entry) => entry.slot)).toEqual(['1', '3'])
})

test('an empty slot is a plain problem, and so is a slot that does not exist', () => {
  const saves = createSaves(memory(), 'my-game', clock)
  expect(saves.read('1').ok).toBe(false)
  expect(saves.write('9', state(1)).ok).toBe(false)
  expect(saves.exportSlot('1')).toBe('')
})

test('review focus 1: a store that throws on set makes canStore false and nothing else throws', () => {
  const store: KeyValue = {
    get: () => null,
    set: () => {
      throw new Error('full')
    },
    remove: () => {},
  }
  const saves = createSaves(store, 'my-game', clock)
  expect(saves.canStore()).toBe(false)
  const written = saves.write('1', state(1))
  if (written.ok) throw new Error('should fail')
  expect(written.problems[0]?.message).toBe("This device can't keep saves right now.")
  expect(saves.list()).toEqual([])
  expect(saves.read('1').ok).toBe(false)
  expect(saves.importInto('1', '{}').ok).toBe(false)
})

test('a store that throws on get does not throw either', () => {
  const store: KeyValue = {
    get: () => {
      throw new Error('denied')
    },
    set: () => {},
    remove: () => {},
  }
  const saves = createSaves(store, 'my-game', clock)
  expect(saves.list()).toEqual([])
  expect(saves.read('1').ok).toBe(false)
  expect(saves.exportSlot('1')).toBe('')
})

test('canStore is true on a store that works, and leaves no probe behind', () => {
  const store = memory()
  expect(createSaves(store, 'my-game', clock).canStore()).toBe(true)
  expect(store.data.size).toBe(0)
})

test('review focus 4: a save from another game is refused and the slot keeps its bytes', () => {
  const other = createSaves(memory(), 'other-game', clock)
  other.write('1', state('theirs'))
  const store = memory()
  const saves = createSaves(store, 'my-game', clock)
  saves.write('1', state('mine'))
  const before = store.get('automata:my-game:save:1')
  const result = saves.importInto('1', other.exportSlot('1'))
  if (result.ok) throw new Error('should fail')
  expect(result.problems[0]?.message).toContain('another game')
  expect(store.get('automata:my-game:save:1')).toBe(before)
})

test('review focus 4: a save from a newer format is refused and the slot keeps its bytes', () => {
  const store = memory()
  const saves = createSaves(store, 'my-game', clock)
  saves.write('1', state('mine'))
  const before = store.get('automata:my-game:save:1')
  const newer = JSON.stringify({ format: 2, id: 'my-game-1', game: 'my-game', savedAt: 1, tick: 1, state: {} })
  const result = saves.importInto('1', newer)
  if (result.ok) throw new Error('should fail')
  expect(result.problems[0]?.message).toContain('newer')
  expect(store.get('automata:my-game:save:1')).toBe(before)
})

test('text that is not a save is refused with a plain sentence and the slot keeps its bytes', () => {
  const store = memory()
  const saves = createSaves(store, 'my-game', clock)
  saves.write('1', state('mine'))
  const before = store.get('automata:my-game:save:1')
  for (const text of ['', 'hello', '[]', '{"format":1}', JSON.stringify({ format: 1, game: 'my-game', state: 5 })]) {
    const result = saves.importInto('1', text)
    expect(result.ok).toBe(false)
  }
  expect(store.get('automata:my-game:save:1')).toBe(before)
})
