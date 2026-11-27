// Runs a command the two ways a person or an agent can: the command line, and the MCP server.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { commands, main } from '../../src/features/commands/registry.ts'
import { mcpServer } from '../../src/features/commands/mcp.ts'

// Bun and Playwright both run these helpers, so the repo is found from the file's own address.
const repo = fileURLToPath(new URL('../../../../', import.meta.url))

/**
 * A copy of the template game. It sits inside the repo (under `node_modules`, which git ignores) so its imports of
 * `@automataframework/*` reach the packages' own source, the same copies the tools use. Its own tsconfig would hide
 * the repo's paths to that source, so it goes.
 */
export function templateGame(): string {
  const root = join(repo, 'node_modules', '.cache', 'automata-tests')
  mkdirSync(root, { recursive: true })
  const dir = mkdtempSync(join(root, 'game-'))
  cpSync(join(repo, 'packages', 'create-automata', 'template'), dir, { recursive: true })
  rmSync(join(dir, 'tsconfig.json'))
  for (const file of ['public/automata.json', 'package.json']) {
    const path = join(dir, file)
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('__ID__', 'my-game').replaceAll('__TITLE__', 'My game'))
  }
  return dir
}

type Env = Record<string, string | undefined>

/** The command line, as `npm run <name> -- <args>` runs it. */
export async function cli(cwd: string, args: string[], env: Env = {}): Promise<{ code: number; said: string }> {
  const said: string[] = []
  const code = await main(args, { cwd, env, say: (line) => said.push(line) })
  return { code, said: said.join('\n') }
}

async function client(cwd: string, env: Env = {}): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await mcpServer(commands, { cwd, env }).connect(serverSide)
  const c = new Client({ name: 'test', version: '1' })
  await c.connect(clientSide)
  return c
}

export async function toolNames(): Promise<string[]> {
  const c = await client(process.cwd())
  const { tools } = await c.listTools()
  await c.close()
  return tools.map((t) => t.name)
}

/** One MCP tool call. `said` is all of the tool's text. */
export async function mcp(
  cwd: string,
  tool: string,
  input: Record<string, unknown> = {},
  env: Env = {},
): Promise<{ error: boolean; said: string }> {
  const c = await client(cwd, env)
  const result = await c.callTool({ name: tool, arguments: input }, undefined, { timeout: 120_000 })
  await c.close()
  const content = result.content as { type: string; text: string }[]
  return { error: result.isError === true, said: content.map((part) => part.text).join('\n') }
}
