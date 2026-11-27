/** `run` feeds text to `git credential fill` and returns what it prints. Null when git is not signed in to GitHub. */
export function readToken(run: (input: string) => string): string | null {
  let output: string
  try {
    output = run('protocol=https\nhost=github.com\n\n')
  } catch {
    return null
  }
  const line = output.split('\n').find((l) => l.startsWith('password='))
  const token = line?.slice('password='.length).trim()
  return token ? token : null
}
