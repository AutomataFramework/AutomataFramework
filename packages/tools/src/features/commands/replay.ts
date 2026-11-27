import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { type Play, type Problem, replayPlay } from '@automataframework/core'
import { z } from 'zod'
import { fail, ok } from '../../lib/result.ts'
import { loadCode } from './play.ts'
import type { Io } from './registry.ts'

export const replay = {
  summary: 'Play every kept play again and say which ones now end differently.',
  input: z.object({}),
  async run(_input: object, io: Io) {
    const dir = join(io.cwd, 'plays')
    const files = existsSync(dir)
      ? readdirSync(dir)
          .filter((name) => name.endsWith('.json'))
          .toSorted()
      : []
    if (files.length === 0) {
      io.say('There are no plays yet. Keep one with npm run record.')
      return ok({ plays: 0 })
    }
    const code = await loadCode(io.cwd)
    if (!code.ok) return code
    const problems: Problem[] = []
    for (const name of files) {
      const file = `plays/${name}`
      let play: Play
      try {
        play = JSON.parse(readFileSync(join(dir, name), 'utf8')) as Play
      } catch {
        problems.push({ file, line: 1, message: 'This play is not plain JSON.', fix: 'Record it again.' })
        continue
      }
      const again = replayPlay(code.value.game, play)
      if (!again.same)
        problems.push({
          file,
          line: 1,
          message: `It ends differently now: at tick ${again.state.tick}, not ${play.end?.tick}.`,
          fix: 'If the change was meant, record it again. If not, the change broke something.',
        })
    }
    if (problems.length > 0) return fail(problems)
    io.say(`All ${files.length} plays end the same as when they were kept.`)
    return ok({ plays: files.length })
  },
}
