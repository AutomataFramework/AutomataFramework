# Slice 1a (2D, the shell and the agent tools): implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans to carry out one unit of this plan,
> step by step, with the execution prompt in the repo's `staged-path` skill. Steps use checkbox (`- [ ]`) syntax; the
> ticked boxes are the tracking document. Superpowers' testing skills are not loaded: Verification in `build`
> replaces them. Where Superpowers and the repo's rules differ, the repo's rules win.

**Goal:** a person who doesn't code asks for a game in a chat and gets a 2D game on their phone, with a splash, menu,
pause, settings, saves and end screens that just work, proven by the 2D sample's first room.

**Architecture:** a game is two plain functions, `update(state, inputs)` on a fixed 60-a-second tick and
`draw(state)`, plus JSON content files listed in `automata.json` and loaded when the game runs. `/core` holds
everything `update` needs and runs in Node; `/2d` draws on PixiJS; `/shell` is Svelte screens read from content files,
laid over the canvas as real HTML so a screen reader and the keyboard work; `/tools` is one list of commands that is
both the command line and the MCP server.

**Tech stack:** Node 24, pnpm 10 workspaces, TypeScript 7, bun 1.4.4 (tests, format, typecheck), oxlint, knip, Vite,
Playwright 1.65.1, pixi.js 8.23.0, Svelte 5, @inlang/paraglide-js 2.25.4, @inlang/plugin-message-format 4.4.4,
zod 4.6.6, @modelcontextprotocol/sdk.

**Status:** plan audit passed in round 2 (`shell-plan-audit.md`: `f9b41c60a0e4 PASS`, 0 red). This copy folds in
that round's nine notes and changes nothing else. Last changed 2026-11-27 08:23 UTC.

**Spec:** `/mnt/project-files/specs/2026-11-27-shell-design.md` (it moves to
`AutomataFramework/docs/superpowers/specs/` in unit U0, and this plan moves with it). The frozen roadmap,
`/mnt/project-files/roadmap/roadmap.md`, wins where the two differ. Criterion numbers below are the spec's.

**Path and lanes:** staged path. The spec and this plan are lane 1 docs. Every product unit is lane 2 (shared code,
schemas, `package.json`). Every pull request that changes a workflow file or Examples' pod code is lane 3; they are counted
under the units table. Nothing here touches `publish.yml`. Lane 3 units get a plan audit (this plan's audit covers them) and an implementation audit; lane 2 units
get one fresh review after the build.

## Global constraints

- Dependencies are the spec's list and no more: pixi.js 8.23.0 (pinned), Svelte 5, @inlang/paraglide-js 2.25.4,
  @inlang/plugin-message-format 4.4.4, zod 4.6.6, @modelcontextprotocol/sdk, unfake.js. Build tools already in the
  kit's stack: Vite, Playwright, `@sveltejs/vite-plugin-svelte` (Svelte's own Vite plugin). Anything else needs the
  Owner. So: no axe, no property-test library, no PNG library, no fal SDK (plain `fetch`).
- Every version is 0.x. Every doc and `AGENTS.md` says "formats may change". Screen, HUD and flow formats are marked
  "may change" until slice 2 closes.
- Content files are JSON with a `format` number and an `id`, listed in `automata.json`, checked by a zod schema that
  `/core` publishes.
- `update` runs in plain Node: `/core`'s main entry imports no PixiJS, no Svelte and no browser global.
- No art, sound, font or story file in `packages/`. The one exception is `/shell`'s own words in English and Spanish.
- Input order is touch, then gamepad, then keyboard and mouse. Every game's `state` holds a list of players.
- Accessibility bar: keys alone with visible focus, every drag also a button or key, every control named, nothing by
  colour alone, words at 4.5 to 1, less motion obeyed, 44-point targets.
- Frame rate: 60 is the aim, never under 30. Loading: first screen within 3 seconds on a throttled phone profile,
  under 1.5 MB before it shows. `AGENTS.md` under 24 KiB.
- No skill, doc or `AGENTS.md` line runs `automata` except through the game's own scripts (`npm run check` and so
  on).
- Code is grouped by feature (`src/features/<feature>/`), tests mirror `src/` under `tests/`, and each package has a
  `tests/architecture.test.ts` with its layer order. Clocks and seeds are injected. Browser tests wait on a ready
  signal (`window.__automata.ready`), never on a sleep.
- **Which runner runs a test:** a file named `*.test.ts` runs in `bun test`, with no browser (`bunfig.toml` keeps
  `bun test` to that name). A file named `*.spec.ts` needs a browser and runs in `@playwright/test`, from the repo's
  one `playwright.config.ts`, through `pnpm test:browser`. P1 adds both the config and the script with the first
  browser test. `@playwright/test` is read as inside "Playwright" in the spec's stack.
- Two more tools are read as inside the stack the spec names, and the coordinator is told so: `playwright-core`,
  a normal dependency of `/tools` and `/art`, so it is installed with every game (a few MB, no browser); the
  browser itself is fetched only when `shot`, `smooth` or `make-art` first runs; and `svelte-check`, which checks `.svelte` files where `bun check` cannot.
- All copy passes the drunk-grandma test. No real game name anywhere: "2D sample" only.
- Commits are authored by McThayDT, with no co-author or generated-by lines; merge commits, never squash.
- Fork code never runs on a RunPod pod. Agent-made code is built on GitHub's runners; a pod only opens the built
  folder in a browser.
- **Lessons carried into this plan (U0).** A session that waits on CI watches it in the foreground and never ends its
  turn only to wait. Every criterion has a test before the build starts (the map at the end of this plan). Browser
  tests wait for the game to be ready, never for a fixed time. Never commit test output folders. Keep CI under its
  measured capacity.

## Things I checked before planning (2026-11-27), and what they change

| Fact | Evidence | What the plan does |
|---|---|---|
| The pinned packages exist on npm at the spec's versions | `npm view`: pixi.js 8.23.0, paraglide-js 2.25.4, plugin-message-format 4.4.4, zod 4.6.6 all answer; MCP SDK is 1.32.2, Svelte 5.59.2, Vite 8.4.0, Playwright 1.65.1, TypeScript 7.0.2 | Pin those exact versions |
| **unfake.js is not on npm** | `npm view unfake.js` is a 404; `unfake` on npm is a stranger's unrelated package | Unit A1 copies the pinned MIT file into `packages/art/vendor/`, with its licence and commit, and its first step proves it runs. Never `npm install unfake` |
| The five new `@automataframework/*` packages have never been published | `npm view @automataframework/core` is a 404; `publish.yml` leaves out a package npm has never seen | Owner step O1: first publish and trusted publisher for each, before unit P1 can be used by Examples |
| `bun lint` does not exist in Bun 1.4.4 | the Framework repo's `history.md` | Lint stays `oxlint`; the spec's "bun lint" line is read that way |
| The Framework repo's tests import from `bun:test` | its `this-repo` skill | New tests do the same; the spec's "keep their vitest imports" is read as "bun runs the tests" |
| Slice 0 is on `main` in Framework (1f0e5bd) and Examples (be2e8b1); `create-automata` has a `preview` tag on npm (`0.0.1-preview.3.sha-1f0e5bd`) | `git log origin/main`, `npm view create-automata dist-tags`, 08:05 UTC | The build can start. Line counts "on `main` when 1a starts" are measured by unit U0, not typed here |
| Examples' RunPod cap is $25 a month (the split of the Owner's $50 standing cap; Editors has the other $25), 3 pods at once at most; one real GPU run measured about $0.02 (RTX 4090 Secure, $0.89 an hour, about 95 s) | Examples' `this-repo` skill and `history.md` on `main`; the coordinator's measured run | One pod a run, no secret on it. The month is worked out under "Pod spend" below and measured in E1 and E4 |
| On a pod only the job `gpu-smoke` may run, for 15 minutes; the pod deletes itself after 20; `gpu-smoke` may read three outputs and no secret; pod scripts run from the trusted base | Examples' `scripts/gpu/config.ts` and `tests/workflows/gpu-rules.ts`, as the audit read them | U2 is three pull requests in the order those files force |
| Framework's rule hook does not refuse a workflow and a test together yet (`ruleMix.firstTimeSetup: true`); Examples' does | each repo's `.claude/hooks/rules.json`, as the audit read them | The split is made in both, by the rule in `CLAUDE.md`: "A change does not quietly edit its own check" |
| The fresh-agent models and caps are set: Claude Code on `claude-sonnet-5-5`, OpenCode on `z-ai/glm-5.3`; **$2 a run and $10 a month for each agent.** Slice 0's stand-in runs cost $0.03 to $0.04 each | roadmap section 11, the Owner's card of 11-27; the coordinator's measured runs | E5 counts each agent's month before every batch and sets each run's limit so a batch cannot pass $10 |
| Examples' own tests still use Node's test runner and a stand-in `expect` "until slice 1a brings the game stack" | Examples' `this-repo` skill | E1 brings bun with Framework's pins and removes the stand-in, changing imports only |
| The non-coder door has never been run (the Owner cut its spike). A cloud chat cannot make a new GitHub repo: its GitHub access is held to the repos it was given | roadmap change log, 11-27; this session's own GitHub scope | No spike. P7 names the door (Claude Code in Claude's desktop app, plus one skill file) and checks it with a program before the Owner's chat |

