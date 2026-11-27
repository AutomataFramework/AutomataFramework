#!/usr/bin/env node
import { main } from './features/commands/registry.ts'

process.exitCode = await main(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  say: (line) => console.log(line),
})
