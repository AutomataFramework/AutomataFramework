import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/** One fal.ai call. Every call gets a line, whether its picture was kept or thrown away. */
export type LedgerLine = { at: string; model: string; name: string; cost: number; kept: boolean }

/** The most a month may spend on art, in dollars. */
export const MONTH_CAP = 50

export function readLedger(path: string): LedgerLine[] {
  if (!existsSync(path)) return []
  const lines: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(lines)) throw new Error(`The spend list ${path} is not a list.`)
  return lines as LedgerLine[]
}

/** What this calendar month (in UTC) has spent so far, in dollars. */
export function monthSpend(lines: LedgerLine[], now: Date): number {
  const month = now.toISOString().slice(0, 7)
  // Counted in tenths of a cent, so many small prices add up exactly.
  const mills = lines.filter((l) => l.at.slice(0, 7) === month).reduce((sum, l) => sum + Math.round(l.cost * 1000), 0)
  return mills / 1000
}

/** Throws, in plain words, when one more call of `cost` would take the month past the cap. */
export function checkSpend(path: string, cost: number, now: Date): void {
  const spent = monthSpend(readLedger(path), now)
  if (spent + cost > MONTH_CAP)
    throw new Error(
      `This month has spent $${spent.toFixed(3)} on art, and the most is $${MONTH_CAP}. No picture was made.`,
    )
}

/** Adds a line. One call per row in the file, so a change to it is easy to read. */
export function addLine(path: string, line: LedgerLine): void {
  const lines = [...readLedger(path), line]
  writeFileSync(path, `[\n${lines.map((l) => `  ${JSON.stringify(l)}`).join(',\n')}\n]\n`)
}