## The baseline this slice is compared with

From `/mnt/project-files/baseline/baseline-note.md` (slice 0): plain Claude Code with Phaser's 28 skills made a
catch-the-stars game with a menu, settings, saves, touch controls and Spanish from one prompt in 8 minutes 13
seconds, for $2.78, with no follow-up. On the Owner's real phone it was choppy; a cheap look put about a third of
the frame rate on 70 separately animated dots, and the agent never measured it. It had no pause, splash, gamepad,
remapping or accessibility settings.

1a is judged on look and scale, not on minutes (the Owner, 11-27). The slice report sets the fresh-agent runs beside
the baseline for reference (time, cost, follow-ups, the five asks), and judges on: the Owner's approval of the look
(criterion 22), the lowest frame count on the Owner's phone and iPad (criteria 11 and 18), and scale with no code
change (a second language, a second player, a changed screen file, a changed content file in a built game).

## Review focus

Five things the spec implies and no criterion names. Each has its test in the unit that owns the code.

1. **The browser will not store anything** (private mode, storage full). Expected: the game still plays, and the
   saves screen says "This device can't keep saves right now" once. Test in P3.
2. **The player switches apps or the tab is hidden mid-play.** Expected: the game pauses itself and does not run a
   burst of missed ticks on return. Test in P4.
3. **A gamepad drops out mid-play.** Expected: the game pauses and says which player's controller is gone; touch or
   keys take over at once. Test in P5.
4. **A save from another game, or from a newer format, is imported.** Expected: a plain message, and the slot keeps
   what it had. Test in P3.
5. **A word is missing in Spanish, or a screen file names a word that does not exist.** Expected: `check` fails
   naming the file and the word; a built game shows the English word, never a blank or a key. Tests in P4 and P6.

---

## Units

One unit is one pull request on its own branch, unless it says otherwise. "Waits on" means it reads that unit's
output from `main`. Units that share no file and no output run side by side, three writers at most. Each Examples
unit starts by pinning the newest preview version of the packages.

| Unit | Repo | Lane | Waits on | Owns | Output | Done when |
|---|---|---|---|---|---|---|
| U0 Docs | Framework | 1 | slice 0 | `docs/superpowers/specs/2026-11-27-shell-*.md` | spec and plan in the repo; measured line counts written into the budgets table | merged |
| U1 Framework CI (U1a the workflow alone, then U1b the tests that read it) | Framework | 3 for U1a, 1 for U1b | slice 0 | U1a `.github/workflows/ci.yml`; U1b `tests/workflows/ci.test.ts` | `browser` and `budgets` jobs, in the gate | on a throwaway branch, closed after: a planted failing browser test fails the gate, and a pull request with no browser tests passes |
| U2 Examples CI (three pull requests: U2-1 pod settings and loosened tests, U2-2 the workflows alone, U2-3 the tests tightened) | Examples | 3 for U2-1 and U2-2, 1 for U2-3 | slice 0 | U2-1 `scripts/gpu/config.ts`, `tests/gpu/`, `tests/workflows/gpu-rules.ts`; U2-2 `.github/workflows/{ci,gpu}.yml`; U2-3 `tests/workflows/` | the `games` job, a build job inside `gpu.yml`, the harness step on the pod | every existing check stays green at each of the three merges; the new jobs are left out by `plan` until E1 |
| P1 The newcomer's path | Framework | 2 | U0 | `packages/core` (kernel, content), `packages/tools` (check, link), `packages/create-automata`, a stand-in `packages/2d` | one line makes a game that plays and goes on a link | criterion 20's script, run from a packed install |
| P2 The drawing spike and `/2d` | Framework | 2 | P1 | `packages/2d` | the drawing layer, and the Owner's phone number | criterion 12, then 14's "move a shape" |
| P3 Core: input, saves, plays, sound | Framework | 2 | P1 | `packages/core/src/features/{input,saves,plays,audio,upgrade}` | the rest of `/core` | criteria 17, 7 (data part), review focus 1 and 4 |
| P4 Shell: screens from files | Framework | 2 | P2, P3 | `packages/shell` (formats, flow, screens, error, words) | splash, menu, pause, end screens, credits, HUD | criteria 3, 8, 9, 19 on the test game |
| P5 Shell: settings and saves screens | Framework | 2 | P4 | `packages/shell/src/features/{settings,saves-screen,touch-controls,frame-counter}` | settings, on-screen controls, saves screens | criteria 2, 4, 5, 6, 7, 10 on the test game |
| P6 Tools and the MCP server | Framework | 2 | P3; `smooth` and `shot` also wait on P2 | `packages/tools` (all but check and link) | every command, each also an MCP tool | criteria 23, 26, 27a (planted game) |
| P7 The agent kit and the doors (the product pull request, then P7w, a workflow-only one, lane 3) | Framework | 2, and 3 for P7w | P5, P6, and the sign-in card (O6) | `packages/tools/skills`, `packages/tools/src/features/{door,github}/`, `packages/tools/src/features/commands/link.ts` (the device flow, after P1), `packages/create-automata/template`, `scripts/transcript-scan.ts`, `fresh-agent/door1a.txt`; P7w `.github/workflows/fresh-agent.yml` | `AGENTS.md`, skills, two hooks, the game's own workflow, the door's one file | criterion 25; the transcript scan's planted cases; one headless door run scanned clean |
| A1 Art | Framework | 2 | U0, Owner step O2 | `packages/art` | `/art` and its command | one image through fal.ai, unfake.js and the palette, with its sidecar |
| E1 Harness and the newcomer check (the product pull request, then E1w `newcomer.yml` alone, lane 3) | Examples | 2, and 3 for E1w | P1, U2, O1; E1w and the real link wait on the test-repo card (O7), and until then `newcomer.ts` runs against the stand-in from a session | `harness/`, `package.json`, `pnpm-workspace.yaml`; E1w `.github/workflows/newcomer.yml` | the harness, with one case, running on a pod | criterion 20; one pod run with the harness in it, its minutes and dollars measured |
| E2 Small examples | Examples | 2 | E1; P2 for the first four, P5 for the rest | `examples/` | ten one-file examples | criterion 14, each run in CI |
| E3 The 2D sample's first room | Examples | 2 | E1, P5, A1 | `games/2d-sample/` | the sample | criteria 1, 10, 17 |
| E4 The harness's cases | Examples | 2 | E3, P6 | `harness/cases/1a/` | every every-slice check | criteria 1 to 11, 24, 27, 27a, 29, 30 |
| E5 The fresh-agent check (E5a Framework judge; E5w-F Framework workflow alone; E5-1, E5-2, E5-3 in Examples, split as U2 is) | Framework and Examples | 2 for E5a; 3 for E5w-F, E5-1, E5-2; 1 for E5-3 | P7, E4 | Framework `fresh-agent/slice1a.txt`, `scripts/fresh-agent-judge.ts`, `scripts/fresh-agent-month.ts`, `.github/workflows/fresh-agent.yml`; Examples `scripts/gpu/config.ts`, `harness/fresh-agent-smooth.ts`, `.github/workflows/fresh-agent-smooth.yml`, `tests/workflows/` | 5 runs on each agent, judged | criterion 16, inside $10 a month for each agent |
| E6 The site bundle (the product pull request, then E6w `pages.yml` alone, lane 3) | Examples | 2, and 3 for E6w | E1, E2, E3, O3 | `harness/site-bundle/`; E6w `.github/workflows/pages.yml` | examples and sample on Examples' Pages, with a manifest that names its commit | the manifest lists every example with its source |
| S1 The examples page | Site | 2 | E6 | the Site's examples page and its build step | examples live on automataframework.com, waitlist beside them | criterion 15's journey, criterion 31's first half |
| Z The slice end | all | 1 | everything | `docs/superpowers/audits/`, the screens page, the report | walk, look rounds, Owner's play, report, clip, retrospective | criteria 18, 21, 22, 28, 29 (people), 31 |

