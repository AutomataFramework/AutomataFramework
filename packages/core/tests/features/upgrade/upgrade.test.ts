import { expect, test } from 'bun:test'
import { addUpgrade, upgrade } from '../../../src/index.ts'
import { forAll } from '../../lib/property.ts'

addUpgrade('made-up', 0, (old) => ({ ...(old as object), renamed: (old as { name: string }).name }))
addUpgrade('gappy', 1, (old) => old)

test('a made-up kind at format 0 with one step reaches format 1', () => {
  const result = upgrade('made-up', { format: 0, id: 'x', name: 'Ann' })
  expect(result).toEqual({ ok: true, value: { format: 1, id: 'x', name: 'Ann', renamed: 'Ann' } })
})

test('a missing step is a plain problem', () => {
  const result = upgrade('gappy', { format: 0, id: 'x' })
  if (result.ok) throw new Error('should fail')
  expect(result.problems).toHaveLength(1)
  expect(result.problems[0]?.message).toContain('format 0')
  expect(result.problems[0]?.fix.length).toBeGreaterThan(0)
})

test('a file from a newer version is refused', () => {
  const result = upgrade('made-up', { format: 9, id: 'x' })
  if (result.ok) throw new Error('should fail')
  expect(result.problems[0]?.message).toContain('newer')
})

test('a kind with no steps accepts format 1 and refuses what is not a file', () => {
  expect(upgrade('save', { format: 1, id: 'a' }).ok).toBe(true)
  expect(upgrade('save', 'text').ok).toBe(false)
  expect(upgrade('save', { id: 'a' }).ok).toBe(false)
  expect(upgrade('save', { format: 1.5 }).ok).toBe(false)
})

test('property: upgrading twice is the same as once', () => {
  forAll((dice) => {
    const file = { format: dice.int(2), id: 'x', name: String(dice.json(3)), extra: dice.json() }
    const once = upgrade('made-up', file)
    if (!once.ok) throw new Error('first upgrade failed')
    expect(upgrade('made-up', once.value)).toEqual(once)
  })
})
