import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { encodePng } from '../../lib/png.ts'
import { UNFAKE, type Cleaned } from '../clean/clean.ts'
import { DUEL_SOURCE } from '../palette/duel.ts'
import { toPalette } from '../palette/palette.ts'
import { type Sidecar, writeSidecar } from '../sidecar/sidecar.ts'
import { falPicture, type Outside } from './fal.ts'
import { addLine, checkSpend } from './ledger.ts'
import { MODELS, SIZE } from './models.ts'

/** A brief: what to draw. `folder` is where the picture goes, next to the brief when left out. */
export type Brief = { name: string; prompt: string; seed?: number; folder?: string }

/** Everything outside the code, handed in, so tests stand in for fal.ai, the browser, the clock and chance. */
export type Deps = Outside & {
  ledger: string
  now: () => Date
  seed: () => number
  clean: (png: Uint8Array) => Promise<Cleaned>
}

function readBrief(path: string): Brief {
  const brief = JSON.parse(readFileSync(path, 'utf8')) as Partial<Brief>
  if (typeof brief.name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(brief.name))
    throw new Error('The brief needs a "name" in small letters, numbers and dashes, like "hero-run".')
  if (typeof brief.prompt !== 'string' || brief.prompt.trim() === '')
    throw new Error('The brief needs a "prompt": the words that say what to draw.')
  if (brief.seed !== undefined && !Number.isInteger(brief.seed))
    throw new Error('The brief\'s "seed" must be a whole number.')
  return { ...(brief as Brief), folder: resolve(dirname(path), brief.folder ?? '.') }
}

// Runs one paid call: checks the month's spend first, and adds a ledger line whether the picture is kept or not.
async function paidCall<T>(deps: Deps, model: string, cost: number, name: string, work: () => Promise<T>): Promise<T> {
  checkSpend(deps.ledger, cost, deps.now())
  let kept = false
  try {
    const result = await work()
    kept = true
    return result
  } finally {
    addLine(deps.ledger, { at: deps.now().toISOString(), model, name, cost, kept })
  }
}

/** Makes one picture from a brief: fal.ai, then unfake.js, then the DUEL palette. Gives back the picture's path. */
export async function makeArt(briefPath: string, deps: Deps): Promise<string> {
  const brief = readBrief(briefPath)
  const { id, cost } = MODELS.sprite
  const seed = brief.seed ?? deps.seed()
  return paidCall(deps, id, cost, brief.name, async () => {
    const made = await falPicture(deps, id, {
      prompt: brief.prompt,
      seed,
      image_size: { width: SIZE, height: SIZE },
      output_format: 'png',
      enable_prompt_expansion: false,
    })
    const cleaned = await deps.clean(made.png)
    const picture = toPalette(cleaned)
    const folder = brief.folder ?? '.'
    mkdirSync(folder, { recursive: true })
    const path = join(folder, `${brief.name}.png`)
    writeFileSync(path, encodePng(picture.width, picture.height, picture.rgba))
    writeSidecar(path, {
      prompt: brief.prompt,
      model: id,
      seed: made.seed,
      madeAt: deps.now().toISOString(),
      steps: [
        `fal.ai ${id}, ${SIZE} by ${SIZE}`,
        `unfake.js ${UNFAKE.commit.slice(0, 7)}: ${cleaned.scale} times too big, made ${picture.width} by ${picture.height}`,
        `DUEL palette (${DUEL_SOURCE})`,
      ],
      cost,
    })
    return path
  })
}

const REIMAGINE =
  'Reimagine this pixel-art picture: keep its subject, pose and colours, and make it read clearly at a small size.'

/** The review step: fal.ai reimagines a picture, and its answer is saved beside it as `<name>.reimagined.png`. */
export async function reviewArt(picturePath: string, deps: Deps, prompt = REIMAGINE): Promise<string> {
  const { id, cost } = MODELS.reimagine
  const name = basename(picturePath).replace(/\.png$/i, '')
  const seed = deps.seed()
  return paidCall(deps, id, cost, `${name} (review)`, async () => {
    const dataUri = `data:image/png;base64,${readFileSync(picturePath).toString('base64')}`
    const made = await falPicture(deps, id, {
      prompt,
      seed,
      image_urls: [dataUri],
      image_size: { width: SIZE, height: SIZE },
      output_format: 'png',
      enable_prompt_expansion: false,
    })
    const path = join(dirname(picturePath), `${name}.reimagined.png`)
    writeFileSync(path, made.png)
    const sidecar: Sidecar = {
      prompt,
      model: id,
      seed: made.seed,
      madeAt: deps.now().toISOString(),
      steps: [`fal.ai ${id}, from ${basename(picturePath)}`],
      cost,
    }
    writeSidecar(path, sidecar)
    return path
  })
}
