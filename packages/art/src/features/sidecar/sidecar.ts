import { writeFileSync } from 'node:fs'

/** What made a picture, kept beside it as `<name>.art.json`, so it can be made again or traced. */
export type Sidecar = {
  prompt: string
  model: string
  seed: number
  madeAt: string
  steps: string[]
  cost: number
}

const fields = ['prompt', 'model', 'seed', 'madeAt', 'steps', 'cost'] as const

/** The sidecar's path for a picture: `hero.png` keeps its story in `hero.art.json`. */
export function sidecarPath(picturePath: string): string {
  return picturePath.replace(/\.png$/i, '') + '.art.json'
}

/** What is missing or wrong in a sidecar, one sentence each; empty when it is complete. */
export function sidecarProblems(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return ['The sidecar is not an object.']
  const v = value as Record<string, unknown>
  const problems = fields.filter((f) => !(f in v)).map((f) => `The sidecar has no "${f}".`)
  if (typeof v['prompt'] !== 'string' || v['prompt'] === '') problems.push('"prompt" must be words.')
  if (typeof v['model'] !== 'string' || v['model'] === '') problems.push('"model" must name a model.')
  if (!Number.isInteger(v['seed'])) problems.push('"seed" must be a whole number.')
  if (typeof v['madeAt'] !== 'string' || Number.isNaN(Date.parse(v['madeAt'])))
    problems.push('"madeAt" must be a time.')
  if (!Array.isArray(v['steps']) || v['steps'].length === 0) problems.push('"steps" must list what was done.')
  if (typeof v['cost'] !== 'number' || v['cost'] < 0) problems.push('"cost" must be dollars, 0 or more.')
  return problems
}

/** Writes the sidecar beside the picture and gives back its path. */
export function writeSidecar(picturePath: string, sidecar: Sidecar): string {
  const problems = sidecarProblems(sidecar)
  if (problems.length > 0) throw new Error(problems.join(' '))
  const path = sidecarPath(picturePath)
  writeFileSync(path, JSON.stringify(sidecar, null, 2) + '\n')
  return path
}
