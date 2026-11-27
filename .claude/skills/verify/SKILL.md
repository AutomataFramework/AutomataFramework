---
name: verify
description: "Use when a change alters what the product does, before calling it done and before each commit that changes behavior: starts this repo's app or game from a clean checkout and drives it the way a person would."
---

# Verify

The product is the newcomer's path: `npm create automata my-game` makes a small 2D game (move a square to the yellow one), it plays in a browser, and `npm run link` puts it on a link. The repo itself has no app; the thing to run is a game made from the packed packages.

## Start it

From a clean checkout in a cloud container. Node 24 is what `engines` asks for; the container's Node 22 runs it too, with a warning.

```
pnpm install --frozen-lockfile
pnpm build                                  # builds every package into its dist/
mkdir -p /tmp/v/packs && for p in core 2d tools create-automata; do (cd packages/$p && pnpm pack --pack-destination /tmp/v/packs); done
cd /tmp/v && npm init -y && npm install --no-audit --no-fund packs/*.tgz
npx --no-install create-automata my-game && cd my-game
```

The new game asks npm for the packages by version, and the packages are not on npm yet, so point them at the tarballs: in `my-game/package.json` set each `@automataframework/*` dependency to `file:/tmp/v/packs/automataframework-<name>-0.0.1.tgz` and add `"overrides": { "@automataframework/core": "file:/tmp/v/packs/automataframework-core-0.0.1.tgz" }` so there is one copy of core. Then `npm install --no-audit --no-fund` and `npm run dev -- --port 5199`.

`pnpm test:browser` does all of this by itself, and the steps below are the by-hand version of what it checks.

It is ready when `curl localhost:5199` answers and the page sets `window.__automata.ready` to true. Last clean start, timed with `date` before and after (dev server up, page ready, win by keys): 3.1 seconds, on commit e12da6c plus the keyboard fix.

## Drive it

Open it in the container's Chromium (`require('playwright')`, `chromium.launch({ executablePath })`; this repo's Playwright 1.65.1 wants a browser build the container may not have, so set `AUTOMATA_CHROMIUM` to the one in `/opt/pw-browsers/chromium-*/chrome-linux64/chrome`). Use a 360 by 640 phone viewport and a 900 by 600 computer one. Take screenshots at deviceScaleFactor 1 into the scratchpad.

The main screen is one canvas: a white square at the top left and a yellow one at the bottom right, on dark blue. Hold a finger or the mouse down on the screen and the white square goes toward it; the arrow keys move it too. Reaching the yellow square ends the game (`window.__automata.state().outcome` is `'win'`).

## The journeys

- Keys: open the page, hold ArrowRight until the square is past x 254, hold ArrowDown. At the end `outcome` is `'win'`.
- Touch: in the phone viewport put the mouse down on the yellow square and wait. `outcome` is `'win'`.
- Mistake: change `"goal"` in `public/content/level.json` to `"far"`, run `npm run check`. It says `public/content/level.json, line 5` and what to change, and exits 1. Reload the page: the same message is shown and no game starts.
- Link: `npm run link` with no GitHub sign-in prints one plain sentence and makes nothing. With a stand-in GitHub it makes the repo, turns Pages on from a workflow, and pushes (the journey test does this).

## The shell's test game

`packages/shell` draws a game's menus, pause, settings and end screens from files. Its test game has no art: a white square, three stars and a timer. Build it and serve it from the test helpers (no packing, no install):

```
AUTOMATA_CHROMIUM=/opt/pw-browsers/chromium-*/chrome-linux64/chrome bun -e "
import { buildTestGame, serve } from './packages/shell/tests/lib/test-game.ts'
const s = await serve(await buildTestGame()); console.log(s.url); await new Promise(() => {})"
```

Open the printed link twice: a computer 1280 by 720 where only keys are used (any key skips the splash, Enter presses, arrows move along the buttons, Esc pauses and goes back), and a phone 375 by 667 with touch only (tap the splash, New game, Paused, Settings, Language, Español: the words change on every screen). `window.__automata.screen()` names the screen on show. `pnpm test:browser` runs this as `shell.spec.ts` (three profiles), `files.spec.ts` and `look.spec.ts`. Last run by hand on this change: build and serve 0.8 seconds, keys journey play, pause, play again, touch journey to Spanish language.

## Stop it

Stop the dev server (`pkill -f "vite --port 5199"`) and `rm -rf /tmp/v`.

## When it breaks

- The page stays blank and `__automata` is missing: the browser console says why. Two copies of `@automataframework/core` (a version that is not the tarball's) make `content()` fail with "No content file level is loaded". Fix the overrides above.
- `file:undefined` in `node_modules/@automataframework`: a tarball name was not found; check `ls /tmp/v/packs`.
- Playwright says its browser "doesn't exist": set `AUTOMATA_CHROMIUM`.
- `npm run link` hangs against a stand-in: the stand-in must answer from another process or an async call, not from a blocked one.
