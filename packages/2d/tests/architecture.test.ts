import { expect, test } from 'bun:test'
import { layerProblems } from '../../../tests/lib/layers.ts'

test('2d: every import goes down the layers', () => {
  expect(layerProblems(`${import.meta.dir}/../src`, [])).toEqual([])
})
