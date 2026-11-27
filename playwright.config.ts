import { defineConfig, devices } from '@playwright/test'

// The one Playwright config. A file named `*.spec.ts` runs here; `*.test.ts` runs in `bun test`.
export default defineConfig({
  testDir: 'packages',
  testMatch: '**/tests/journeys/*.spec.ts',
  // The newcomer journey packs and installs real packages, which takes a few minutes the first time.
  timeout: 600_000,
  workers: 1,
  reporter: [['list']],
  // The pinned Playwright image has its own browser. Where one is not at Playwright's path, point this at one.
  use: { trace: 'off', launchOptions: { executablePath: process.env.AUTOMATA_CHROMIUM || undefined } },
  projects: [
    {
      name: 'small-phone',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 640 }, browserName: 'chromium' },
    },
  ],
})
