// Opens a page that can `import('/src/browser.ts')` straight from the package's source, with no bundler: each file is
// served with its types taken out (Node's own `stripTypeScriptTypes`), which is all the browser entry needs.
import { existsSync, readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

const src = fileURLToPath(new URL('../../src', import.meta.url))

export async function openCorePage(page: Page): Promise<void> {
  await page.route('http://core.test/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/')
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>core</title><body></body>' })
    const file = join(src, path.replace(/^\/src\//, ''))
    if (!path.startsWith('/src/') || !file.endsWith('.ts') || !existsSync(file)) return route.fulfill({ status: 404 })
    return route.fulfill({ contentType: 'text/javascript', body: stripTypeScriptTypes(readFileSync(file, 'utf8')) })
  })
  await page.goto('http://core.test/')
}
