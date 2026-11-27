import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'

const dir = new URL('../../.github/workflows/', import.meta.url)
const read = (name: string): string => readFileSync(new URL(name, dir), 'utf8')

interface Workflow {
  on: Record<string, { types?: string[]; branches?: string[] } | null>
  jobs: Record<string, { needs?: string[] | string; steps?: { uses?: string; env?: Record<string, string> }[] }>
}
const parse = (name: string): Workflow => Bun.YAML.parse(read(name)) as Workflow

describe('every workflow', () => {
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.yml'))) {
    test(`${name} is valid YAML`, () => {
      expect(() => Bun.YAML.parse(read(name))).not.toThrow()
    })

    test(`${name} pins every action to a full commit`, () => {
      const uses = [...read(name).matchAll(/uses:\s*(\S+)/g)].map((match) => match[1] ?? '')
      for (const action of uses) expect(action).toMatch(/@[0-9a-f]{40}$/)
    })
  }
})

describe('ci.yml', () => {
  const ci = parse('ci.yml')

  test('runs on pull requests (ready_for_review included), on pushes to main and in the merge queue', () => {
    expect(ci.on.pull_request?.types).toContain('ready_for_review')
    expect(ci.on.push?.branches).toEqual(['main'])
    expect(ci.on).toHaveProperty('merge_group')
  })

  test('the gate waits on every other job and knows each one', () => {
    const gate = ci.jobs.gate
    const others = Object.keys(ci.jobs).filter((job) => job !== 'gate')
    expect([gate?.needs].flat().toSorted()).toEqual(others.toSorted())
    const applies = gate?.steps?.[0]?.env?.APPLIES ?? ''
    for (const job of others) expect(applies).toContain(`"${job}":`)
  })
})
