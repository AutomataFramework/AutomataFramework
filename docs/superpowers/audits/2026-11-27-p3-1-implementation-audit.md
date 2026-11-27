# Lane 2 review: Framework PR #14 (unit P3), head c6428ca

Verdict: **c6428ca PASS** (0 red, 5 notes). Reviewer: fresh session, Sonnet 5.5, medium. Examined: head c6428ca2859d, base 13eebff.
Brief: build prompt 09-P3, plan section "P3", criteria 4, 5, 7, review focus 1 and 4.

## Ran (on c6428ca, in a fresh clone)
- `bun check` clean; `pnpm lint` clean (95 files formatted); `bun test` 178 pass, 0 fail; `pnpm knip` clean.
- `bun scripts/check-line-budgets.ts`: /core stays inside 3,500 (PR says 1,017).
- `playwright test` (machine Chromium, `AUTOMATA_CHROMIUM`): 12 pass (audio 4, input 7, newcomer 1).
- A probe of my own (unserialisable state in `write`; see notes).
- CI on c6428ca: plan, lint, typecheck, test, build, budgets, browser (pinned Playwright image), private-names, commit-authors, gate all success. The browser job passing in the pinned image covers what the author could not run locally.
- Live-state file is gone from the tree (`docs/superpowers/live/` absent). Commit authors checked by CI.

## Focus areas
1. **Save and import refusals keep the original bytes: PASS.** `importInto` runs `parse` (JSON, `upgrade`, schema, `game` check) and only calls `put` on success; every refusal returns before any `store.set`. Tests compare the raw stored string before and after for: another game, a newer format (`format: 2`), and five kinds of non-save text. A store that throws on `set` or `get` never throws out of `list`, `read`, `exportSlot`, `write` or `importInto`; `canStore()` is false (review focus 1). A broken slot gives a plain Problem and slots 1 and 3 still read (criterion 7).
2. **Input order touch, then pad, then keys: PASS.** For sticks `[touch, pad, keys].find(nonzero)` is the order, tested in real Chromium with real key presses in one scenario (touch overrides pad and keys, then pad overrides keys, then keys). Buttons are an OR of the three, so order cannot be observed there; `lastUsed()` follows the most recent source. Player n reads only pad index n and `bindings[n]`; tested for both players. Tap actions: first press latches on, stay on through release, next press unlatches (criterion 5), tested.
3. **Node-only test: PASS.** It walks every relative import and re-export from `src/index.ts` (strips comments first), fails on `window`, `document`, `navigator`, `localStorage`, `AudioContext`, `requestAnimationFrame`, `Gamepad`, `pixi.js`, `svelte`; asserts the only package reached is `zod`; has a self-test that a planted global is caught; and loads the entry in a real `node` and runs `newState`, `step`, `playSound`. `browser.ts` is not reachable from the main entry; `tests/lib/layers.ts` still flags a feature importing `browser.ts` (only `to === 'browser.ts'` is not exempt).
4. **Playwright `testMatch` widening: PASS.** `**/tests/**/*.spec.ts` under `testDir: packages` finds exactly the 3 existing spec files (newcomer plus the two new). `bunfig.toml` already ignores `*.spec.ts`, so `bun test` does not run them. The change is named in the PR body with its reason. The `exports` entry `./browser`, `knip.json` and the layer rule changes are each listed and needed.

## Acceptance criteria
All of the P3 plan boxes hold on the evidence above: property tests (500 cases, own seeded loop; replay hash 10 times; upgrade twice equals once), `upgrade` made-up kind and missing step, `setGain('music', 0.3)` reads back 0.3, `mute(true)` puts master at 0 and restores it. Names and shapes match the plan's Produces block; the additions beyond it are listed in the PR body. No new dependency. No existing test changed or deleted.

## Notes (not blocking, none fixed here)
- N1. `saves.write` of a state that cannot be turned into JSON (a BigInt, a cycle) returns "This device can't keep saves right now.", which is the wrong cause. UNIT: `features/saves/saves.ts` `put`. Evidence: probe returned that Problem for `{n: 1n}` and a self-reference. Expected: a separate plain sentence ("This game state cannot be saved"). Follow-up for whoever first stores non-JSON state.
- N2. A state holding `NaN` or `undefined` comes back changed (`NaN` becomes `null`, `undefined` is dropped), so "save then read gives the same state" holds for JSON data only. The property test generates only finite JSON. Worth one line in the docs that game state is JSON.
- N3. `browserStore` falls back to memory only if the first probe write fails; if storage fills up later, `set` throws and `write` returns the "can't keep saves" Problem (the game keeps playing, which meets review focus 1). Fine for now.
- N4. The widened `testMatch` will also run any future `*.spec.ts` under a package's `tests/` folder, such as one inside `create-automata/template`. None exists today; keep it in mind when the template gains tests.
- N5. `scan()` is called by both `read()` and `padsMissing()` and flips `lastUsed` to `pad` on the busy edge, so calling `padsMissing()` first can consume the edge. Harmless for a game that calls `read()` once a frame.

Local Playwright ran in the machine's own Chromium; CI's pinned image run is green on the same commit.
