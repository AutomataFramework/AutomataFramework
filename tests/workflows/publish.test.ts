import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

interface Step {
  uses?: string
  run?: string
}
interface Workflow {
  jobs: Record<string, { 'timeout-minutes'?: number; steps?: Step[] }>
}

const publish = Bun.YAML.parse(
  readFileSync(new URL('../../.github/workflows/publish.yml', import.meta.url), 'utf8'),
) as Workflow

describe('publish.yml', () => {
  const steps = publish.jobs.preview?.steps ?? []
  const at = (match: (step: Step) => boolean): number => steps.findIndex(match)
  const script = at((step) => step.run === 'node scripts/publish-preview.ts')

  test('sets up pnpm, installs with no package scripts and builds, all before the script', () => {
    const pnpm = at((step) => step.uses?.startsWith('pnpm/action-setup@') === true)
    const install = at((step) => step.run === 'pnpm install --frozen-lockfile --ignore-scripts')
    const build = at((step) => step.run === 'pnpm build')
    expect(script).toBeGreaterThan(-1)
    for (const index of [pnpm, install, build]) {
      expect(index).toBeGreaterThan(-1)
      expect(index).toBeLessThan(script)
    }
    expect(pnpm).toBeLessThan(install)
    expect(install).toBeLessThan(build)
  })

  test('uses no dependency cache, since the job holds the publish token', () => {
    expect(JSON.stringify(steps)).not.toContain('cache')
  })

  test('leaves room for the ten-minute read-back after install, build and uploads', () => {
    expect(publish.jobs.preview?.['timeout-minutes']).toBeGreaterThanOrEqual(20)
  })
})
