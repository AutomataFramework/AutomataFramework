// The layer rule every package's `tests/architecture.test.ts` uses: a feature imports only from `lib/` and from
// features lower in the list, so there are no upward imports and no cycles.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

/** What is wrong with the imports under `src`, one sentence each; empty when the layers hold. `layers` is lowest first. */
export function layerProblems(src: string, layers: string[]): string[] {
  const problems: string[] = []
  const owner = (path: string): string => {
    const parts = relative(src, path).split(sep)
    return parts[0] === 'features' ? (parts[1] ?? '') : (parts[0] ?? '')
  }
  const known = new Set(['lib', 'index.ts', 'bin.ts', ...layers])
  for (const file of files(src)) {
    const from = owner(file)
    if (!known.has(from)) problems.push(`${relative(src, file)} sits in "${from}", which is not in the layer list.`)
    for (const match of readFileSync(file, 'utf8').matchAll(/from '(\.[^']*)'/g)) {
      const to = owner(resolve(file, '..', match[1] ?? ''))
      if (to === from || from === 'index.ts' || from === 'bin.ts') continue
      const ok = to === 'lib' || (layers.includes(to) && layers.indexOf(to) < layers.indexOf(from))
      if (!ok) problems.push(`${relative(src, file)} imports ${match[1]}: "${from}" may not use "${to}".`)
    }
  }
  return problems
}
