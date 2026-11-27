# Slice 1a plan audit, round 1

**b8c6b468c85a FAIL: 8 red**

- Plan: `/mnt/project-files/specs/2026-11-27-shell-plan.md`, sha256 `b8c6b468c85a470e3efb41db85930a22b63e7ecad9669215ae864484715a2529`.
- Read against: the spec (`2026-11-27-shell-design.md`), the frozen roadmap (`roadmap/roadmap.md`, door spike cut in
  section 15), the kit rules (`setup/kit-rules/`), and the repos as they are on `main`: Framework `1f0e5bd`,
  Examples `be2e8b1`.
- Written 2026-11-27 08:13 UTC (from `date`), by a fresh audit session. Read-only apart from this file.

## In short

The plan is well put together. Every criterion has a named check, and the units, Owner steps and risks are clear.
It fails on eight things a builder would hit:

1. The non-coder door has no defined thing to build, and P7 cannot run its own check.
2. In Examples, the pod job cannot get the built games, because they are built in a different workflow.
3. U2 is not two pull requests. The repo's own GPU tests and config files force at least four.
4. The $25 pod cap is checked on a run with no harness in it. U2's done check cannot be seen until E1.
5. Three workflows are built days before anything uses them.
6. The fresh-agent retries can break the Owner's $10 a month cap on each agent.
7. Nothing says which browser tests run in which job, so P1's journey would run in `bun test` with no browser.
8. Two cross-repo credentials are needed and not listed, although the plan says no key is asked for after its list.

There are 14 yellows (notes). They do not block, and each is cheap.

## How I checked

- The hash matched before and after reading.
- I read the whole plan, the whole spec, roadmap sections 1, 4, 7 (slices 0 and 1a), 11, 12 and 15, the four kit files,
  and on `main`: Framework's `ci.yml`, `fresh-agent.yml`, `tests/workflows/ci.test.ts`, `.claude/hooks/rules.json`
  and `rules.mjs` (`checkRuleMix`), and `this-repo`; Examples' `scripts/gpu/config.ts`, `gpu.yml` (its triggers and
  jobs), `tests/workflows/gpu-rules.ts`, `.claude/hooks/rules.json`, `this-repo`, `history.md`, `progress.md` and
  `package.json`.
- I ran `npm view unfake.js` (404) and `npm view unfake` ("utilities of hezulong1", a stranger's package). Both match
  the plan.
- I did not read unfake.js's own repo (it is outside this session's GitHub scope), so Y2 says what to check rather than
  what is true.

---

## Red

### R1. The door (P7) has nothing defined to build, and its check cannot run

- **UNIT:** P7, Z, the criteria map row 21.
- **VERDICT:** red.
- **REQUIREMENT:** The spec's "The two doors": the non-coder "install[s] one thing" and gets a link in a chat in
  Claude's app. Kit: "Acceptance criteria come first", and "A check is a test that fails by itself. Write the check
  first". Spec lesson: "Check every acceptance criterion has a test before the build starts." Roadmap section 4: "A
  session cannot sit in that chair."
- **REASON:** P7 never says what the one installed thing is, or which Claude app runtime runs the commands. Its "run
  the door once like a person in a fresh chat" has no way to happen. And criterion 21's scanner is written only at the
  slice end.
- **EVIDENCE:**
  - P7's file list holds only the template and the skills. No row in the units table owns "the one thing a person
    installs", and the plan never names it.
  - The runtime decides whether `link` can work at all. P1's `link` reads a token from `git credential fill` and makes
    a repo. A Claude Code cloud session's GitHub access is a proxy scoped to the repos it was given. This very session
    is told not to use `create_repository`, and to touch no repo outside its list. So in a cloud chat, `link` cannot
    make the new repo.
  - A desktop chat needs Node, git and a git sign-in to GitHub, which is three installs, not one.
  - P7 says "the builder runs the door once like a person, in a fresh chat". The roadmap (section 4, the non-coder
    check) says a session cannot sit in that chair.
  - `harness/transcript-scan.ts` appears only in Z, after the door is built. Row 21 of the map is "Z".
