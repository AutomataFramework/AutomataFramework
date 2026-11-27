/** The value at a path into the game's state, such as `game.score`, as text. */
export function readPath(state: unknown, path: string): string {
  let at: unknown = state
  for (const part of path.split('.')) {
    if (at === null || typeof at !== 'object') return ''
    at = (at as Record<string, unknown>)[part]
  }
  return at === undefined || at === null || typeof at === 'object' ? '' : String(at)
}
