import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { budgets, counts } from '../../scripts/check-line-budgets.ts'

function plant(lines: number, sub = 'core/src'): string {
  const root = mkdtempSync(join(tmpdir(), 'budget-'))
  mkdirSync(join(root, 'packages', sub), { recursive: true })
  writeFileSync(join(root, 'packages', sub, 'big.ts'), 'x\n'.repeat(lines))
  return root
}
const over = (root: string) =>
  counts(root)
    .filter((row) => row.lines > row.budget)
    .map((row) => row.name)

test('a package at its budget passes and one line more fails', () => {
  expect(over(plant(budgets.core ?? 0))).toEqual([])
  expect(over(plant((budgets.core ?? 0) + 1))).toEqual(['core'])
})

test('the template has its own budget apart from the make-a-game code', () => {
  expect(over(plant(701, 'create-automata/template'))).toEqual(['create-automata/template'])
  expect(over(plant(301, 'create-automata/src'))).toEqual(['create-automata/src'])
})

test('tests are not counted', () => {
  expect(over(plant(10_000, 'core/tests'))).toEqual([])
})

test('the real repo is under every budget', () => {
  expect(over(join(import.meta.dir, '../..'))).toEqual([])
})