- **EXPECTED:** Before P7 builds anything, the plan names:
  - the installed thing and the file that makes it;
  - the runtime it runs in, and how `link` gets a token that can make a repo there;
  - a check a program can run before the slice end.
- **FIX (plan text only):**
  1. In P7, name the installed thing, its source path and its packaging step. For example, a skill bundle built from
     `packages/tools/skills/`. Also name the runtime, for example Claude Code in Claude's desktop app. Say how `link`
     signs in there, or bring one card if no runtime lets an agent make a repo with nothing extra installed.
  2. Move `harness/transcript-scan.ts`, with planted-transcript tests (a code block, a shell prompt, a stack trace, a
     repo made before the public sentence, and no link at the end), from Z into P7, written first.
  3. Replace "the builder runs the door once in a fresh chat" with a check that can run. For example:
     - a headless `claude -p` run in an empty home, with only the installed thing and the non-coder sentences, through
       Framework's `fresh-agent.yml` (a new prompt file, inside the $2 a run cap);
     - its transcript scanned by `transcript-scan.ts`.

     The Owner's chat at Z stays the check that counts.
  4. Change map row 21 to "P7 (scan and headless run), Z (the Owner's chat)".

### R2. The pod job cannot get the built games: they are built in another workflow

- **UNIT:** U2 (`ci.yml` `games`, `gpu.yml`).
- **VERDICT:** red.
- **REQUIREMENT:** The plan, U2: `games` "uploads the built folders for the pod's job", and "the same pod runs `pnpm
  harness` on the built folders".
- **REASON:** `games` is in `ci.yml` and the pod job is in `gpu.yml`. These are two separate runs with no order
  between them. Also, the repo's own rules for `gpu-smoke` forbid the reads this would need.
- **EVIDENCE:**
  - Examples `gpu.yml` starts on its own `pull_request`, `push` and `merge_group` triggers. Nothing makes it wait for
    `ci.yml`.
  - `tests/workflows/gpu-rules.ts` lets `gpu-smoke` read only `needs.plan.outputs.apply`, `needs.plan.outputs.fork`
    and `needs.pod-start.outputs.label`, and fails on `secrets.` or `vars.`.
  - Getting an artifact from a different run needs its run id and a token.
- **EXPECTED:** The built folders reach the pod inside one run, with no token on the pod.
- **FIX:** In U2, build the games in a new job inside `gpu.yml`, on a GitHub runner, with no secret. `gpu-smoke`
  `needs` it and downloads that same run's artifact. `ci.yml`'s `games` keeps only check and test. Add the new job and
  its artifact to `gpu-rules.ts` (see R3 for the order).

### R3. U2 is not two pull requests: the GPU code and its tests force at least four

- **UNIT:** U2 (focus area 4).
- **VERDICT:** red.
- **REQUIREMENT:** The plan, U2: "two pull requests: U2a the workflows alone, U2b the tests". Kit Splitting: a unit
  names "the files it owns". The rule hook in Examples, `ruleMix`, has `firstTimeSetup: false`, so it is on.
- **REASON:** The harness on the pod needs changes in `scripts/gpu/` and in the existing workflow tests. Neither may
  travel with a workflow change. U2's file list names neither.
- **EVIDENCE:**
  - `scripts/gpu/config.ts`: `ALLOWED_JOB = 'gpu-smoke'` (the only job a pod takes, so `fresh-agent-smooth.yml`'s pod
    job would be refused).
  - The same file: `JOB_LIMIT_MIN = 20` (the pod deletes itself 20 minutes after taking its job) and
    `SWEEP_AGE_MIN = 35`. A full harness (3 profiles by 3 inputs, three-browser replays, loading, pictures) is likely
    to pass the 15-minute `gpu-smoke` timeout.
  - `tests/workflows/gpu-rules.ts` pins `'gpu-smoke': 15` and the outputs `gpu-smoke` may read. So a workflows-only
    U2a fails the tests already on `main`.
  - `ruleMixFiles` in `rules.mjs` refuses `.github/workflows/**` together with any file that is not a doc. That
    includes `scripts/gpu/`.
  - `gpu.yml` runs `scripts/gpu/` from the trusted base. So a script change must be on `main` before the workflow
    that uses it can be tested.
- **EXPECTED:** U2 lists every file it changes and the real order of its pull requests. Each is lane 3 with its own
  implementation audit.
- **FIX:** Rewrite U2 as:
  - U2-1: `scripts/gpu/config.ts` with the new job names and limits, plus `tests/gpu/*` and `tests/workflows/gpu-rules.ts`,
    loosened to accept both the old shape and the new.
  - U2-2: the workflows alone.
  - U2-3: the workflow tests tightened to the new shape.

  Name the exception the plan already has ("U2b goes first") as applying here. Count the extra lane 3 audits in the
  12 days. Check U1 the same way. On `main`, `ci.test.ts` only needs every job in `needs` and `APPLIES`, so U1's two
  pull requests do hold.

### R4. The $25 cap is checked on a run with an empty harness, and U2's done check cannot be seen at U2

- **UNIT:** U2, E1, E4 (focus area 3).
- **VERDICT:** red.
- **REQUIREMENT:** Spec, Budget: "RunPod CI at the cap ... work stops and asks at any cap." Kit: a done check is
  something "a program or a person can observe". Roadmap P15: "set from a measured run".
- **REASON:** U2 cannot run what it says it measures, and nothing measures again when the real harness lands.
- **EVIDENCE:**
  - U2 says "Done when: each job runs green on an empty case list; one run's pod minutes measured". But `harness/` is
    E1's (E1 "Files: `harness/{run,cases,pieces,profiles,ready}.ts`"), and E1 waits on U2. At U2's merge there is no
    harness, so the only pod run is the smoke picture.
  - The "100 runs in 1a" is not worked out from anything. `gpu.yml` starts a pod on every push to a same-repo pull
    request, in the merge queue and on `main`, and the plan has about 10 Examples pull requests, plus fixes,
    fresh-agent-smooth tries and splits up to 3 pods.
  - `config.ts` books $3 an hour for a pod with no price.
  - E4, the unit that adds the heavy cases, has no measuring step.
- **EXPECTED:** The cap projection is made from a run that holds the real harness, and made again when the harness
  grows.
- **FIX:**
  - Move "runs green on its case list, pod minutes measured" to E1's done check, since E1 is the first pull request
    that turns the jobs on, with one case.
  - Add to E4: "measure one full run's pod minutes and dollars from the ledger. Project the month as runs so far ×
    cost per run, plus the runs left in the plan. Bring a card before the ledger reaches $20, not at $25." When the
    cap is hit, `gpu` turns red and every Examples merge stops.
  - Write the runs-per-month sum out in the plan.

### R5. Three workflows are built days before anything uses them

- **UNIT:** U2 (`pages.yml`, `fresh-agent-smooth.yml`, `newcomer.yml`), U1 (the judge step).
- **VERDICT:** red.
- **REQUIREMENT:** Never bend: "Build nothing ahead of its user; 'it would be useful later' is not a reason." The
  coordinator's brief: "nothing should be built ahead of its user".
- **REASON:** Each of these workflows runs a file that a later unit writes. Each lands on `main` untested, and it is
  lane 3 to change when its user arrives.
- **EVIDENCE:**
  - `pages.yml` publishes `site-bundle/`, which is E6's.
  - `fresh-agent-smooth.yml` runs `harness/fresh-agent-smooth.ts`, which is E5's.
  - `newcomer.yml` runs `harness/newcomer.ts`, which is E1's.
  - U1's judge step runs `scripts/fresh-agent-judge.ts`, which is E5's.
  - U2 starts after slice 0, and E5 and E6 come near the end of the slice.
- **EXPECTED:** Each workflow lands just before the unit that uses it, as its own workflows-only pull request.
- **FIX:** Move `newcomer.yml` to an E1 workflows pull request, `fresh-agent-smooth.yml` and U1's judge step to an E5
  workflows pull request, and `pages.yml` to an E6 workflows pull request. Each is lane 3 with its own audit, under
  the split in R3. U1 and U2 keep only `browser`, `budgets`, `games` and the pod harness step.

### R6. The fresh-agent retries can break the Owner's $10 a month cap on each agent

- **UNIT:** E5, the "Things I checked" table.
- **VERDICT:** red.
- **REQUIREMENT:** Roadmap section 11, approved by the Owner: Claude Code "$2 a run, $10 a month", and the second agent
  "$2 a run, $10 a month". Spec, Budget: "work stops and asks at any cap".
- **REASON:** The plan cites only the per-run cap ("ten runs cost $20 at the very most"). E5 allows three tries of 5
  runs on each agent.
- **EVIDENCE:**
  - 5 Claude runs at the $2 limit are $10, the whole month, on the first try.
  - Three tries are up to $30 on each agent.
  - `fresh-agent.yml` enforces only `--max-budget-usd 2` a run for Claude. Nothing counts its month. OpenRouter's key
    limit only stops OpenCode.
  - The test runs while U1 and E5 are built spend from the same month.
- **EXPECTED:** The plan counts each agent's month and stops before a run could cross $10.
- **FIX:** In E5:
  - Before each batch, add up the month's dollars from the `fresh-agent` run summaries.
  - Start a batch only when spent + runs × $2 ≤ $10.
  - Otherwise bring one card with the numbers measured so far.

  In the "Things I checked" table, write both caps.

### R7. Nothing says which tests run in a browser, so P1's journey would run in `bun test`

- **UNIT:** U1, P1, P2, P3, P4, P5.
- **VERDICT:** red.
- **REQUIREMENT:** The plan, U1: `browser` "runs `pnpm test:browser`", and `plan` turns it on when
  `playwright.config.ts` exists. Kit: "the suite exits 0".
- **REASON:** No unit defines `test:browser`, names the runner or says how files are split. Several browser tests end
  in `.test.ts`, which `bun test` picks up in the `test` job, where there is no browser.
- **EVIDENCE:**
  - P1: `packages/tools/tests/journeys/newcomer.test.ts`, which serves `dist/` and taps "in the small-phone profile".
  - P2: `sprites.test.ts` "in the browser job".
  - P3: `input.test.ts` and `audio.test.ts` "(browser job)".
  - P4 and P5 use `*.spec.ts`.
  - Framework's `test` job runs `pnpm test` on `ubuntu-latest`, outside the Playwright image.
- **EXPECTED:** One rule decides which runner each test file uses, and both jobs follow it.
- **FIX:** In the Global constraints, say:
  - browser tests are `*.spec.ts`, run by `@playwright/test` from `playwright.config.ts`, through `pnpm test:browser`
    (which P1 adds with its first browser test);
  - `bunfig.toml` keeps `bun test` to `*.test.ts`.

  Rename P1's, P2's and P3's browser tests to `.spec.ts`. Say whether `@playwright/test` is covered by "Playwright"
  in the spec's stack. I read it as covered.

### R8. Two cross-repo credentials are needed and not listed

- **UNIT:** U2 / E5 (`fresh-agent-smooth.yml`), E1 (`newcomer.yml`), the Owner steps.
- **VERDICT:** red.
- **REQUIREMENT:** The plan: "No key is asked for after this list." Kit, Three yeses: a credential is asked for by
  name.
- **REASON:**
  - Examples' `fresh-agent-smooth.yml` downloads artifacts of a Framework run.
  - `newcomer.yml` makes and pushes a repo in `AutomataFramework/newcomer-check`.
  - Neither has a named credential. Examples' App is "installed on this repo only" (Examples `this-repo`), and a
    workflow's own token is scoped to its own repo.
- **EVIDENCE:** Examples `this-repo`: "`EXAMPLES_CI_APP_KEY` (administration and variables write, installed on this
  repo only)". U2 and E1 name no token for either step.
- **EXPECTED:** Each cross-repo step names its credential and its scope, or a route that needs none.
- **FIX:**
  - **fresh-agent-smooth:** U2a's first step proves that Examples' own `github.token` can download a public
    Framework run's artifact. If it cannot, bring one card: install Examples' App on Framework with `actions: read`,
    or a fine-grained token with actions read on Framework only.
  - **newcomer:** the E1 card for `newcomer-check` also asks for its credential (Examples' App installed on that repo
    with contents, pages and administration write). Add it to the Owner steps list.

---

## Yellow (notes, not blocking)

- **Y1. Where the $25 cap comes from.**
  - $25 is a session's split of the Owner's $50 standing permission (Examples `history.md`: "the Owner's $50 slice 0
    cap, split"; Standing permissions: "within the $50 a month cap until slice 0's cost card sets it").
  - Slice 0's RunPod cost card was never asked. Roadmap section 11 still says $50, and no measured GPU run cost is in
    `history.md`.
  - The plan should say "$25, the split of the $50 standing cap". The coordinator should know that slice 0's
    "measured cost of one GPU run written in section 11" done check is still open.
- **Y2. unfake.js from GitHub (focus area 2).** The first step is right. Three things to add:
  1. A git dependency inside a published package (`@automataframework/art`) makes every user of `/art` fetch from
     GitHub at install time. Prefer copying the pinned MIT file, with its licence and commit, into
     `packages/art/vendor/`. If it stays a git dependency, keep it out of `onlyBuiltDependencies`, so pnpm runs none of
     its scripts.
  2. unfake.js's own dependencies (for example, any OpenCV.js build) count against "the spec's list and no more". The
     first step lists them, and any not on the list is a card.
  3. Running it "inside Playwright's Chromium" makes Playwright a runtime dependency of `/art` (see Y3).
- **Y3. Runtime dependencies not on the spec's list.**
  - `/tools` (`shot` and `smooth`, "installs Playwright's Chromium once") and `/art` need `playwright-core` at run
    time, in packages every new game installs.
  - `.svelte` files are not checked by `bun check`. They need `svelte-check`, which is not on the list. The old
    Framework needed it too.
  - Say that both are inside "Playwright" and "Svelte" in the spec's stack, or put them on one card.
- **Y4. O1's dist-tag step cannot work as written.** npm gives a first version `latest` (Framework `this-repo` says so),
  and `latest` cannot be removed or pointed elsewhere while it is the only version. Publish a real `0.0.1` placeholder
  that says "not ready yet", as `create-automata` did, and drop the "so `latest` does not point at an empty package"
  clause.
- **Y5. Examples units that are missing a wait.** E2 ("each run by a harness case") and E3 (bun tests, the root
  `package.json`) read E1's output and touch E1's files. E2, E3 and E6 must wait on E1, and so on O1. The "side by
  side: P5 with E2" line changes to match.
- **Y6. Trust of agent-made output.**
  - The judge (`fresh-agent-judge.ts`) runs in the same job the agent ran in, with every permission, so the agent
    could have changed `repo/scripts/`. Run the judge in its own job, from a fresh checkout and the downloaded kept
    folder.
  - Playwright's `chromiumSandbox` defaults to off. Agent-made games opened on a pod run with no browser sandbox.
    Turn it on for those runs (`--user 1001` allows it with the image's seccomp profile), or say why it is accepted.
- **Y7. P2's "throwaway link" has no host.** Examples' Pages (O3) is too late, and `newcomer-check` waits on a card.
  Name one, for example a `wrangler pages deploy` to a named Cloudflare Pages project on the account already in use.
- **Y8. S1 cannot fetch "that bundle" for a locked commit from Pages,** which serves only its latest deploy. Either S1
  builds the bundle from Examples at the locked commit, or E6's manifest carries the commit and S1 refuses one that
  does not match its lock.
- **Y9. Criterion 19 against built-in words.** Words are compiled at build ("Words are the one thing that needs a
  build"). Say that message files are not the content files criterion 19 means, and make P4's built-game test also
  change a file that is not words, such as the HUD or a game content value.
- **Y10. S1's journey (criterion 15) has no named runner.** Does it run in the Site's CI (which needs a browser image,
  and so a lane 3 workflow change) or as an Examples harness case against the live site? Name one.
- **Y11. The split's stated reason is wrong for Framework.** Framework's `rules.json` has `ruleMix.firstTimeSetup:
  true`, so `checkRuleMix` returns early and the hook refuses nothing there yet. The split is still right, by
  CLAUDE.md ("A change does not quietly edit its own check"). Cite that instead of the hook.
- **Y12. U1's checks need clearer wording.**
  - U1's done check "one with a failing browser test fails" needs a planted failing test on a throwaway branch,
    closed after. Say so.
  - U1b's "both pinned to commit hashes" should say "every action in both pinned to a commit", since jobs are not
    pinned.
  - U1 runs Framework's browser tests in 1 piece, against Settings' "Browser test pieces in CI: 6". If that is a
    departure, tell the Owner (the "tell me when you break the rules" rule).
- **Y13. E4's `harness/frame-floor.json`** needs a first value: say which commit's pod run sets it and that it is
  committed with that commit named.
- **Y14. A1's "$50 a month" spend counter** needs somewhere that outlives a session, such as a committed ledger or
  fal.ai's own usage read. A local file resets in each fresh container.

## What passed

- **Every criterion, 1 to 31 and 27a, has a named check and a unit.** The only problem is when 21's check is written
  (R1).
- **The newcomer's path is first, then the spike**, as the spec and the roadmap order it. P2 holds `/2d` until the
  Owner's phone number is in.
- **Owner steps are one list**, run through the Owner's Mac session. The test-repo card is asked when it is needed,
  not before.
- **No fork code reaches a pod.** The `gpu.yml` trust model is kept: base scripts, no secret on the pod, and the
  software-renderer guard.
- **Lanes are right.** U1 and U2 are lane 3, the product units are lane 2 and U0 is lane 1. Three writers at most.
  The hard units are marked with reasons.
- **The door spike stays cut.** P7 does not bring it back. R1 asks for a check, not a spike.
- **The facts I re-checked hold:** unfake.js is not on npm, `ci.test.ts` on `main` only asks that `gate` knows every
  job, and Framework's head is `1f0e5bd` and Examples' is `be2e8b1`.

---

# Round 2 (the last round the kit allows)

**f9b41c60a0e4 PASS: 0 red, 9 yellow**

- Plan: `/mnt/project-files/specs/2026-11-27-shell-plan.md`, sha256 `f9b41c60a0e420e4fa5b45d4e7e1ee2d43c1273e30c8f21d65ec7db9e7f64b6b`
  (matched before and after reading).
- Read against the same spec, roadmap and kit files as round 1, and `main` as it is now: Framework `1f0e5bd`,
  Examples `be2e8b1` (unchanged since round 1). Re-read on `main`: Examples `scripts/gpu/config.ts` and
  `.claude/hooks/rules.json` (`ruleMix`), Framework `.github/workflows/fresh-agent.yml`.
- Written 2026-11-27 08:21 UTC (from `date`), by a fresh audit session. Read-only apart from this file.
- O6 (the GitHub sign-in app) is with the Owner as a card and is treated as pending, not as a defect.

## In short

All eight reds are fixed in the text, and all fourteen yellows are answered. The fixes bring no new red. Nine new
yellows are listed below; each is a line or two of plan text or a first step for the builder, and none blocks the
build from starting. The builder of each named unit carries its yellow.

## Round 1 reds

| # | Fixed? | Evidence in the plan |
|---|---|---|
| R1 door | yes | P7 "The door, named": Claude Code in Claude's desktop app; `automata.skill` packed by `door/pack.ts`; `link` signs in by the device flow (O6, pending). `scripts/transcript-scan.ts` is written first in P7 with five planted transcripts and one clean one. The "fresh chat" step is replaced by a headless run through P7w's `door` input, inside $2 a run and counted in the month. Map row 21 reads "P7 (scan and headless run), Z (the Owner's chat)". See new Y-A and Y-B. |
| R2 built games | yes | U2-2: `build-games` inside `gpu.yml` on a GitHub runner, no secret; `gpu-smoke` `needs` it and downloads that same run's artifact. `ci.yml`'s `games` only checks and tests. |
| R3 U2 split | yes | U2 is U2-1 (`config.ts`, `tests/gpu/`, `gpu-rules.ts` loosened; lane 3), U2-2 (workflows alone; lane 3), U2-3 (tests tightened; lane 1). I checked `ruleMix` on Examples `main`: `rulePaths` holds `.github/workflows/**` and not `scripts/gpu/`, so U2-1 is allowed and U2-2 must be alone, as planned. `JOB_LIMIT_MIN 20` and `SWEEP_AGE_MIN 35` are raised together in U2-1. Nine lane 3 pull requests are counted, with the time risk stated (risk 5). |
| R4 pod cap | yes | E1's done check is the first real pod run with minutes and dollars; E4 measures again with every case and brings a card before $20. The runs sum is written out: 14 × 6 + 20 + 3 = 107 runs, 107 × $0.15 ≈ $16, and $53 at the $3 fallback booking. I re-did the sums; they hold. See new Y-C (one stale line). |
| R5 workflows ahead of users | yes | `newcomer.yml` in E1w, the fresh-agent changes in P7w and E5w-F, `fresh-agent-smooth.yml` in E5-2, `pages.yml` in E6w. U1 and U2 hold only `browser`, `budgets`, `games`, the build job and the harness step, each left out by `plan` until its first file exists. See new Y-D. |
| R6 $10 a month | yes | `scripts/fresh-agent-month.ts` adds the month before every batch, door runs and test runs included; `max-usd` = min($2, (10 − spent) ÷ n); one measuring run first; a card if the limit left is under 1.5 × the measured cost. See new Y-E (OpenCode). |
| R7 runner split | yes | Global constraints: `*.test.ts` in `bun test` (`bunfig.toml`), `*.spec.ts` in `@playwright/test` through `pnpm test:browser`, added by P1. P1, P2 and P3's browser tests are renamed `.spec.ts`. See new Y-F (one test missed). |
| R8 cross-repo credentials | yes | E5-2's first step proves `github.token` can read a public Framework run's artifact, else one card, and nothing is built on it before. O7 now carries its credential (Examples' App on `newcomer-check`, contents, pages and administration write). |

## Round 1 yellows

All answered: Y1 ($25 named as the split of the $50 standing cap, "Things I checked" row), Y2 (vendored copy with
licence and commit, its own loads listed, a card for anything off the list), Y3 (see the readings below), Y4 (O1
publishes real `0.0.1` placeholders), Y5 (E2, E3, E6 wait on E1; "none starts before E1 has merged"), Y6 (judge in its
own job from a fresh checkout; `chromiumSandbox: true` for agent-made games), Y7 (`wrangler pages deploy` to
`automata-spike`, deleted after), Y8 (S1 refuses a manifest whose `commit` is not the lock), Y9 (criterion 19 changes
screen, HUD and flow files; message files are named as outside it), Y10 (S1's journey is an Examples harness case run
by a session against the live site), Y11 (the split cites `CLAUDE.md`), Y12 (throwaway branch, "every action", one
piece read as inside Settings' "up to 6"), Y13 (`frame-floor.json`'s first value from E4's pod run, with the commit
and chip in the file), Y14 (a committed ledger, `games/art-ledger.json`).

## The planner's two readings

**Confirmed, both.**

- **`playwright-core` inside "Playwright".** It is the library half of Playwright itself: same project, same
  version, and `@playwright/test` depends on it, so it is in the lockfile either way. The spec asks the shipped tools
  for a screenshot and for a smoothness check that "plays the game in the floor phone's browser profile with the CPU
  slowed 4 times" (spec, "A smoothness check"). That needs a browser driver, and Playwright is the only one the spec
  names. One thing for the Owner to know, since it moves Playwright from the CI toolchain into what users install:
  `/tools` and `/art` will list `playwright-core` (a few MB, no browser) in every new game's install. The coordinator
  should say so in one line in the next update, as a reading, not a card. Also see Y-G.
- **`svelte-check` inside "Svelte".** It is Svelte's own type checker, a dev tool only, never shipped to a game. The
  spec asks for Svelte 5 with TypeScript strict and a typecheck that passes; `bun check` does not read `.svelte`
  files, so without it the typecheck line cannot be met for `/shell`. The same reading covers
  `@sveltejs/vite-plugin-svelte`, which the plan already names.

## New yellows (notes, not blocking)

- **Y-A. Prove how `automata.skill` is installed and where a person gets it (P7, first step).**
  - The plan says the file is "published with each preview" and also that nothing touches `publish.yml`. It does not
    say where a non-coder downloads it: an npm tarball is not something they can open. Name the place (for example,
    inside `@automataframework/tools` on npm, linked as a download from the site), with no `publish.yml` change.
  - Before building on it, P7's first step proves that Claude Code inside Claude's desktop app picks up a skill the
    person adds there. The headless run must install the skill the same way (for example, unpacked into the empty
    home's `~/.claude/skills/`), and P7 writes down that step. If the app gives no route, that is risk 1's card, early.
- **Y-B. O6's app type decides whether `link` can push (for the session that makes the app, and P7's tests).**
  `link` pushes the template's `.github/workflows/play-link.yml`. GitHub refuses a push that adds a workflow file
  unless the token has the `workflow` scope (OAuth app) or Workflows write (GitHub App). A GitHub App's user token also
  reaches only repos the app is installed on, so a new repo would need the person to install the app on their whole
  account first: a second step for them. Recommend an OAuth app with the device flow and the scopes `public_repo` and
  `workflow`. P7's `link-sign-in.test.ts` asserts the scopes it asks for.
- **Y-C. Risk 3 is stale.** It still says "U2 measures a run and brings a card if 1a will not fit". Since R4's fix,
  that is E1 (first measure) and E4 (measure again, card before $20). Change the line to match.
- **Y-D. E1w also waits on O7.** `newcomer.yml` runs with a token minted from Examples' App on `newcomer-check`.
  Before O7 is answered there is no repo and no token, so E1w would land a workflow that cannot run: a workflow ahead
  of its user. Add O7 to E1w's "waits on"; until then `newcomer.ts` runs against the stand-in from a session, as E1
  already says.
- **Y-E. `max-usd` cannot limit an OpenCode run.** On Framework `main`, `fresh-agent.yml` stops Claude with
  `--max-budget-usd`, and OpenCode only through the OpenRouter key's credit limit ("at most $10 left", the
  `OPENROUTER_CEILING` check); OpenCode has no per-run dollar flag. E5's "a batch cannot pass $10 whatever happens" is
  true for OpenCode only through that key limit. Say so in E5: `max-usd` is Claude's; OpenCode's month is held by the
  key's limit, which `fresh-agent-month.ts` still counts. Check the key's limit resets monthly, or that "$10 left" is
  set again by hand each month.
- **Y-F. `smooth.test.ts` breaks the plan's own runner rule (P6).** Its cases open the game in Chromium, so by the
  Global constraints it is a browser test and must be `smooth.spec.ts`. As named, it runs in `bun test` on
  `ubuntu-latest` with no browser, where `smooth` would try to install Chromium in the test job. Rename it, and run
  the software-renderer case in the `browser` job. The same holds for any `shot` test.
- **Y-G. Say how `playwright-core` reaches a game (P6, A1).** The Global constraints say `/tools` and `/art` "load"
  it "when one of those commands first runs". Either it is a normal dependency (installed with every game, with the
  browser fetched on first use), or it is installed at first run (an `npm install` the tool runs for the person).
  Name which. The first is simpler and is what the confirmation above assumes.
- **Y-H. Run `smooth` from Examples' own install, never from the agent's folder (E5).** The pod should run only the
  downloaded `dist/` and `plays/` as data and page. `harness/fresh-agent-smooth.ts` calls Examples' pinned `/tools`;
  it never runs the agent's `node_modules`, `package.json` scripts or `scripts/` on the pod. Say so beside the
  sandbox line.
- **Y-I. P7 changes P1's files without owning them.** The device flow edits `packages/tools/src/features/github/` and
  `commands/link.ts`, which P1 owns and P7's "Owns" cell does not list. Add them, so the file list matches the diff.

## What passed this round

- Every criterion, 1 to 31 and 27a, still has a named check and unit; row 21 now has a check that runs before the
  slice end.
- The lane 3 count (nine) matches the units table, and each workflow pull request is alone, as Examples' `ruleMix`
  requires.
- The pod spend sum is written out and its arithmetic holds. The $20 card leaves room before `gpu` turns red.
- No fork code reaches a pod; agent-made games open on a pod only as built pages, with the browser sandbox on.
- The door spike stays cut. P7 builds the door and checks it with a program; it does not bring back a spike.
