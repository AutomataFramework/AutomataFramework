import { expect, test } from 'bun:test'
import { softColours } from '../../../../tools/src/features/check/contrast.ts'
import { lookOf, softLook } from '../../../src/features/theme/default.ts'

test("the tools' copy of the Soft colours is the shell's own", () => {
  const { player: _player, ...own } = softLook.colours
  expect(softColours).toEqual(own)
})

test('a theme lays over the Soft look: a key it leaves out keeps the default, one it sets wins', () => {
  const look = lookOf({
    format: 1,
    id: 'theme',
    kind: 'theme',
    colours: { page: '#000000' },
    corners: { card: { size: 0, steep: 1 } },
    outline: 4,
  })
  expect(look.colours.page).toBe('#000000')
  expect(look.colours.words).toBe(softLook.colours.words)
  expect(look.corners.card).toEqual({ size: 0, steep: 1 })
  expect(look.corners.button).toEqual(softLook.corners.button)
  expect(look.outline).toBe(4)
  expect(lookOf(undefined)).toEqual(softLook)
})
