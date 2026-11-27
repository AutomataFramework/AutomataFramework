// Turns `messages/` into `compiled/`, the words the shell ships with, through Paraglide's own compiler. The compiled
// files are kept in git so the typecheck and the tests need no build first; `tests/features/words/compiled.test.ts`
// fails when they are older than `messages/`. Run: `pnpm --filter @automataframework/shell compile:words`.
import { compile } from '@inlang/paraglide-js'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Compiles the shell's words into `outdir`. */
export async function compileWords(outdir: string): Promise<void> {
  await compile({
    project: `${root}project.inlang`,
    outdir,
    emitTsDeclarations: true,
    outputStructure: 'locale-modules',
    strategy: ['globalVariable', 'baseLocale'],
  })
  // Paraglide ignores everything it writes; here the files are kept, so the tests need no build first.
  rmSync(`${outdir}/.gitignore`, { force: true })
}

if (import.meta.main) await compileWords(`${root}compiled`)
