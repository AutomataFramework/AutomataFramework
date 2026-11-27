import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readToken } from '../github/credential.ts'
import { type Fetch, github, hostsFor, waitForBuild } from '../github/pages.ts'
import { describe, gate } from './check.ts'
import type { Ctx } from './registry.ts'

/** Everything `link` reaches outside itself, so a test can stand in for each. */
export type Deps = {
  git(args: string[]): string
  credential(input: string): string
  fetch: Fetch
  sleep(ms: number): Promise<void>
}

const realDeps = (ctx: Ctx): Deps => ({
  git: (args) =>
    execFileSync('git', args, { cwd: ctx.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(),
  credential: (input) =>
    execFileSync('git', ['credential', 'fill'], {
      cwd: ctx.cwd,
      input,
      encoding: 'utf8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    }),
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
})

/** Puts the game on a link: the gate, GitHub sign-in, a repo, Pages, a push, then waits for the build. */
export async function link(ctx: Ctx, deps: Deps = realDeps(ctx)): Promise<number> {
  const g = await gate(ctx.cwd)
  if (g.problems.length > 0 || g.keys.length > 0) {
    for (const line of describe(g)) ctx.say(line)
    ctx.say(
      g.problems.length > 0
        ? "The game has mistakes, so I didn't put it on a link. Fix what's listed above and try again."
        : "A file looks like it holds a password or key, so I didn't put it on a link. Take it out and try again.",
    )
    return 1
  }
  const token = readToken((input) => deps.credential(input))
  if (!token) {
    ctx.say(
      "I can't sign in to GitHub from here, so I stopped and made nothing. Sign in to GitHub on this computer, then try again.",
    )
    return 1
  }
  const hosts = hostsFor(ctx.env)
  const api = github(hosts.api, token, deps.fetch)
  const me = await api.me()
  const owner = me.json.login
  if (me.status !== 200 || typeof owner !== 'string') {
    ctx.say("GitHub didn't accept the sign-in, so I stopped and made nothing. Sign in to GitHub again, then try again.")
    return 1
  }
  const name = g.manifest?.id ?? ''
  if ((await api.repo(owner, name)).status === 404) {
    ctx.say(
      `Everything in this game's folder will be public on GitHub, so anyone can see it. Don't share art, fonts or music you bought.`,
    )
    const made = await api.createRepo(name)
    if (made.status !== 201) {
      ctx.say(`GitHub wouldn't make the page for ${name}. Check the name isn't already used, then try again.`)
      return 1
    }
  }
  const pages = await api.turnOnPages(owner, name)
  if (![201, 409].includes(pages.status)) {
    ctx.say("GitHub wouldn't turn on the web page for this game, so I stopped. Try again in a minute.")
    return 1
  }
  if (!existsSync(join(ctx.cwd, '.git'))) deps.git(['init', '-b', 'main'])
  const remote = hosts.gitUrl(owner, name)
  const remotes = deps.git(['remote'])
  deps.git(
    remotes.split('\n').includes('origin')
      ? ['remote', 'set-url', 'origin', remote]
      : ['remote', 'add', 'origin', remote],
  )
  deps.git(['add', '-A'])
  const who = ['-c', `user.name=${owner}`, '-c', `user.email=${owner}@users.noreply.github.com`]
  const pending = deps.git(['status', '--porcelain'])
  if (pending !== '' || !hasCommit(deps)) deps.git([...who, 'commit', '-m', 'Update the game'])
  try {
    deps.git(['push', '-u', 'origin', 'HEAD:main'])
  } catch {
    ctx.say("GitHub wouldn't take the game files. Make sure you're signed in to GitHub, then try again.")
    return 1
  }
  const url = hosts.pagesUrl(owner, name)
  ctx.say('Sent. Waiting for the link to come alive. This takes a minute or two.')
  if (!(await waitForBuild(url, deps.git(['rev-parse', 'HEAD']), deps.fetch, deps.sleep))) {
    ctx.say(`The link isn't ready yet. It should be soon: ${url}`)
    return 1
  }
  ctx.say(`Your game is live: ${url}`)
  return 0
}

const hasCommit = (deps: Deps): boolean => {
  try {
    deps.git(['rev-parse', '--verify', 'HEAD'])
    return true
  } catch {
    return false
  }
}