**Side by side:** after P1 merges, P2, P3 and A1 run together, with E1 as soon as O1 is done. Then P4 with P6. Then
P5 with E2's first four. Then P7 with E3 and the rest of E2. Examples units fill free writer places, and none starts
before E1 has merged.

**Workflows land just before their user, never earlier.** `newcomer.yml` with E1, the fresh-agent workflow changes
with P7 and E5, `pages.yml` with E6. U1 and U2 hold only what P1 and E1 use: `browser`, `budgets`, `games`, the
build job and the harness step.

**Lane 3 pull requests, counted:** U1a, U2-1, U2-2, E1w, P7w, E5w-F, E5-1, E5-2, E6w. Nine, each with its own
implementation audit, so about nine audits beyond the product reviews. That is inside the 12 days only if each is
small; it is an estimate, and the first three will show the real time. **Marked hard (high effort, with the reason):** P2 (the redesign decision
rests on it), P5 (remapping, touch controls and three access settings interact), P7 (the door has never been run).

### Owner steps, all of them, as one list

Each is one batch a session writes and runs through the Owner's Mac session; the Owner only signs in or pastes a key.

- **O1, before E1:** first publish of `@automataframework/core`, `/2d`, `/shell`, `/tools` and `/art` at `0.0.1`, as
  real placeholders that say "not ready yet", the way `create-automata` was (npm gives a first version `latest`
  whatever the tag), and `npm trust github <name> --repo AutomataFramework/AutomataFramework --file publish.yml
  --allow-publish` for each.
- **O2, before A1:** a fal.ai key, set as `FAL_KEY` in the cloud environment only. Sessions make the art; CI never
  calls fal.ai.
- **O3, before E6:** turn on Pages for Examples (`build_type=workflow`).
- **O4, during P2:** open the spike's link on the real phone and read the number off the screen.
- **O5, at the slice end:** play the sample on phone and iPad and note the lowest frame count; type the non-coder
  check's sentences in a fresh chat and save it; look at the screens page; say yes or no to the clip's post.
- **O6, a card now (it gates the door, so P1's `link` and P7 need it):** a GitHub sign-in app, "Automata", owned by
  the organisation: **an OAuth app** (not a GitHub App, whose tokens reach only repos it is installed on) with the
  device flow turned on. `link` asks for the scopes `public_repo` and `workflow`; GitHub refuses a push that adds
  the game's workflow file without the second. `link` uses it to sign a person in by showing a short code to
  type on github.com. Its client id is public and is not a key. Without it, `link` works only where git is already
  signed in to GitHub, which a non-coder's computer is not, and criterion 21 could pass only on the Owner's own
  machine. Recommended: yes.
- **O7, a card when E1 starts and not before:** a public test repo `AutomataFramework/newcomer-check`, so the
  newcomer check can put a game on a real link (the roadmap says no new repo without a card), and its credential:
  Examples' own GitHub App also installed on that one repo, with contents, pages and administration write. Until it
  is answered, criterion 20 is checked against a stand-in for GitHub, and it is not called met.
- **Possible later card, only with numbers:** if E5's first measured run shows that five runs of a whole game do not
  fit in $10 a month for an agent, the card gives the measured cost and asks for the month's number.

No other key is asked for. The coordinator reports a standing permission to merge in every repo, lane 3 included,
once the audits pass and CI is green; a build session checks it is written under "Standing permissions" in that
repo's `history.md` before it relies on it.

### Pod spend in Examples, worked out (estimates, measured in E1 and E4)

- **Runs:** `gpu.yml` starts a pod on each push to a same-repo pull request, once in the merge queue and once on
  `main`. Examples has about 14 pull requests in 1a that are not docs-only (U2's three, E1's two, E2's two, E3, E4,
  E5's three, E6's two). At about 4 pushes each, that is 14 × (4 + 1 + 1) = 84 runs, plus about 20 for slice-end
  fixes and 3 for the fresh-agent smoothness batches: **about 107 runs.**
- **Cost a run:** the smoke picture alone measured about $0.02. With the harness, a guess of 10 minutes on one pod at
  $0.89 an hour is about $0.15. `config.ts` books a pod with no known price at $3 an hour, which would make the
  same run $0.50 in the ledger.
- **The month:** 107 × $0.15 is about **$16** against $25. At the $3 booking it would be $53, over the cap.
- **So:** E1 measures the first real run and writes minutes and dollars in its pull request. E4 measures again with
  every case in, and projects: dollars spent so far, plus runs left × the measured cost. **A card goes to the Owner
  before the ledger reaches $20, not at $25,** because at the cap `gpu` turns red and every Examples merge stops.

### Line budgets (source, without tests)

Set here from zero, since these packages are new. U0 writes the measured count on `main` beside each. CI's `budgets`
job fails over the number; at the budget the slice cuts something or brings a card.

| Package | Budget | On `main` when 1a starts | Why this size |
|---|---|---|---|
| `/core` | 3,500 | 0 (no `packages/*/src` files) | tick, input, content, schemas, saves, plays, upgrader, audio |
| `/2d` | 1,200 | 0 (no `packages/*/src` files) | one drawing layer |
| `/shell` | 5,000 | 0 (no `packages/*/src` files) | Svelte files counted too |
| `/tools` | 3,000 | 0 (no `packages/*/src` files) | commands, MCP, smoothness, link |
| `/art` | 700 | 0 (no `packages/*/src` files) | three steps and a sidecar |
| `create-automata` | 300, plus 700 for `template/` | 0 in `src` (its one file, `index.js`, is 2 lines) |  |

Measured by `git ls-files 'packages/*/src' | xargs wc -l` on `main` at 1f0e5bd (no files matched). These are estimates, not measurements. V1's 2D runtime was 57,341 lines, so the report watches the trend.

---

## U0: Docs

- [x] Copy the spec and this plan to `docs/superpowers/specs/` in Framework, unchanged but for their own paths.
- [x] Run `git ls-files 'packages/*/src' | xargs wc -l` on `main` and write the counts into the budgets table.
- [x] Carry the lessons whose trigger matches: "a session that waits on CI watches it in the foreground"; from V1,
      "every criterion has a test before the build starts" (the map at the end of this plan), "browser tests wait
      for ready", "never commit test output folders", "keep CI under its measured capacity".

## U1: Framework CI (two pull requests)

A workflow change and the test that reads it never share a pull request, by `CLAUDE.md`: "A change does not
quietly edit its own check." So **U1a** changes `.github/workflows/ci.yml` and nothing else (lane 3, with its
implementation audit), and **U1b** changes `tests/workflows/ci.test.ts` and nothing else (lane 1). U1a goes first:
the test on `main` only asks that `gate` knows every job, which U1a keeps true.

- [ ] U1a: `plan` sets `browser=true` when `playwright.config.ts` exists and `budgets=true` when
      `scripts/check-line-budgets.ts` exists; otherwise the job is left out and `gate` passes without it. This is
      how the workflow lands before P1, its first user, which is the next unit.
- [ ] U1a: `browser` runs `pnpm test:browser` in the Playwright image, pinned by digest, with `--user 1001
      --ipc=host`. It runs in 1 piece: Settings allows up to 6, and Framework's browser tests are few; Examples
      holds the large set. `budgets` runs `bun scripts/check-line-budgets.ts`.
- [ ] U1a's done check, on a throwaway branch that is closed after: a planted `playwright.config.ts` with one
      failing `*.spec.ts` fails `gate`; without them `gate` passes.
- [ ] U1b: `ci.test.ts` asserts `gate` needs `browser` and `budgets`, every action in both is pinned to a commit,
      and `browser` uses the image by digest with those two flags.

## U2: Examples CI (three pull requests)

Examples' pod code and its tests force the order. On `main`, `scripts/gpu/config.ts` lets a pod take only the job
`gpu-smoke`, and `tests/workflows/gpu-rules.ts` pins that job's 15 minutes and the three outputs it may read. Pod
scripts run from the trusted base, so a settings change must be on `main` before a workflow can use it.

