/** What Paraglide's compiled `messages` module is: a function for each message name. */
type Message = (inputs?: Record<string, unknown>, options?: { locale?: string }) => string
export type Messages = Record<string, unknown>

const isMessage = (value: unknown): value is Message => typeof value === 'function'

/** A language written in its own words: "English", "Español". */
export function languageName(code: string): string {
  const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1)
}

/**
 * Looks a word up by its message name in the language now chosen: first in the game's own words, then in the shell's.
 * Paraglide gives the English words wherever a language has none, so a missing word is never blank. A name nobody wrote
 * comes back as the name itself (or the plain text the game gave for it, such as its name); `automata check` names that file and word before a game ships.
 */
export function createWords(
  sources: { game?: Messages | undefined; shell: Messages; plain?: Record<string, string> },
  language: () => string,
) {
  const find = (name: string): Message | undefined => {
    const own = sources.game?.[name]
    if (isMessage(own)) return own
    const shell = sources.shell[name]
    return isMessage(shell) ? shell : undefined
  }
  return {
    word(name: string, inputs: Record<string, unknown> = {}): string {
      const message = find(name)
      return message ? message(inputs, { locale: language() }) : (sources.plain?.[name] ?? name)
    },
    has: (name: string): boolean => find(name) !== undefined || sources.plain?.[name] !== undefined,
  }
}
