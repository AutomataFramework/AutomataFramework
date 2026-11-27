// Reads what one fresh-agent run left behind and prints one line of JSON: the agent, the model, whether the game was
// made, the minutes, the tokens and the dollars. `.github/workflows/fresh-agent.yml` runs it after each run.
//
// Usage:
//   node scripts/fresh-agent-report.ts claude <claude --output-format json file> <game folder> <seconds>
//   node scripts/fresh-agent-report.ts opencode <opencode --format json events file> <game folder> <seconds> <model> <usd>
// For OpenCode, <usd> is what the OpenRouter key's usage grew by over the run (OpenRouter's own count).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** One run, as the cost card reads it. */
export interface Report {
  agent: 'claude' | 'opencode'
  model: string
  made: boolean
  seconds: number
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number }
  usd: number
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

/** Whether the game the prompt asks for is there: an index.html with a script and the words "You win". */
export function gameMade(html: string | null): boolean {
  return html !== null && /<script[\s>]/i.test(html) && /you win/i.test(html)
}

/** The tokens, dollars and model from Claude Code's `--output-format json` result. */
export function readClaude(text: string): Pick<Report, 'model' | 'tokens' | 'usd'> {
  const result = JSON.parse(text) as {
    total_cost_usd?: number
    usage?: Record<string, unknown>
    modelUsage?: Record<string, unknown>
  }
  const usage = result.usage ?? {}
  return {
    model: Object.keys(result.modelUsage ?? {}).join(', ') || 'unknown',
    tokens: {
      input: num(usage.input_tokens),
      output: num(usage.output_tokens),
      cacheRead: num(usage.cache_read_input_tokens),
      cacheWrite: num(usage.cache_creation_input_tokens),
    },
    usd: num(result.total_cost_usd),
  }
}

/** The tokens and dollars summed over OpenCode's `--format json` events (each finished step carries its own). */
export function readOpenCode(text: string): Pick<Report, 'tokens'> & { usd: number } {
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  let usd = 0
  for (const line of text.split('\n')) {
    let event: unknown
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    const part = (event as { part?: { type?: string; tokens?: Record<string, unknown>; cost?: unknown } }).part
    if (part?.type !== 'step-finish') continue
    const t = part.tokens ?? {}
    const cache = (t.cache ?? {}) as Record<string, unknown>
    tokens.input += num(t.input)
    tokens.output += num(t.output) + num(t.reasoning)
    tokens.cacheRead += num(cache.read)
    tokens.cacheWrite += num(cache.write)
    usd += num(part.cost)
  }
  return { tokens, usd }
}

function main(): void {
  const [agent, file, folder, seconds, model, usd] = process.argv.slice(2)
  if ((agent !== 'claude' && agent !== 'opencode') || !file || !folder || !seconds) {
    throw new Error('Usage: fresh-agent-report.ts claude|opencode <output file> <game folder> <seconds> [model usd]')
  }
  const page = join(folder, 'index.html')
  const made = gameMade(existsSync(page) ? readFileSync(page, 'utf8') : null)
  const text = existsSync(file) ? readFileSync(file, 'utf8') : ''
  let report: Report
  if (agent === 'claude') {
    let read: Pick<Report, 'model' | 'tokens' | 'usd'> = {
      model: 'unknown',
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      usd: 0,
    }
    try {
      read = readClaude(text)
    } catch {
      console.error('Claude Code left no result to read.')
    }
    report = { agent, made, seconds: Number(seconds), ...read }
  } else {
    const read = readOpenCode(text)
    // OpenRouter's own count is the bill; the events' sum is shown beside it when OpenRouter has none.
    const billed = Number(usd)
    report = {
      agent,
      model: model ?? 'unknown',
      made,
      seconds: Number(seconds),
      tokens: read.tokens,
      usd: billed > 0 ? billed : read.usd,
    }
  }
  console.log(JSON.stringify(report))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