- **U2-1 (lane 3: the gate's own code):** `scripts/gpu/config.ts`, `tests/gpu/*`, `tests/workflows/gpu-rules.ts`.
  The job's time limit and the pod's own limits rise to fit the harness (to 30 minutes for the job, with the pod's
  self-delete and the sweep age raised to match, each still a tested value). `gpu-rules.ts` is loosened to accept
  both today's `gpu.yml` and the new one: `gpu-smoke` may also `need` the build job and download this run's
  artifact. It still fails on `secrets.` or `vars.` in the pod's job.
- **U2-2 (lane 3: workflows alone):** `.github/workflows/ci.yml` and `gpu.yml`.
- **U2-3 (lane 1: tests alone):** `tests/workflows/*` tightened to the new shape only.

- [ ] U2-2, `ci.yml`: a `games` job on a GitHub runner, left out by `plan` until `harness/run.ts` exists:
      `pnpm install --frozen-lockfile`, `pnpm check:games` (each game's and example's `check`), `pnpm test`.
- [ ] U2-2, `gpu.yml`: a new job, `build-games`, on a GitHub runner with no secret, builds the games and examples
      and uploads the built folders, kept 1 day. `gpu-smoke` `needs` it and downloads **that same run's** artifact,
      so no token and no run id reaches the pod. After the smoke picture, the same pod runs `pnpm harness` on those
      folders: everything drawn (the journeys, the frame guard, loading, smoothness, the pictures, the replays).
      `plan` leaves both out until `harness/run.ts` exists.
- [ ] One pod a run. If the job passes its time limit, the harness is split into pieces on separate pods, 3 at most
      (the pod limit), from a list in `harness/pieces.ts` with a test that every case sits in exactly one piece.
      That split is its own later trio of pull requests, made only when a measured run needs it.
- [ ] The software-renderer guard stays. WebKit and Firefox replays log a warning and block nothing.
- [ ] U2-3's tests: every action pinned, no fork reaches a pod or a secret, every upload has a retention, `gate`
      knows every job, the pod's job reads no secret.
- [ ] Done check: every check already on `main` stays green at each of the three merges, and a pull request made
      after them still gets its smoke picture. The harness's first real run is E1's done check, not this unit's.

---

## P1: The newcomer's path

The first thing built: one line makes a game, the game plays, one command puts it on a link.

**Files:**
- Create `packages/core/src/index.ts`, `src/features/game/{game,tick,random}.ts`,
  `src/features/content/{manifest,load,locate,problems,kinds}.ts`, `src/lib/result.ts`, `tests/architecture.test.ts`
- Create `packages/2d/src/index.ts` (a stand-in of at most 60 lines: `run`, `clear`, `drawRect`; P2 replaces it)
- Create `packages/tools/src/index.ts`, `src/bin.ts`, `src/features/commands/{registry,check,link}.ts`,
  `src/features/keys/find-keys.ts`, `src/features/github/{credential,pages}.ts`
- Replace `packages/create-automata/index.js` with `src/index.ts` and `template/`
- Create `scripts/check-line-budgets.ts`, `tests/no-content.test.ts`

**Produces (exact names later units use):**

```ts
// @automataframework/core
type Player = { id: number }
type State<G> = { tick: number; seed: number; players: Player[]; outcome: null | 'win' | 'lose'; physics: unknown; game: G }
type PlayerInput = { down: string[]; sticks: Record<string, [number, number]> }
type Inputs = PlayerInput[]                       // one per player, same order as state.players
type Game<G> = {
  init(start: { players: number; seed: number }): G
  update(state: State<G>, inputs: Inputs): State<G>   // may change state and return it
  draw?(state: State<G>): void
}
function newState<G>(game: Game<G>, start: { players: number; seed: number }): State<G>
function step<G>(game: Game<G>, state: State<G>, inputs: Inputs): State<G>
function isDown(action: string, player?: number): boolean      // player defaults to 0
function wasPressed(action: string, player?: number): boolean  // down this tick, not the last
function stick(action: string, player?: number): [number, number]
function random(state: State<unknown>): number                 // seeded; the only randomness update may use
function win(state: State<unknown>): void
function lose(state: State<unknown>): void

type Problem = { file: string; line: number; message: string; fix: string }
type Result<T> = { ok: true; value: T } | { ok: false; problems: Problem[] }
type Read = (path: string) => Promise<string>
type Content = { manifest: Manifest; files: Record<string, unknown> }   // files by id, each already checked
function loadGame(read: Read): Promise<Result<Content>>        // reads automata.json, then every listed file
function content<T>(id: string): T                             // a loaded content file, by id
function defineKind(kind: string, schema: ZodType): void       // a game's own kind of content file
const schemas: Record<string, ZodType>                         // also written to schemas/*.json at build
```

`automata.json`: `{ format: 1, id, name, size: [width, height], languages: ['en', ...], start: 'menu' | 'play',
content: [{ id, kind, path }], assets: [{ id, kind: 'image' | 'sound' | 'font', path }] }`.

`Manifest` is the checked form of `automata.json`. Every game in a browser sets `window.__automata = { ready:
boolean, state(): State, stats() }`, which the tests wait on and read; the stand-in `run` sets it first.

`step` runs `update` once with the current inputs set for `isDown`; the browser loop calls it at a fixed 60 a second
with at most 5 catch-up ticks. `physics` is always `null` in 1a: it is the named place for slice 3.

**The game a newcomer gets** (`template/src/game.ts`, under 40 lines): move a square to a goal, drawn with
`drawRect`, no art, no sound. Its scripts: `dev`, `build`, `check`, `link`. P7 fills in the rest of the template.

**`link`:** runs the gate (`check`, the key scan), then signs in to GitHub: it reads a token from `git credential
fill` for `github.com` when git is already signed in; when it is not, it uses GitHub's device flow with the
"Automata" sign-in app (O6), which prints one short code and one address, "Open github.com/login/device and type
ABCD-1234", and keeps the token in git's own credential store. No `gh`. P1 does not wait for the card: it ships the
`git credential fill` path, and with no sign-in says one plain sentence; the device flow is added, with its tests,
in P7 once O6 is answered. Then it makes the repo if there is none (public, after
printing the "these files will be public" sentence), turns on Pages with `build_type: workflow`, pushes, waits for
the game's own workflow, then prints the link once it answers with this commit's build id. Every refusal is one
plain sentence and what to do.

- [x] **Test (journey, written first, `packages/tools/tests/journeys/newcomer.spec.ts`, with `playwright.config.ts` and the `test:browser` script):** pack the six packages,
      install them in a temp folder outside the repo, run `create-automata my-game`, then `npm run check` (exit 0),
      `npm run build`, serve `dist/` under `/my-game/` as Pages does, and in the small-phone profile wait for ready,
      tap toward the goal and read `state.outcome === 'win'`. Then `npm run link` against a stand-in GitHub, and
      assert the calls: repo, Pages with `build_type: workflow`, push.
- [x] Tests under it: `tick.test.ts` (same inputs give the same state; `wasPressed` is true for one tick),
      `load.test.ts` (a mistake in a listed file gives a `Problem` with the file, the line and a fix; a file not
      listed is ignored), `locate.test.ts` (path to line), `find-keys.test.ts` (a planted `sk-...`, a GitHub token
      and a private key block are found; a normal long word is not), `link.test.ts` (refuses a failing check
      and a found key, each with its sentence; with no sign-in it says one plain sentence and makes nothing;
      it never makes a repo before the public sentence).
- [x] `tests/no-content.test.ts` (criterion 13): fails on any file under `packages/` ending in an art, sound or font
      extension, and on any message file but `packages/shell/messages/{en,es}.json`. A template words file may hold
      the game's name and nothing else.
- [x] `scripts/check-line-budgets.ts` with its test (a planted package over its number fails).
- [x] Implement, run the journey green, run it once more by hand like a person (the `verify` skill, which this unit
      writes for the repo: how to start the template game and reach its first screen).
- [ ] Commit, pull request, lane 2 review.

## P2: The drawing spike, then `/2d`

Nothing else is built on `/2d` until the number is in.

**Files:** `packages/2d/src/features/{renderer,sprites,shapes,text,frame-count}/`, `packages/2d/spike/` (a page, not
shipped), tests.

**Produces:**

```ts
// @automataframework/2d
function run<G>(game: Game<G>, options?: { canvas?: HTMLCanvasElement }): void   // a game with no shell
function clear(color: string): void
function drawSprite(id: string, x: number, y: number, options?: { scale?: number; rotation?: number; flipX?: boolean; alpha?: number; frame?: number }): void
function drawRect(x: number, y: number, width: number, height: number, color: string): void
function drawCircle(x: number, y: number, radius: number, color: string): void
function drawLine(x1: number, y1: number, x2: number, y2: number, color: string): void
function drawText(text: string, x: number, y: number, options?: { size?: number; color?: string; align?: 'left' | 'center' | 'right' }): void
function screenSize(): [number, number]
function frameStats(): { fps: number; lowest: number; updateMs: number; drawMs: number; renderMs: number; calls: Record<string, number> }
```

Approach: draw calls are immediate, as in Raylib. Behind them, one pool of PixiJS sprites is reused each frame in
call order, so a frame of 2,000 calls makes no new objects. The game draws at `automata.json`'s `size` and the canvas
is scaled to fit, by whole numbers when the theme asks for pixel art.

- [ ] **The spike first:** `spike/index.html` draws 2,000 moving `drawSprite()` calls a frame from one small test
      image made in code, and shows the frame count and the lowest seen in large digits. Publish it with `wrangler pages
      deploy` to a Cloudflare Pages project named `automata-spike`, on the account already in use, and delete the
      project once the number is written down; the Owner opens it on the real phone (O4). If that phone is faster than a 2020 iPhone SE, E4's frame
      guard on the pod, with the CPU slowed 4 times, stands in for the floor.
- [ ] **The decision, written in the pull request:** 60 on the Owner's phone passes. Under 60, redesign before going
      on: first a single batched mesh, written by hand; then fewer state changes. Three tries, then a card. The
      redesign keeps the function names above.
- [ ] Tests: `sprites.spec.ts` (2,000 calls make 2,000 pooled sprites and no growth on frame 2);
      `shapes.spec.ts`, `text.spec.ts`, `frame-count.spec.ts`; `packages/2d/tests/move-a-shape.test.ts` counts the lines of the
      "move a shape" fixture (under 15, criterion 14).
- [ ] Commit, pull request, lane 2 review. The pull request names the phone's number, the phone and the commit.

## P3: Core: input, saves, plays, sound, the upgrader

**Files:** `packages/core/src/features/{input,saves,plays,audio,upgrade}/`, `src/browser.ts` (the
`@automataframework/core/browser` entry), tests.

**Produces:**

```ts
// content kind 'controls'
// { format: 1, id, actions: [{ id, label, kind: 'button' | 'stick', keys: string[], pad: string[], canTap?: boolean }],
//   players: [{ keys?: Record<action, string[]> }] }   // player 2's own keys
type Controls = { format: 1; id: string; actions: Action[]; players: { keys?: Record<string, string[]> }[] }
type Bindings = { keys: Record<string, string[]>; pad: Record<string, string[]>; tap: string[] }  // per player

// @automataframework/core
type KeyValue = { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void }
const slots = ['auto', '1', '2', '3'] as const
function createSaves(store: KeyValue, gameId: string, now: () => number): {
  list(): { slot: string; savedAt: number; tick: number }[]
  write(slot: string, state: State<unknown>): Result<true>
  read(slot: string): Result<State<unknown>>
  exportSlot(slot: string): string                 // plain JSON text
  importInto(slot: string, text: string): Result<true>
  canStore(): boolean
}
function upgrade(kind: string, file: unknown): Result<unknown>     // runs every step from file.format to the newest
function addUpgrade(kind: string, from: number, up: (old: unknown) => unknown): void
type Play = { format: 1; id: string; game: string; build: string; seed: number; players: number;
              runs: [ticks: number, inputs: Inputs][]; end: { tick: number; hash: string } }
function recordPlay<G>(game: Game<G>, start: { players: number; seed: number }): { push(inputs: Inputs): State<G>; finish(): Play }
function replayPlay<G>(game: Game<G>, play: Play): { state: State<G>; hash: string; same: boolean }
function hashState(state: State<unknown>): string  // 64-bit FNV-1a of the JSON with sorted keys
function playSound(id: string, options?: { volume?: number; bus?: 'effects' | 'music'; loop?: boolean }): void  // queued; silent in Node

// @automataframework/core/browser
function readInputs(controls: Controls, bindings: Bindings[]): { read(): Inputs; lastUsed(): 'touch' | 'pad' | 'keys'; padsMissing(): number[] }
function createAudio(): { play(id: string): void; setGain(bus: 'master' | 'music' | 'effects', value: number): void; mute(on: boolean): void; gain(bus: string): number }
function startLoop(run: { step(): void; draw(): void; onError(error: unknown): void }): { pause(): void; resume(): void }
function browserStore(): KeyValue                   // localStorage, or memory when it is refused
```

A save file is `{ format: 1, id, game, savedAt, tick, state }`. Saves and plays go through `upgrade`.

- [x] **Tests first (property tests with our own seeded loop, 500 cases each, no library):** save then read gives back
      the same state; export then import gives the same state; `replayPlay` of a recorded play gives the same hash,
      10 times; `upgrade` twice is the same as once. `tests/node-only.test.ts` imports the main entry in plain Node
      and fails on any `window`, `document`, `pixi.js` or `svelte` reference.
- [x] `saves.test.ts`: a broken file gives a plain `Problem` and every other slot still reads (criterion 7);
      **review focus 1:** a store that throws on `set` makes `canStore()` false and nothing else throws;
      **review focus 4:** importing a save whose `game` differs, or whose `format` is newer, is refused with a plain
      sentence and the slot keeps its bytes.
- [x] `upgrade.test.ts`: a made-up kind at format 0 with one step reaches format 1; a missing step is a `Problem`.
- [x] `input.spec.ts`: touch beats pad beats keys when two are used in the same tick; a held action
      marked tap fires on one press and stays on until the next (criterion 5); player 2 reads only player 2's pad
      and keys.
- [x] `audio.spec.ts`: `setGain('music', 0.3)` reads back 0.3 from the gain node; `mute(true)` puts
      the master at 0 (criterion 4).
- [x] Implement, commit, pull request, lane 2 review.

## P4: Shell: screens from files

**Files:** `packages/shell/src/features/{formats,flow,screens,hud,theme,words,error,start}/`, `messages/{en,es}.json`,
`project.inlang/`, `tests/`, and a test game under `packages/shell/tests/fixtures/test-game/` (no art).

**Produces:**

```ts
// @automataframework/shell
function startGame<G>(game: Game<G>, options?: { root?: HTMLElement }): void   // the whole of a game's main file
```

Content kinds (all `format: 1`, all "may change"):

- `screen`: `{ id, title?: word, items: Item[] }`, where `Item` is one of `button { id, label: word, does: Event }`,
  `text { words: word }`, `image { asset }`, `slider { id, label, setting }`, `steps { id, label, setting }`,
  `switch { id, label, setting }`, `list { id, from: 'saves' | 'languages' | 'controls' | 'credits' }`.
- `hud`: `{ id, items: [{ type: 'text' | 'icon' | 'bar', shows: path-into-state, label: word, where: 'top-left' |
  'top' | 'top-right' | 'bottom-left' | 'bottom' | 'bottom-right', player?: number }] }`.
- `flow`: `{ id, start, screens: { [name]: { screen: id, on: { [event]: name | { ask: word, yes: name } } } } }`.
  Built-in events: `skip`, `timeout`, `new-game`, `continue`, `pause`, `resume`, `win`, `lose`, `retry`, `back`.
- `theme`: `{ id, colours: { page, words, button, button-words, focus, player: string[] }, fonts: { main, plain },
  pixelArt: boolean, playerMarks: string[] }`.
- `credits`: `{ id, lines: [{ role: word, names: string[] }] }`.

A `word` is a message name. The shell's own words are compiled by Paraglide from `messages/`; a game's words are
compiled at its build by Paraglide's Vite plugin, set up in the template. Words are the one thing that needs a build
(the game's own workflow does it on every commit); every other content file is fetched when the game runs.

The screens are real HTML laid over the canvas. One Svelte component per item type, one for a screen, one for the
flow. The splash, menu, pause, end screens and credits are content files the template carries; the shell holds no
screen of its own but "Something went wrong. Try again".

- [ ] **Journey first (`tests/journeys/shell.spec.ts`, three profiles):** splash, skip, menu, New game, play, pause,
      Main menu (asks first), then win and lose, each reached and left. It fails at the first step named.
- [ ] `flow.test.ts`: the menu shows Continue only when `list()` has a save; Main menu from pause asks first;
      `start: 'play'` skips splash and menu.
- [ ] Criterion 19: in the built test game, with no rebuild, change the menu screen file (which word a button uses
      and the order of two items), the HUD file (where the count sits) and the flow file (where Retry goes), reload,
      and each has changed. Message files are not the content files criterion 19 means: words are compiled, and the
      game's own workflow rebuilds them on every commit.
- [ ] Criterion 8: a screen file with a mistake shows the file, the line and the fix, and no game starts.
- [ ] Criterion 9: a test game whose `update` throws on tick 100 leaves the menu, settings and saves working.
- [ ] Criterion 3 (first half): switching to Spanish changes every word on every screen; a test walks every word
      shown and fails on any that is the same in both languages and not on a short allow list.
- [ ] **Review focus 2:** hiding the page pauses the loop; on return, at most 5 ticks run.
- [ ] **Review focus 5:** a missing Spanish word shows the English one.
- [ ] Implement, run like a person, commit, pull request, lane 2 review.

## P5: Shell: settings, on-screen controls, saves screens

**Files:** `packages/shell/src/features/{settings,saves-screen,touch-controls,remap,frame-counter}/`, tests.

**Produces:** `type Settings = { language: string; master: number; music: number; effects: number; mute: boolean;
textSize: 0 | 1 | 2 | 3; contrast: 0 | 1 | 2; motion: 0 | 1 | 2; bindings: Bindings[]; touch: { x: number; y: number;
size: number }[]; frameCounter: boolean }`, kept under `automata:<game id>:settings`. Each `setting` name a screen
file may use is a key of `Settings`.

- First run: `motion` from `prefers-reduced-motion`, `contrast` from `prefers-contrast`, `textSize` from the
  browser's own font size (over 16 px gives level 1, over 20 px level 2).
- `textSize` 3 and `contrast` 2 switch to the theme's plain font. `motion` 1 shortens moves; 2 removes them.
- On-screen controls: one stick and up to four buttons from the controls file; each can be moved and resized by
  dragging or by buttons on the Controls screen; they hide when a pad or keys are used and come back on a touch.
- The autosave slot is written on pause and when the page is hidden, and never while an end screen shows.
- The frame counter is a switch on the Settings screen; it shows `frameStats()`'s frame rate and lowest seen.
- Two players are told apart by `playerMarks` (a shape and a label), not colour alone.

- [ ] **Journey first:** `settings.spec.ts` walks each setting on three profiles by touch alone, pad alone and keys
      alone (a pad is driven through the test's own pad stand-in), and reloads.
- [ ] Criterion 2: every button on every screen is at least 44 by 44, has a focus ring that is visible (its outline
      has width and a 3 to 1 contrast), one label and an accessible name.
- [ ] Criterion 5: remap jump, play, reload, still remapped; a held button set to tap works as a tap.
- [ ] Criterion 6: each level changes a measured thing (font size, contrast ratio, move time), and a fresh profile
      that asks for less motion starts at level 2.
- [ ] Criterion 7: save to a slot, reload, Continue, same hash; export, import, same hash; a broken file gives the
      plain message.
- [ ] Criterion 10 on the test game: two players, separate keys, different marks.
- [ ] **Review focus 3:** unplugging the stand-in pad pauses and names the player.
- [ ] Implement, run like a person, commit, pull request, lane 2 review.

## P6: Tools and the MCP server

**Files:** `packages/tools/src/features/commands/{play,shot,record,replay,content,smooth,mcp}.ts`,
`src/features/check/{contrast,words,skills}.ts`, `src/features/browser/open.ts`, tests.

**Produces:** `type Command = { name: string; summary: string; input: ZodType; run(input, io): Promise<Result<unknown>> }`
and `const commands: Command[]`. The command line and the MCP server are both built from this one list, so a tool
that is not also a command cannot exist.

| Command (the game's script) | MCP tool | What it does |
|---|---|---|
| `check` | `check_game` | every content file, the theme's contrast, every word in every language, keys, the skills in step |
| `play` | `play_game` | no screen: takes inputs and a tick count, steps, prints the state |
| `shot` | `take_screenshot` | opens the built game in a browser at a tick and saves a picture |
| `record` | `record_play` | plays from an inputs file and saves a play under `plays/` |
| `replay` | `replay_plays` | replays every play and names any whose end differs |
| `content` | `list_content` | the content files, each with its kind and JSON Schema |
| `smooth` | `check_smoothness` | the smoothness check, below |
| `link` | `make_link` | the gated link (from P1) |

**The smoothness check:** opens the built game in Chromium at the floor phone's size (375 by 667), slows the CPU 4
times, replays the game's first play (or idles 10 seconds on the first screen with none), and reads `frameStats()`.
It prints the lowest frame rate and the costliest part (update, draw calls by function, PixiJS render, the screens),
in plain words. Under 30 it fails. When the renderer string names SwiftShader or llvmpipe it reports "not measured:
this computer has no graphics chip", and never a pass. The browser is the person's own Chrome when there is one;
otherwise the tool installs Playwright's Chromium once, saying so.

- [x] Test first: `registry.test.ts` walks `commands` and fails unless each has a command-line test and an MCP test
      (criterion 26); the MCP server's tool list equals the names above.
- [x] `check.test.ts`: a theme at 4.4 to 1 fails naming both colours, 4.5 passes (criterion 23); a planted key
      fails; a word missing in Spanish fails naming the file and the word (review focus 5); a skill edited by hand
      fails, and `check --fix` puts it back.
- [x] `smooth.spec.ts` (criterion 27a; it opens a browser, and so does any `shot` test, `shot.spec.ts`): a planted test game that draws 20,000 sprites fails and names `drawSprite`;
      the template game passes; a forced software renderer gives "not measured". The pass and fail cases run only
      where there is a graphics chip (Examples' pods, in E4); the software case runs in Framework's CI.
- [x] `play`, `record`, `replay` tests on the template game: a recorded play replays to the same hash (criterion 27).
- [ ] Implement, commit, pull request, lane 2 review.

## P7: The agent kit and the two doors

**Files:** `packages/tools/skills/{make-a-game,add-a-screen,change-the-words}/SKILL.md`,
`packages/tools/src/features/door/pack.ts`, `scripts/transcript-scan.ts`, `fresh-agent/door1a.txt`,
`packages/create-automata/template/` (`AGENTS.md`, `CLAUDE.md`, `.agents/skills/`, `.claude/skills/`,
`.claude/settings.json`, `.opencode/plugin/automata.ts`, `.github/workflows/play-link.yml`, `.gitignore`), tests.

**The door, named.** There is no spike (the Owner cut it on 11-27); this is what is built.

- **Where it runs:** Claude Code inside Claude's desktop app, on the person's own computer. A cloud chat cannot be
  the door in 1a: it cannot make a new repo in the person's GitHub account.
- **The one thing a person installs:** one skill file, `automata.skill`, packed from `packages/tools/skills/` by
  `packages/tools/src/features/door/pack.ts` at the package's build, so it ships inside
  `@automataframework/tools` on npm with each preview and `publish.yml` does not change. A person gets it from one
  download link on automataframework.com: S1's build copies the file out of the pinned npm package and serves it
  at `/automata.skill`. Until S1 lands, the Owner is handed the file. It holds the "make a game" skill and nothing else of ours; that skill runs `npm create
  automata` and from then on the game's own folder carries the rest.
- **What the person's computer needs,** as the spec says of any game: Node, git and a GitHub account. When Node or
  git is missing, the skill says so in one plain sentence with the page to get it from, and waits. It never shows
  a command.
- **How `link` signs in there:** the device flow in P1 (O6): the person sees one code and one address.

- [ ] **First step, before anything is built on it:** prove that Claude Code inside Claude's desktop app picks up a
      skill a person adds there, and write down the exact steps the person takes (they go on the site beside the
      download). The headless run installs the skill the same way a person's copy ends up: unpacked into the empty
      home's `~/.claude/skills/`. If the app gives a person no way to add a skill, that is risk 1's card, at once.
- [ ] **Written first:** `scripts/transcript-scan.ts` with `tests/scripts/transcript-scan.test.ts`. It reads a saved
      chat and fails on anything shown to the person that is a code block, a shell prompt, a stack trace or a file
      path with an extension; on no link at the end; and on a repo made before the public-files sentence. Five
      planted transcripts, one for each, each fail for its own reason, and one clean transcript passes.
- [ ] **A check that runs before the slice end:** `fresh-agent/door1a.txt` holds only what a non-coder would type
      ("make me a game about ..."). P7w adds a `door` input to Framework's `fresh-agent.yml`: one headless Claude
      Code run in an empty home that holds only `automata.skill`, with GitHub answered by a stand-in so nothing is
      published, inside the $2 a run limit and counted in the month (see E5). Its transcript is kept and scanned by
      `transcript-scan.ts`. A session cannot sit in the person's chair, so this proves the words and the order, not
      the real app; the Owner's chat at the slice end is still the check that counts.
- [ ] `link`'s device flow, once O6 is answered (`packages/tools/tests/commands/link-sign-in.test.ts`, against a
      stand-in GitHub): it asks for the scopes `public_repo` and `workflow` and no other; with no sign-in it shows one code and one
      address and nothing else; a refused or timed-out
      code gives one plain sentence; the token is stored through `git credential approve` and never printed.
- [ ] If the scan or the headless run fails, it is a defect to fix here within the three tries, then a card with
      what was seen. Criterion 21 is never weakened.
- [ ] `AGENTS.md`: the games workflow in plain words (short slices, a brief, `npm run check` after every change,
      play it with `npm run play` and `npm run replay` before "done", `npm run smooth` under 30 is not done, show a
      link and a picture, ask plain questions), the public-files sentence before a repo is made, and "never show
      the person a command, code or an error; say what happened in plain words". `CLAUDE.md` is one line pointing
      to it.
- [ ] Skills are written to `.agents/skills/` and copied to `.claude/skills/`; `check` keeps both in step with the
      installed `/tools`.
- [ ] Hooks: Claude Code, a `Stop` hook that runs `npm run check` and sends the plain fixes back; OpenCode, a plugin
      doing the same after a file is written (its plugin API is read from OpenCode's docs at build time, since it
      has changed between versions).
- [ ] `play-link.yml` in the game: on every push, `npm ci`, `npm run check`, build, publish to Pages. It runs the
      same gate as `link`.
- [ ] `.gitignore` covers `.env*`, `*.pem`, `*.key`, `secrets.*`.
- [ ] Tests (criterion 25): `AGENTS.md` is under 24 KiB; a grep over the skills, docs, `AGENTS.md` and the template
      fails on `npx automata`, `npm exec automata` or a line starting with `automata `; the template game is under
      40 lines (criterion 14); the new game's workflow refuses a planted key (criterion 23).
- [ ] The docs page lists the agents tested (Claude Code, OpenCode) and recommends none.
- [ ] Commit, pull request, lane 2 review.

## A1: Art

**Files:** `packages/art/src/features/{make,clean,palette,sidecar}/`, `src/bin.ts`, tests.

**Produces:** `make-art <brief.json>`: sends the brief to fal.ai with `fetch`, cleans the picture with unfake.js,
maps it to the DUEL palette (256 colours, held as a list of hex values in code), and writes the PNG with a sidecar
`<name>.art.json`: `{ prompt, model, seed, madeAt, steps, cost }`. A `review` step sends a picture back to fal.ai's
"reimagine" model and saves the answer beside it.

- [x] **First step, before any other code:** copy unfake.js's file from its GitHub repo at one named commit into
      `packages/art/vendor/unfake/`, with its MIT licence and the commit beside it (no git dependency, so nobody
      who installs `/art` fetches from GitHub, and none of its scripts run). List everything it loads itself; any
      library not on the spec's list is a card before going on. Then run it on one picture inside Playwright's
      Chromium (it is a browser library). If it cannot be made to run in three tries, stop and bring a card.
- [x] Pick the fal.ai models from its list (`https://fal.ai/api/models?keywords=`), one for sprites and one for
      "reimagine", and write both ids and their prices into the pull request and the sidecar.
- [x] Tests: the palette step leaves only DUEL colours (property test over 200 seeded pictures made in code); the
      sidecar is written and complete; a stand-in fal.ai answers in tests, so CI spends nothing. The spend counter
      outlives a session: every call, kept or thrown away, adds a line to a committed ledger
      (`games/art-ledger.json` in Examples), and `make-art` refuses a call when the month's lines reach $50.
- [ ] Commit, pull request, lane 2 review.

---

## E1: The harness and the newcomer check

**Files (Examples):** `harness/{run,cases,pieces,profiles,ready}.ts`, `harness/newcomer.ts`, `package.json`,
`pnpm-workspace.yaml`.

- `profiles.ts`: small phone (375 by 667, touch), tablet (820 by 1180, touch), computer (1440 by 900). `ready.ts`
  waits on `window.__automata.ready`. A case is `{ id, slice, check, run(page | node) }`; later slices only add
  files under `harness/cases/<slice>/`.
- [ ] Bring bun, oxlint and knip at Framework's pins; move the existing tests to `bun:test` by changing imports
      only, and remove `tests/expect.ts`. Every existing test still passes, and one is broken on purpose to show it
      can fail, then put back.
- [ ] **Done check, the first real pod run:** with one case in the harness, a pull request's `gpu` run builds the
      games, hands them to the pod and runs the case green. Its pod minutes and ledger dollars go in the pull
      request, and the sum under "Pod spend" is redone with them. If the month no longer fits, a card.
- [ ] **E1w, after the product pull request (lane 3, the workflow alone):** `newcomer.yml`, by hand and at the slice
      end, runs `harness/newcomer.ts` on a GitHub runner with a token for `newcomer-check` only, minted from
      Examples' App (O7).
- [ ] `newcomer.ts` (criterion 20): in a temp folder outside the repo, `npm create automata@preview`, check, build,
      and `npm run link` into the test repo; then open the link in the phone profile and reach the win screen. With
      no test repo, it stops at the stand-in and says so in its output.
- [ ] Commit, pull request, lane 2 review.

## E2: Small examples

Ten one-file examples, each `examples/<group>/<name>/main.ts` plus its content files, each run by a harness case
that opens it and reads one fact from its state or screen:

`core/open-a-window`, `shapes/draw-shapes`, `input/move-by-touch`, `input/move-by-gamepad`, `input/move-by-keys`,
`audio/play-a-sound`, `text/two-languages`, `shell/splash-and-menu`, `shell/settings`, `shell/saves`.

- [ ] `tools/make-sounds.ts` makes a click, a blip and a short loop as WAV files from code, into
      `examples/audio/content/` under a `CONTENT-LICENSE.md`.
- [ ] `input/move-by-keys` is under 15 lines; `shell/splash-and-menu` is under 40 (criterion 14).
- [ ] Commit in two pull requests (the first four, then the rest), lane 2 review each.

## E3: The 2D sample's first room

**Files:** `games/2d-sample/{src/game.ts,automata.json,content/,messages/,plays/}`.

One room: the hero runs and jumps, collects three stars before a clock runs out. Three stars wins; the clock at zero
loses. Box collisions and the clock are in `game.ts`. Art from `/art`, each with its sidecar. Fusion Pixel Font in
`content/fonts/` with its licence. Two players on one screen with their own keys and pads. The HUD file shows the
star count and the clock.

- [ ] Test first (criterion 17): `update` runs 10,000 ticks in plain Node from a recorded play and ends in the same
      hash 5 times.
- [ ] Record three plays with the tools (a win, a loss, two players) into `plays/`.
- [ ] Run it like a person on three profiles; commit, pull request, lane 2 review.

## E4: The harness's cases

Each row of the criteria map below that says E4 becomes a file under `harness/cases/1a/`. Also:

- [ ] Every way to play (criterion 1): 3 profiles by 3 inputs, each start to end.
- [ ] Frame rate guard (criterion 11): the sample on a pod, CPU slowed 4 times, lowest frame rate over the win
      play, compared with a number kept in `harness/frame-floor.json`; a fall of more than a tenth fails. Its first
      value comes from this unit's own pod run and is committed in the next commit, with the measured commit and
      the pod's graphics chip named in the file.
- [ ] **Measure the pod again, with every case in:** one full run's minutes and dollars from the ledger, then the
      month: spent so far, plus runs left × that cost. Before the ledger reaches $20, a card with those numbers.
- [ ] Loading (criterion 24): slow 4G and CPU slowed 4 times, first screen within 3 seconds, bytes before it under
      1.5 MB.
- [ ] Replays (criterion 27, and the three-browser warning): the plays replay to the same hash in Chromium; WebKit
      and Firefox log and do not block.
- [ ] Accessibility (criterion 29, the program's half): criterion 2's checks on every shell screen and the HUD,
      plus contrast from the drawn page at each contrast level.
- [ ] Upgrades: keep a copy of 1a's sample content files, one save and one play under `harness/fixtures/1a/`. The
      case loads them through `upgrade` and passes today with no step; 1b's first format change must keep it green.
- [ ] Criterion 30: the content-licence and private-name checks from slice 0 each have a planted case.

## E5: The fresh-agent check

The agents run where their keys already are, in Framework's `fresh-agent.yml`, which already takes the prompt file
as an input. Only the smoothness step needs a graphics chip, so it runs in Examples on the built games.

**Pull requests, each just before its user:** E5a (Framework, lane 2: the judge, the month counter, the prompt);
E5w-F (Framework, lane 3: `fresh-agent.yml` alone); then in Examples E5-1 (lane 3: `scripts/gpu/config.ts` lets a
pod also take the job `fresh-agent-smooth`, with its tests loosened), E5-2 (lane 3: `fresh-agent-smooth.yml`
alone), E5-3 (lane 1: its tests).

- [ ] Framework `fresh-agent/slice1a.txt`: the one line a newcomer has (`npm create automata@preview`), then "make a
      small game where the player collects three things to win, with a menu and Spanish". Nothing of ours but what
      `create-automata` writes.
- [ ] Framework `scripts/fresh-agent-judge.ts`, with tests: a run passes its first half when `npm run check` exits 0
      and a play under `plays/` replays to a state with `outcome: 'win'`. It writes seconds, tokens and dollars, and
      builds the game for the smoothness step.
- [ ] E5w-F, `fresh-agent.yml`: the agent's job keeps the game's folder after the existing check that it holds no
      key. **The judge runs in its own job,** from a fresh checkout of `main` and the downloaded folder, with no
      key, so nothing the agent wrote can change the judge. It keeps the built folder, `plays/` and `report.json`
      for 7 days. The agent's step may reach npm to install. A new input, `max-usd`, sets each run's dollar limit,
      $2 at most; the one-at-a-time rule and the OpenRouter ceiling do not change.
- [ ] **The month, counted before every batch (the Owner's cap is $10 a month for each agent):**
      `scripts/fresh-agent-month.ts`, with tests, adds up this month's dollars for each agent from the run
      summaries, P7's door runs and every test run included. A batch of `n` runs starts only with `max-usd` set to
      the smaller of $2 and (10 − spent) ÷ n, so a Claude Code batch cannot pass $10 whatever happens. `max-usd` is Claude Code's
      only: OpenCode has no dollar limit for one run, and its month is held by the OpenRouter key's own credit
      limit ("at most $10 left"), which the counter still adds up. Check that limit is set again each month. The first batch is one
      run on each agent, to measure a whole game's cost. If the limit that leaves is under 1.5 times that measured
      cost, no batch starts: one card, with the numbers.
- [ ] E5-2's first step proves that Examples' own `github.token` can download a public Framework run's artifact. If
      it cannot, one card: Examples' App installed on Framework with actions read, or a token with actions read on
      Framework only. Nothing is built on it before that is known.
- [ ] Examples `harness/fresh-agent-smooth.ts`: the second half, `smooth` on each built game on one pod, in turn.
      The games are agent-made, so the browser's own sandbox is turned on for these runs (`chromiumSandbox: true`),
      and the pod treats each download as data and a page only: `smooth` runs from Examples' own pinned `/tools`,
      never from the agent's `node_modules`, `package.json` scripts or `scripts/`.
- [ ] Run 5 on Claude Code (`claude-sonnet-5-5`) and 5 on OpenCode (`z-ai/glm-5.3`). 4 of 5 on each passes. At 3 or
      fewer, fix the skills (a P7 follow-up pull request) and run again, three tries at most and only while the
      month allows, then a card.
- [ ] The report sets the runs beside the baseline's numbers.

## E6 and S1: The site bundle and the examples page

- [ ] E6: `harness/site-bundle/build.ts` builds each example and the sample into `site-bundle/examples/<name>/`,
      with `source.txt` beside each and one `manifest.json` (`commit`, and for each example `name`, `group`,
      `title`).
- [ ] E6w, after it (lane 3, the workflow alone): `pages.yml` publishes `site-bundle/` to GitHub Pages on a push to
      `main`.
- [ ] S1 (Site repo): the build reads `examples.lock.json` (a commit of Examples), fetches the bundle from Examples'
      Pages and **refuses it when the manifest's `commit` is not the locked one** (Pages serves only its newest
      deploy), then serves it under `/examples/<name>/`, on the approved mockup's examples layout, with the
      waitlist beside it. A slice end moves the lock by one small pull request. No workflow file changes; if one
      must, it goes first as its own lane 3 pull request.
- [ ] Journey (criterion 15), `harness/cases/1a/site-journey.ts` in Examples: against the live site, on three
      profiles, pick each example, see it run and see its source; the 2D sample plays under its code name. A
      session runs it with `pnpm harness --only site-journey` after the Site deploys, and its output goes in the
      slice report. It is not part of the pod run, since it reads a site outside the pull request.

## Z: The slice end (two days)

In the kit's order, then the roadmap's:

- [ ] One rough sketch of how the Screens editor will show a screen: a picture of the sample's main menu file as an
      editable screen, kept in the project's files. Nothing of the editor is built.
- [ ] A fresh session's end-to-end walk of every journey, `docs/superpowers/audits/<date>-1a-e2e-walk.md`.
- [ ] Run the mockup drift check, then two look rounds (Fable 5.2 medium, then Opus 5.5 medium), then the screens
      page for the Owner's first look; one more round on the Owner's notes; the second look. Rounds go on until the
      Owner approves, each extra one logged in the roadmap with its days.
- [ ] The Owner plays the sample on a phone and an iPad with the frame counter on (criteria 11, 18), and types the
      non-coder check (criterion 21). Framework's `scripts/transcript-scan.ts` (built and tested in P7) reads the
      saved chat.
- [ ] A fresh reviewer, then the Owner, read every word and screen for the drunk-grandma test (criterion 29).
- [ ] The design language page for the games' look.
- [ ] The slice report: every criterion with its evidence and commit, the line count of every package against its
      budget, the hours the slice end took, the fresh-agent runs beside the baseline (criterion 28).
- [ ] The website update (S1's lock moves), then one short clip of the sample that points to its page on the site;
      a card shows the Owner the clip and its words, and it is posted only on a yes (criterion 31).
- [ ] The waitlist number, the waiting list with the Owner, the retrospective by a fresh session, one rule-change
      pull request if it asks for one, the roadmap ticked, Notion brought in step.

---

## Every criterion has a check before the build starts

| # | Check | Unit |
|---|---|---|
| 1 | every-way-to-play cases, 3 profiles by 3 inputs | E4 |
| 2 | size, focus ring, label and name on every button | P5, E4 |
| 3 | every word changes; the choice survives a reload | P4, P5 |
| 4 | gain nodes read back; mute at 0 | P3, P5 |
| 5 | remap survives a reload; hold set to tap | P3, P5 |
| 6 | each level changes a measured thing; first run follows the device | P5 |
| 7 | save, reload, Continue; export, import; broken file | P3, P5 |
| 8 | a mistake names the file and the fix; no game starts | P1, P4 |
| 9 | `update` throws; menu, settings, saves still work | P4 |
| 10 | two players, own controls, own marks | P5, E3 |
| 11 | pod guard; the Owner's numbers in the report | E4, Z |
| 12 | the spike's number from the Owner's phone | P2 |
| 13 | `tests/no-content.test.ts` | P1 |
| 14 | line counts: a shell game under 40, move a shape under 15 | P2, P7, E2 |
| 15 | the site's examples journey, run against the live site | E6, S1 |
| 16 | 5 and 5 runs, 4 of 5 | E5 |
| 17 | 10,000 ticks in Node, same hash | E3 |
| 18 | by the Owner | Z |
| 19 | change a screen file in a built game | P4 |
| 20 | `harness/newcomer.ts` | P1, E1 |
| 21 | `scripts/transcript-scan.ts`: planted cases and one headless door run; then the Owner's chat | P7 (scan and headless run), Z (the Owner's chat) |
| 22 | by the Owner, on the screens page | Z |
| 23 | contrast and key cases; `link` and the game's workflow refuse | P1, P6, P7 |
| 24 | loading case | E4 |
| 25 | size test and the grep | P7 |
| 26 | `registry.test.ts` | P6 |
| 27 | plays replay to the same hash | P6, E4 |
| 27a | planted game fails, sample passes, software renderer is "not measured" | P6, E4, E5 |
| 28 | `budgets` job; the report | U1, P1, Z |
| 29 | program half; people half | E4, Z |
| 30 | planted cases | E4 |
| 31 | waitlist beside examples; the clip and its card | S1, Z |

## Risks, most likely first

1. **The non-coder door has never been run,** and it first meets a real person at the slice end. P7's scan and its
   headless run prove the words and the order, not the real app. If Claude's desktop app cannot get a person to a
   link with no command shown, that is a card, with what was seen. The sign-in card (O6) is needed first.
2. **The drawing spike fails on the phone.** P2 holds everything on `/2d` until the number is in, with a named
   redesign and three tries.
3. **The smoothness check needs a graphics chip** and GitHub's runners have none, so its pass and fail cases and the
   fresh-agent check's last step run on Examples' pods. Examples' cap is $25 a month; E1 measures the first real run, E4 measures again, and a
   card goes out before the ledger reaches $20.
4. **unfake.js is not on npm.** A1's first step copies it in at a named commit and proves the in-browser run.
5. **Nine lane 3 pull requests, each with an audit,** is more process than the 12 days were sized for.
6. **$10 a month for each agent may not hold five runs of a whole game,** let alone three tries. E5 measures one run
   first and brings numbers.
7. **12 days is an estimate.** At 24 days the slice is reassessed and cut to its must list: the newcomer's path, the
   shell, the sample, the fresh-agent check. `/art`'s review step and the OpenCode hook go first.

## What this plan does not settle

- The fal.ai model ids (A1 picks them from fal.ai's list and writes them down).
- OpenCode's plugin API (read at build time in P7).
- The two cards: the sign-in app (O6, now) and the test repo with its credential (O7, when E1 starts).
