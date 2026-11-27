export type Hosts = {
  api: string
  pagesUrl(owner: string, repo: string): string
  gitUrl(owner: string, repo: string): string
}

/** Where GitHub is. A test points `AUTOMATA_TEST_GITHUB` (and `AUTOMATA_TEST_GIT`, a folder) at a stand-in. */
export function hostsFor(env: Record<string, string | undefined>): Hosts {
  const stand = env.AUTOMATA_TEST_GITHUB
  if (stand)
    return {
      api: `${stand}/api`,
      pagesUrl: (o, r) => `${stand}/pages/${o}/${r}/`,
      gitUrl: (o, r) => `${env.AUTOMATA_TEST_GIT ?? ''}/${o}/${r}.git`,
    }
  return {
    api: 'https://api.github.com',
    pagesUrl: (o, r) => `https://${o.toLowerCase()}.github.io/${r}/`,
    gitUrl: (o, r) => `https://github.com/${o}/${r}.git`,
  }
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

/** The few GitHub calls `link` makes. Each returns the HTTP status and any JSON. */
export function github(api: string, token: string, doFetch: Fetch) {
  const call = async (method: string, path: string, body?: object) => {
    const response = await doFetch(`${api}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, json: (await response.json().catch(() => ({}))) as Record<string, unknown> }
  }
  return {
    me: () => call('GET', '/user'),
    repo: (owner: string, name: string) => call('GET', `/repos/${owner}/${name}`),
    createRepo: (name: string) => call('POST', '/user/repos', { name, private: false }),
    turnOnPages: (owner: string, name: string) =>
      call('POST', `/repos/${owner}/${name}/pages`, { build_type: 'workflow' }),
  }
}

/** Waits until the link answers with this commit's build id. Returns false if it never does. */
export async function waitForBuild(
  url: string,
  commit: string,
  doFetch: Fetch,
  sleep: (ms: number) => Promise<void>,
  tries = 120,
): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one try after another
    const response = await doFetch(`${url}build.json?t=${i}`).catch(() => null)
    // oxlint-disable-next-line no-await-in-loop -- one try after another
    if (response?.ok && ((await response.json().catch(() => ({}))) as { commit?: string }).commit === commit)
      return true
    // oxlint-disable-next-line no-await-in-loop -- spaced out
    await sleep(5000)
  }
  return false
}
