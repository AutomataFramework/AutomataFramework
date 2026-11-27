import { defineConfig, devices } from '@playwright/test'

// The one Playwright config. A file named `*.spec.ts` runs here; `*.test.ts` runs in `bun test`.
export default defineConfig({
  testDir: 'packages',
  testMatch: '**/tests/**/*.spec.ts',
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
    // The shell's own tests run on three profiles: a small phone, a tablet (WebKit, Safari's engine) and a computer.
    { name: 'tablet', testMatch: '**/shell/tests/journeys/shell.spec.ts', use: { ...devices['iPad (gen 7)'] } },
    {
      name: 'computer',
      testMatch: '**/shell/tests/journeys/shell.spec.ts',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } },
    },
    // The look check also runs on a phone in WebKit.
    { name: 'phone-webkit', testMatch: '**/shell/tests/journeys/look.spec.ts', use: { ...devices['iPhone SE'] } },
  ],
})
