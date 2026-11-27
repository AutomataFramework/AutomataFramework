import type { Screen } from '../formats/formats.ts'

/** The one screen the shell holds itself: what shows when the game's own code fails. Its words are the shell's. */
export const somethingWentWrong: Screen = {
  format: 1,
  id: 'something-went-wrong',
  kind: 'screen',
  above: 'gameName',
  title: 'oops',
  items: [
    { type: 'text', words: 'oopsBody' },
    { type: 'button', id: 'try-again', label: 'tryAgain', does: 'retry', main: true },
    { type: 'button', id: 'main-menu', label: 'mainMenu', does: 'main-menu' },
  ],
}

/** The built-in question the flow asks with `{ ask, yes }`: the question's word is the title, its `Body` the line under it. */
export function questionScreen(word: string, has: (name: string) => boolean): Screen {
  return {
    format: 1,
    id: `ask-${word}`,
    kind: 'screen',
    title: word,
    items: [
      ...(has(`${word}Body`) ? [{ type: 'text' as const, words: `${word}Body` }] : []),
      { type: 'button', id: 'stay', label: 'stay', does: 'ask-no', main: true },
      { type: 'button', id: 'yes', label: has(`${word}Yes`) ? `${word}Yes` : 'yes', does: 'ask-yes' },
    ],
  }
}
