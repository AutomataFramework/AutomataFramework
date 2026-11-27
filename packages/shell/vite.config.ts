import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// One file, `dist/index.js`, with the screens' Svelte compiled in and their styles carried inside it. The other
// packages and Svelte's own runtime stay outside it, so a game has one copy of each.
export default defineConfig({
  plugins: [svelte({ compilerOptions: { css: 'injected' } })],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rollupOptions: { external: [/^@automataframework\//, /^svelte(\/.*)?$/, 'zod', 'pixi.js'] },
  },
})
