import { expect, test } from 'bun:test'
import { layerProblems } from '../../../tests/lib/layers.ts'

test('create-automata: every import goes down the layers', () => {
  expect(layerProblems(`${import.meta.dir}/../src`, [])).toEqual([])
})
