#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { create } from './index.ts'

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))
const name = process.argv[2]
if (!name) {
  console.log('What is your game called? For example: npm create automata my-game')
  process.exit(1)
}
try {
  const { version } = JSON.parse(readFileSync(here('../package.json'), 'utf8')) as { version: string }
  create(resolve(name), here('../template'), version)
  console.log(`Made ${name}. To play it:\n  cd ${name}\n  npm install\n  npm run dev`)
} catch (error) {
  console.log((error as Error).message)
  process.exit(1)
}
