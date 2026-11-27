import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type Command, type Io, runCommand, sayProblem } from './registry.ts'

type Text = { type: 'text'; text: string }

/** The MCP server: one tool per command, with the same input and the same words the command line prints. */
export function mcpServer(commands: Command[], io: Omit<Io, 'say'>): McpServer {
  const server = new McpServer({ name: 'automata', version: '0.0.1' })
  for (const c of commands) {
    server.registerTool(c.tool, { description: c.summary, inputSchema: c.input }, async (input: unknown) => {
      const said: string[] = []
      const result = await runCommand(c, input, { ...io, say: (line) => said.push(line) })
      const words = result.ok ? said : [...said, ...result.problems.map(sayProblem)]
      const content: Text[] = [{ type: 'text', text: words.join('\n') || 'Done.' }]
      if (result.ok && result.value !== undefined && result.value !== null)
        content.push({ type: 'text', text: JSON.stringify(result.value, null, 2) })
      return { content, isError: !result.ok }
    })
  }
  return server
}

/** Serves the tools over stdio for an agent, from the folder the agent started it in. */
export async function serve(commands: Command[], transport: Transport = new StdioServerTransport()): Promise<void> {
  await mcpServer(commands, { cwd: process.cwd(), env: process.env }).connect(transport)
}
