export type Path = (string | number)[]
export type Parsed =
  { ok: true; value: unknown; lineOf(path: Path): number } | { ok: false; line: number; message: string }

/**
 * Reads JSON and remembers where each value starts, so a mistake in a file can name its line. The built-in
 * `JSON.parse` says where only in some engines, so this one does it the same everywhere.
 */
export function parseJson(text: string): Parsed {
  const starts = new Map<string, number>()
  let i = 0
  const lineAt = (offset: number): number => text.slice(0, offset).split('\n').length
  const stop = (message: string): never => {
    throw Object.assign(new Error(message), { offset: i })
  }
  const space = (): void => {
    while (i < text.length && ' \t\r\n'.includes(text.charAt(i))) i++
  }
  const word = (w: string, value: unknown): unknown => {
    if (!text.startsWith(w, i)) return stop(`I did not understand this (expected ${w})`)
    i += w.length
    return value
  }
  const string = (): string => {
    const start = i++
    while (i < text.length && text.charAt(i) !== '"') {
      if (text.charAt(i) === '\n') stop('A word in quotes does not end on its line')
      i += text.charAt(i) === '\\' ? 2 : 1
    }
    if (i >= text.length) {
      i = start
      stop('A word in quotes never ends')
    }
    i++
    return JSON.parse(text.slice(start, i)) as string
  }
  const value = (path: Path): unknown => {
    space()
    starts.set(path.join('\u0000'), i)
    const c = text.charAt(i)
    if (c === '{') {
      i++
      const out: Record<string, unknown> = {}
      space()
      if (text.charAt(i) === '}') return (i++, out)
      for (;;) {
        space()
        if (text.charAt(i) !== '"') stop('Expected a name in quotes here')
        const key = string()
        space()
        if (text.charAt(i++) !== ':') stop('Expected a ":" after the name')
        out[key] = value([...path, key])
        space()
        const next = text.charAt(i++)
        if (next === '}') return out
        if (next !== ',') stop('Expected "," or "}" here')
      }
    }
    if (c === '[') {
      i++
      const out: unknown[] = []
      space()
      if (text.charAt(i) === ']') return (i++, out)
      for (;;) {
        out.push(value([...path, out.length]))
        space()
        const next = text.charAt(i++)
        if (next === ']') return out
        if (next !== ',') stop('Expected "," or "]" here')
      }
    }
    if (c === '"') return string()
    if (c === 't') return word('true', true)
    if (c === 'f') return word('false', false)
    if (c === 'n') return word('null', null)
    const num = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i))
    if (!num) return stop(i >= text.length ? 'The file ends too soon' : 'I did not understand this')
    i += num[0].length
    return Number(num[0])
  }
  try {
    const result = value([])
    space()
    if (i < text.length) stop('There is more after the end of the file')
    return {
      ok: true,
      value: result,
      lineOf(path) {
        // A path that is not there points at the closest parent that is.
        for (let n = path.length; n >= 0; n--) {
          const at = starts.get(path.slice(0, n).join('\u0000'))
          if (at !== undefined) return lineAt(at)
        }
        return 1
      },
    }
  } catch (error) {
    const e = error as { message: string; offset?: number }
    return { ok: false, line: lineAt(e.offset ?? i), message: e.message }
  }
}
