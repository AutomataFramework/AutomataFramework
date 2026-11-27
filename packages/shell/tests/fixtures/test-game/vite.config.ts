import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'

// Relative paths, so the built game plays from any folder or link. Paraglide compiles `messages/` into `src/paraglide/`.
export default defineConfig({
  base: './',
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['globalVariable', 'baseLocale'],
    }),
  ],
})
