import { expect, test } from 'bun:test'
import { parseJson } from '../../../src/features/content/locate.ts'

const text = '{\n  "a": 1,\n  "list": [\n    { "b": true },\n    { "c": null }\n  ]\n}\n'

test('a path points at its line', () => {
  const parsed = parseJson(text)
  if (!parsed.ok) throw new Error('should parse')
  expect(parsed.lineOf(['a'])).toBe(2)
  expect(parsed.lineOf(['list', 1, 'c'])).toBe(5)
  expect(parsed.lineOf([])).toBe(1)
})

test('a path that is not there points at its closest parent', () => {
  const parsed = parseJson(text)
  if (!parsed.ok) throw new Error('should parse')
  expect(parsed.lineOf(['list', 0, 'missing'])).toBe(4)
})

test('a broken file says which line', () => {
  const parsed = parseJson('{\n  "a": 1,\n  "b": \n}')
  expect(parsed).toMatchObject({ ok: false, line: 4 })
  expect(parseJson('{"a": 1,}')).toMatchObject({ ok: false, line: 1 })
  expect(parseJson('{"a": 1} x')).toMatchObject({ ok: false })
})
