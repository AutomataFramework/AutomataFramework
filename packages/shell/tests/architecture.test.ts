import { expect, test } from 'bun:test'
import { layerProblems } from '../../../tests/lib/layers.ts'

test('shell: every import goes down the layers: formats, theme, words, settings, flow, error, host, hud, screens, start', () => {
  expect(
    layerProblems(`${import.meta.dir}/../src`, [
      'formats',
      'theme',
      'words',
      'settings',
      'flow',
      'error',
      'host',
      'hud',
      'screens',
      'start',
    ]),
  ).toEqual([])
})
