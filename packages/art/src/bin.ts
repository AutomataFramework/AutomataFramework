#!/usr/bin/env node
import { randomInt } from 'node:crypto'
import { clean } from './features/clean/clean.ts'
import { makeArt, reviewArt } from './features/make/make.ts'

const HELP = `Make a picture:      make-art <brief.json> --ledger <spend-list.json>
Reimagine a picture: make-art review <picture.png> --ledger <spend-list.json>

The brief is a JSON file: { "name": "hero", "prompt": "a small knight, pixel art" }.
The spend list keeps every call's cost; a month stops at $50.
The fal.ai key goes in FAL_KEY.`

/** Runs the command and gives back its exit code. */
export async function main(args: string[], env: NodeJS.ProcessEnv, say: (line: string) => void): Promise<number> {
  const at = args.indexOf('--ledger')
  const ledger = at >= 0 ? args[at + 1] : undefined
  const rest = at >= 0 ? args.filter((_, i) => i !== at && i !== at + 1) : args
  const [first, second] = rest
  if (!first || !ledger || (first === 'review' && !second)) {
    say(HELP)
    return 1
  }
  const key = env['FAL_KEY']
  if (!key) {
    say('There is no fal.ai key. Put it in FAL_KEY and try again.')
    return 1
  }
  const deps = { fetch, key, ledger, now: () => new Date(), seed: () => randomInt(2 ** 31), clean }
  try {
    const path = first === 'review' ? await reviewArt(second ?? '', deps) : await makeArt(first, deps)
    say(`Made ${path}`)
    return 0
  } catch (error) {
    say(error instanceof Error ? error.message : String(error))
    return 1
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2), process.env, (line) => console.log(line))
