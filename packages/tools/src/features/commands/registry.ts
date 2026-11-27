import { check } from './check.ts'
import { link } from './link.ts'

export type Ctx = { cwd: string; env: Record<string, string | undefined>; say(line: string): void }
export type Command = { name: string; summary: string; run(ctx: Ctx): Promise<number> }

/** Every command, once. The command line reads this list; later the MCP server will too. */
export const commands: Command[] = [
  { name: 'check', summary: 'Look for mistakes in the game before it goes anywhere.', run: check },
  { name: 'link', summary: 'Put the game on a link anyone can open.', run: link },
]

export async function main(args: string[], ctx: Ctx): Promise<number> {
  const command = commands.find((c) => c.name === args[0])
  if (!command) {
    ctx.say(['What would you like to do?', ...commands.map((c) => `  ${c.name}: ${c.summary}`)].join('\n'))
    return args.length === 0 ? 0 : 1
  }
  return command.run(ctx)
}
