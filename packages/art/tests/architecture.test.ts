import { expect, test } from 'bun:test'
import { layerProblems } from '../../../tests/lib/layers.ts'

// Lowest first: a feature may import only the ones before it.
const layers = ['palette', 'sidecar', 'clean', 'make']

test('art: every import goes down the layers', () => {
  expect(layerProblems(`${import.meta.dir}/../src`, layers)).toEqual([])
})
