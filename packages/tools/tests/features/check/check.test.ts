// Criterion 23 and review focus 5: the theme's contrast, keys, every word in every language, and the skills in step.
import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { skillProblems } from '../../../src/features/check/skills.ts'
import { cli, mcp, templateGame } from '../../lib/tools.ts'

const write = (dir: string, file: string, value: unknown): void => {
  mkdirSync(join(dir, file, '..'), { recursive: true })
  writeFileSync(join(dir, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2))
}

/** The template game plus a theme, a menu screen and words in English and Spanish. */
function gameWith(words: string, page = '#ffffff', es: Record<string, string> = { play: 'Jugar' }): string {
  const dir = templateGame()
  const manifest = JSON.parse(readFileSync(join(dir, 'public/automata.json'), 'utf8'))
  manifest.languages = ['en', 'es']
  manifest.content.push(
    { id: 'theme', kind: 'theme', path: 'content/theme.json' },
    { id: 'menu', kind: 'screen', path: 'content/menu.json' },
  )
  write(dir, 'public/automata.json', manifest)
  write(dir, 'public/content/theme.json', {
    format: 1,
    id: 'theme',
    kind: 'theme',
    colours: { page, words, button: '#000000', 'button-words': '#ffffff', focus: '#ffd23f', player: [] },
  })
  write(dir, 'public/content/menu.json', {
    format: 1,
    id: 'menu',
    kind: 'screen',
    items: [{ type: 'button', id: 'go', label: 'play', does: 'new-game' }],
  })
  write(dir, 'messages/en.json', { play: 'Play' })
  write(dir, 'messages/es.json', es)
  return dir
}

test('check: command line: a theme at 4.4 to 1 fails naming both colours, and 4.5 passes', async () => {
  const hard = await cli(gameWith('#787878'), ['check'])
  expect(hard.code).toBe(1)
  expect(hard.said).toContain('public/content/theme.json, line ')
  expect(hard.said).toContain('#787878')
  expect(hard.said).toContain('#ffffff')
  expect(hard.said).toContain('4.41 to 1')
  const fine = await cli(gameWith('#767676'), ['check'])
  expect(fine.said).toBe('All good. The game is ready to play.')
  expect(fine.code).toBe(0)
})

test('check: MCP: the same theme fails as a tool, with the same words', async () => {
  const hard = await mcp(gameWith('#787878'), 'check_game')
  expect(hard.error).toBe(true)
  expect(hard.said).toContain('#787878')
  const fine = await mcp(gameWith('#767676'), 'check_game')
  expect(fine).toEqual({ error: false, said: 'All good. The game is ready to play.' })
})

test('check: a planted key fails, naming the file and line but never the key', async () => {
  const dir = gameWith('#000000')
  const secret = `sk-${'Zq81'.repeat(8)}`
  write(dir, 'src/notes.ts', `// remember\nconst key = '${secret}'\n`)
  const result = await cli(dir, ['check'])
  expect(result.code).toBe(1)
  expect(result.said).toContain('src/notes.ts, line 2: This looks like an API key.')
  expect(result.said).not.toContain(secret)
})

test('check: a word missing in Spanish fails, naming the file and the word', async () => {
  const result = await cli(gameWith('#000000', '#ffffff', {}), ['check'])
  expect(result.code).toBe(1)
  expect(result.said).toContain('messages/es.json, line 1: The word "play" is missing.')
})

test('check: a screen that names a word nobody wrote fails, naming the screen file and its line', async () => {
  const dir = gameWith('#000000')
  write(dir, 'messages/en.json', { start: 'Start' })
  write(dir, 'messages/es.json', { start: 'Empezar' })
  const result = await cli(dir, ['check'])
  expect(result.code).toBe(1)
  expect(result.said).toMatch(/public\/content\/menu\.json, line \d+: It names the word "play"/)
})

test('check: a skill changed by hand fails, and --fix puts it back', () => {
  const source = mkdtempSync(join(tmpdir(), 'skills-'))
  write(source, 'make-a-game/SKILL.md', '# Make a game\n')
  const dir = templateGame()
  write(dir, '.agents/skills/make-a-game/SKILL.md', '# Make a game\n')
  write(dir, '.claude/skills/make-a-game/SKILL.md', '# Make a game, my way\n')
  expect(skillProblems(dir, false, source)).toEqual([
    {
      file: '.claude/skills/make-a-game/SKILL.md',
      line: 1,
      message: 'This skill was changed by hand, so it is not the one the tools came with.',
      fix: 'Run npm run check -- --fix to put it back.',
    },
  ])
  const said: string[] = []
  expect(skillProblems(dir, true, source, (line) => said.push(line))).toEqual([])
  expect(said).toEqual(['Put back .claude/skills/make-a-game/SKILL.md.'])
  expect(readFileSync(join(dir, '.claude/skills/make-a-game/SKILL.md'), 'utf8')).toBe('# Make a game\n')
  expect(skillProblems(dir, false, source)).toEqual([])
})

test('check: a missing skill fails in both places agents look', () => {
  const source = mkdtempSync(join(tmpdir(), 'skills-'))
  write(source, 'add-a-screen/SKILL.md', '# Add a screen\n')
  expect(skillProblems(templateGame(), false, source).map((p) => p.file)).toEqual([
    '.agents/skills/add-a-screen/SKILL.md',
    '.claude/skills/add-a-screen/SKILL.md',
  ])
})

test('check: --fix on the command line is read as a yes', async () => {
  const result = await cli(gameWith('#000000'), ['check', '--fix'])
  expect(result).toEqual({ code: 0, said: 'All good. The game is ready to play.' })
})
