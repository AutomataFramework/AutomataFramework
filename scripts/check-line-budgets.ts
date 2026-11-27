// Fails when a package's source (without tests) is over its line budget, and prints every count so the slice report
// can show the trend. The budgets are the slice 1a plan's table. Run: `bun scripts/check-line-budgets.ts [root]`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Folder (under `packages/`) to its line budget. `create-automata/template` is counted on its own. */
export const budgets: Record<string, number> = {
  core: 3500,
  '2d': 1200,
  shell: 5000,
  tools: 3000,
  art: 700,
  'create-automata/src': 300,
  'create-automata/template': 700,
}

const counted = /\.(ts|svelte|js|json|html|yml)$/

function lines(dir: string): number {
  if (!existsSync(dir)) return 0
  return readdirSync(dir).reduce((sum, name) => {
    if (['node_modules', 'dist'].includes(name)) return sum
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sum + lines(path)
    return counted.test(name) ? sum + readFileSync(path, 'utf8').split('\n').length - 1 : sum
  }, 0)
}

/** The lines of each budgeted folder under `root`, with its budget. */
export function counts(root: string): { name: string; lines: number; budget: number }[] {
  return Object.entries(budgets).map(([name, budget]) => {
    const [pkg = '', sub] = name.split('/')
    return { name, lines: lines(join(root, 'packages', pkg, sub ?? 'src')), budget }
  })
}

if (import.meta.main) {
  const rows = counts(process.argv[2] ?? process.cwd())
  for (const row of rows) console.log(`${row.name.padEnd(28)} ${String(row.lines).padStart(6)} of ${row.budget}`)
  const over = rows.filter((row) => row.lines > row.budget)
  for (const row of over)
    console.error(`${row.name} is over its budget: ${row.lines} lines, the most is ${row.budget}.`)
  process.exit(over.length > 0 ? 1 : 0)
}
