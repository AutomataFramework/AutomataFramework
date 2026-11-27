# Preview publish fix plan audit, round 1

**7e8d2ca FAIL: 4 red**

- Spec: `docs/superpowers/specs/2026-11-27-preview-publish-fix-design.md` at `7e8d2ca` (draft PR #13, branch
  `claude/project-thread-5l49kj`).
- Read against: R1 of the PR #2 catch-up audit (`fa9bdf0 FAIL: 2 red`), the flaky entry in `history.md`, `CLAUDE.md`,
  the `review`, `staged-path`, `release` and `this-repo` skills, the rule hooks (`.claude/hooks/rules.mjs`), and the
  code on the branch: `scripts/publish-preview.ts`, `.github/workflows/publish.yml`, `.github/workflows/ci.yml`,
  `tests/workflows/ci.test.ts`, every `packages/*/package.json`, `packages/create-automata/src/` and its template.
- Written 2026-11-27 13:44 UTC (from `date`), by a fresh audit session. Read-only apart from this file.

## In short

The diagnosis is right and measured: nothing builds, `workspace:*` would ship as written, packages go out in name
order, and the read-back hangs on npm's serving delay. Criteria 1 to 3 and 6 fix those cleanly. It fails on four
things a builder would hit:

1. The three pull requests cannot run in the order written: U1 waits on an audit that reads U2, and U2 waits on U1
   merging, on one branch.
2. `create-automata` depends on `core`, `2d` and `tools` at its own version through its template, which no criterion
   sees, so a "green" run can still ship a `create-automata` whose games cannot install.
3. The test that packs the real `packages/` "after `pnpm build`" has no build in CI's `test` job, and the plan does not
   say who builds.
4. A re-run while npm is still slow (the exact case the fix is for) publishes again and goes red on "cannot publish
   over".

## Red

### R1. The units cannot run in the order written

- UNIT: the Units section and table.
- VERDICT: red.
- REQUIREMENT: `staged-path` (one implementation audit reads the branch before it merges); `CLAUDE.md` Verification
  and the `ruleMix` hook (a workflow never shares a pull request with code or tests).
- REASON: U2 "waits on U1 merged", yet "U1 also merges only after" the implementation audit that "reads both". On one
  branch both cannot hold.
- EVIDENCE: the table row `U2 workflow | 3 | ... | U1 merged`; the paragraph "the one implementation audit reads both
  before U2 merges, and U1 also merges only after it". GitHub allows one open pull request per head branch, so U2
  cannot be a pull request while U1's is open on `claude/project-thread-5l49kj`; and pushing U2's `publish.yml` to that
  branch while U1 is unmerged is refused by `checkRuleMix` in `.claude/hooks/rules.mjs` (it diffs
  `origin/main...<branch>`, which would hold `scripts/` and `tests/` with `.github/workflows/`). The spec PR #13 is
  also open on this same branch, so U1's commits would land in #13 unless #13 merges first, which the spec does not say.
- EXPECTED: a sequence a builder can follow without breaking a rule or a hook.
- FIX: spec only. Say: PR #13 merges first. U1 on this branch (restarted from `main`). U2 on its own branch made from
  U1's head commit (for example `claude/preview-publish-workflow`), pushed but with its pull request opened only once U1
  merges (then `main` merged in, so its diff is the workflow alone). The one implementation audit names U1's head and
  U2's head commits and reads both. U1 merges, then U2 straight after, so the window in which `publish` is red (Units,
  last paragraph) is minutes. U3 follows U2. Branch count stays within 5.

### R2. `create-automata`'s template dependency is invisible to the order, the left-out rule and the live proof

- UNIT: criteria 4 and 8.
- VERDICT: red.
- REQUIREMENT: the spec's own Outcome ("Every preview on npm holds its built files ... workspace ranges are real
  preview versions of packages published in the same run") and the bug it fixes (`npm create automata@preview` does
  not work).
- REASON: a `create-automata` preview makes a game whose `package.json` asks for `@automataframework/2d`, `core` and
  `tools` at exactly `create-automata`'s own version, but those are not in its `package.json` dependencies, so
  criterion 4 never orders or leaves it out by them and criterion 3 never sees them.
- EVIDENCE: `packages/create-automata/src/bin.ts:14-15` passes its own `version` to `create`;
  `packages/create-automata/src/index.ts:29` fills `__VERSION__`; `packages/create-automata/template/package.json` has
  `"@automataframework/2d": "__VERSION__"` and the same for `core` and `tools`. `create-automata` has no
  `dependencies`, so it sorts first and is published even when `core`, `2d` and `tools` are left out (not on npm,
  today's state until the owner's first publish lands) or when one of them fails mid-run. Criterion 8 checks only that
  the tarball lists `dist/bin.js`.
- EXPECTED: a `create-automata` preview is published only in a run that also published (or already lists) `core`,
  `2d` and `tools` at the same preview version, after them; the live proof makes a game from the preview and installs
  it.
- FIX: spec only. Criterion 4: the template's `@automataframework/*` dependencies count as `create-automata`'s
  workspace dependencies for order and leaving out (read from `template/package.json`, so a new template dependency is
  covered by itself); add a test for it to criterion 7. Criterion 8: add `npm create automata@preview <dir>` then
  `npm install` in it succeeds (run once the three packages are on npm).

### R3. Criterion 7's real-pack test has no build in CI, and nothing says who builds

- UNIT: criterion 7 (the test that packs the real `packages/`), U1's files.
- VERDICT: red.
- REQUIREMENT: `CLAUDE.md` "A check is a test that fails by itself"; the plan's file list per unit.
- REASON: CI's `test` job runs `pnpm install --frozen-lockfile` then `pnpm test`, no `pnpm build`, so `dist/` does not
  exist there and the "passes the check" half fails in CI unless the test builds; and a test that deletes the real
  `dist/` for its "fails" half can break other test files reading it.
- EVIDENCE: `.github/workflows/ci.yml`, job `test`: steps `pnpm install --frozen-lockfile`, `pnpm test`; `build` is a
  separate job. U1's files are only `scripts/publish-preview.ts` and its test; `ci.yml` is not in the plan (and could
  not be, by R1's rule).
- EXPECTED: the spec says the test runs `pnpm build` itself (it has pnpm: the `test` job sets it up) and packs into a
  temporary folder, and the "`dist/` removed" case works on a temporary copy of one package, never on the real
  `packages/*/dist`.
- FIX: spec only, criterion 7's sentence.

### R4. A re-run while npm is still slow publishes again and goes red

- UNIT: criterion 5.
- VERDICT: red.
- REQUIREMENT: the Outcome ("a run that npm is slow to serve can be re-run to green without publishing twice").
- REASON: criterion 5 decides "already published" from npm's listing, the very listing that lagged. A re-run made
  while npm still does not list the version calls `npm publish` again, npm refuses ("cannot publish over the previously
  published versions"), and the run is red again.
- EVIDENCE: `history.md` Flaky tests: at `f55432a` npm took the upload and still did not serve it after five minutes;
  the spec's own note that the version document answers `cache-control: max-age=300`. Criterion 6 tells the person to
  re-run on timeout, which is when this is most likely.
- EXPECTED: npm's "cannot publish over" answer for the exact version being published counts as "already published":
  the run logs it and goes to the read-back. Any other publish error stays red.
- FIX: spec only, criterion 5, plus one test in criterion 7 (a publish that answers "cannot publish over" goes to the
  read-back and publishes nothing else for that package).

## Notes (not blocking)

- N1. Three implementation pull requests depart from `staged-path` ("Execution, the implementation audit and the fixes
  share one branch and one pull request"). The reason is sound (the `ruleMix` hook), but it is a departure from the
  kit, and the owner asked to be told of each one.
- N2. `pnpm install` runs in a job with `id-token: write`, so any install script could ask for the publish token.
  pnpm 10 runs no dependency build scripts unless allowed, and `pnpm-workspace.yaml` allows none; U2 could keep it so
  with `--ignore-scripts` on the install, or build in a job without `id-token` and hand over `dist/`. Recorded only.
- N3. `npm publish <tarball> --provenance` is not covered by any test. Criterion 8 could add that the new preview shows
  a provenance attestation (`npm view create-automata@preview dist.attestations`).
- N4. `publish.yml`'s header says "Re-running a finished publish reuses its run number and fails on 'cannot publish
  over', which is safe." Criterion 5 makes that line wrong; U2 should rewrite it with the `this-repo` line.
- N5. Between U1 and U2 merging, the spec says the run fails before any upload. That holds because criterion 3 runs
  before every upload (and `pnpm` may not be on the runner's path). Other slice 1a merges in that window get no
  preview; R1's fix keeps the window short.
- N6. "About 2 hours" for three serial pull requests, two lane 3 audits and two live runs is tight; the overrun rule
  applies at 4 hours.

# Round 2 (final)

**36b0ab9 FAIL: 2 red**

- Spec: `docs/superpowers/specs/2026-11-27-preview-publish-fix-design.md` at `36b0ab9`, read whole, plus the diff
  `7e8d2ca..36b0ab9`. Read against the same sources as round 1, plus what npm and GitHub show now: the registry
  documents of all four packages, and `publish` run 46010157332 on `main` at `13eebff` (PR #12's merge).
- Written 2026-11-27 13:58 UTC (from `date`), by a fresh audit session. Read-only apart from this file.

## In short

All four round 1 reds are fixed. Two new reds come from what happened on npm while the plan was being written: the
owner's first publish of `core`, `2d` and `tools` landed at 13:39 to 13:41 UTC, so the bug the spec says comes "next"
is live now, and the first real four-package run shows the read-back budget in criterion 6 is too small.

## Round 1 reds

| Red | Fixed? | Where |
|---|---|---|
| R1 order deadlock | Yes. Three pull requests one after another on the one branch, each restarted from `main` after the one before merges, each lane 3 one with its own implementation audit of its own head. No audit reads a commit that cannot be a pull request, and a merged branch restarts by fast-forward, so no force-push. | Units, table and paragraphs 1 to 2 |
| R2 template dependencies | Yes. Criterion 4 reads `template/package.json` for order and leaving out, and fails on a base-version mismatch; criterion 7 tests both; criterion 8 makes a game from the preview and installs it. | Criteria 4, 7, 8 |
| R3 no build in CI's `test` job | Yes. The test runs `pnpm build` itself, packs into a temporary folder, and removes `dist/` only in a temporary copy. | Criterion 7 |
| R4 re-run while npm lags | Yes. "cannot publish over" for the exact version counts as published and goes to the read-back; any other error stays red; tested. | Criteria 5, 7 |

Round 1 notes N2 to N5 are taken in (U2's `--ignore-scripts`, no cache, header rewrite; criterion 8's attestation
check; the U1 to U2 window named). N1 (the departure from one pull request) is said in the spec to be told to the
owner. N6: the estimate is now 3 hours.

## Red

### R5. Every merge before U2 now ships broken previews of all four packages, and the plan does nothing about it

- UNIT: "The problem, measured", second bullet; the Units order (PR #13 merges first).
- VERDICT: red.
- REQUIREMENT: `CLAUDE.md` Report honestly (measured, never stale); the spec's Outcome ("Every preview on npm holds
  its built files ... workspace ranges are real preview versions").
- REASON: the spec says `2d` and `tools` "are left out (not on npm)" and that "the next merge would publish them with
  a range no one can install". That merge has happened. Until U2 lands, every merge to `main`, PR #13's own included,
  publishes all four packages with no `dist/` and with `workspace:*`, and moves `preview` to them.
- EVIDENCE: npm lists `@automataframework/core`, `2d` and `tools` `0.0.1` (published 13:39:27, 13:40:17, 13:40:59
  UTC). Run 46010157332 at `13eebff` published `2d`, `core`, `tools` and `create-automata` `0.0.1-preview.10.sha-13eebff`;
  `2d@0.0.1-preview.10.sha-13eebff` has `dependencies: {"@automataframework/core":"workspace:*"}` and `dist.fileCount`
  1 (only `package.json`). `core@0.0.1-preview.8` and `.9` also hold one file. A docs-only merge passes `ci`, so
  `publish` runs on it too.
- EXPECTED: no broken preview is published between now and U2's merge, and the spec's measurements are today's.
- FIX: spec only. Update the second bullet of "The problem, measured" with the facts above. Add a step before PR #13
  merges: stop `publish` with `gh workflow disable publish.yml -R AutomataFramework/AutomataFramework`, and turn it
  back on with `gh workflow enable` once U1 has merged (from then on a run fails before any upload, as the Units section
  says), so U2's merge publishes. Add `0.0.1-preview.8` onward to the previews named under Boundaries for the owner's
  possible `npm deprecate`. Both commands are reversible repository settings; if the coordinator rules them an outside
  action, the spec names them for the owner instead.

### R6. The read-back budget is too small for a four-package run on today's npm

- UNIT: criterion 6 (with criterion 2's one-package-at-a-time order).
- VERDICT: red.
- REQUIREMENT: the Outcome ("a run that npm is slow to serve can be re-run to green") and criterion 8 (the live run on
  `main` is green).
- REASON: criterion 6 waits "after every upload" with "10 minutes for the whole run". Waiting after each upload,
  package by package, today takes about 10 minutes for four packages, so most runs would end red on the budget, and a
  re-run (criterion 5) waits the same again for versions npm still has not listed.
- EVIDENCE: run 46010157332, from its log: upload to "npm serves" took 2m46s (`2d`), 2m44s (`core`), 2m12s (`tools`),
  2m11s (`create-automata`), 9m58s in all; the job was cancelled by its 10-minute `timeout-minutes` 1 s after the last
  read-back. npm does not check that a dependency's version exists at upload, and `pnpm pack` has already written the
  exact versions, so dependents need not wait for their dependencies to be listed.
- EXPECTED: all uploads first, in dependency order, then one read-back that waits for every version together within
  the budget, so the run takes about one npm delay, not one per package.
- FIX: spec only. Criterion 6: "After the last upload, the run waits until npm lists every version of the run,
  together"; keep the 10-minute budget and the 20-minute job timeout. Criterion 7: the read-back test shows one shared
  wait, not one per package.

## Notes (not blocking)

- N7. Criterion 2 no longer says `--tag preview`. Today's code has it, and a tarball publish without it would move
  `latest` (on a package that exists, npm sets `latest` when no tag is given). Name it in criterion 2, test the
  arguments in criterion 7, and add `npm view <name> dist-tags.latest` is still `0.0.1` to criterion 8.
- N8. The Units section cites the `ruleMix` hook, but `.claude/hooks/rules.json` has `ruleMix.firstTimeSetup: true`,
  so `checkRuleMix` returns early and refuses nothing. The split still holds by `CLAUDE.md` Verification alone; the
  hook claim is wrong. Fixing the hook setting is out of this scope (lane 3, a follow-up).
- N9. bun's default per-test timeout is 5 s; criterion 7's test that runs `pnpm build` and packs four packages may
  need its own timeout. The real-pack test must not write the preview version into the real `package.json` files.
- N10. Run 46010157332 at `13eebff` is red (cancelled at the job timeout after all four uploads). It is this bug, not
  a new flaky check; the coordinator may add it to the `history.md` flaky entry for `f55432a`.

# Round 3 (narrow recheck of R5 and R6 only)

**0635186 PASS**

- Spec: `docs/superpowers/specs/2026-11-27-preview-publish-fix-design.md` at `0635186`, read whole, plus the diff
  `a273e5c..0635186` (the spec only). Checked only round 2's reds R5 and R6; nothing else was re-audited.
- This third round is past the two-round cap; the owner was told by the coordinator.
- Written 2026-11-27 14:00 UTC (from `date`), by a fresh audit session. Read-only apart from this file.

| Red | Fixed? | Where |
|---|---|---|
| R5 broken previews until U2 | Yes. The second "measured" bullet now states the owner's 13:39 to 13:41 UTC publish and run 46010157332's broken `0.0.1-preview.10.sha-13eebff` (`workspace:*`, one file), plus `core` `.8` and `.9`. "Stop the broken previews first" disables `publish.yml` before PR #13 merges and re-enables it once U1 has merged, with both `gh workflow` commands, run from the owner's Mac; the table row for #13 waits on "`publish` turned off". Boundaries name `core`, `2d` and `tools` `0.0.1-preview.8` onward for a possible `npm deprecate`. Between U1 and U2 a run fails before any upload (no build, so criterion 3 refuses every tarball), so re-enabling after U1 is safe. | Problem bullet 2; Units table row 0 and "Stop the broken previews first"; Boundaries |
| R6 read-back budget | Yes. Criterion 6: all uploads first in dependency order, then one wait for every version of the run together, 10-minute budget, job `timeout-minutes` 10 to 20 (install, build, pack and four uploads fit in the other 10). Criterion 7 tests "one shared wait for all versions within one budget". No other line still waits per package. | Criteria 6, 7 |

Notes (not blocking):

- N11. "The problem, measured", first bullet, still says `create-automata@0.0.1-preview.7.sha-fa9bdf0` "is the
  `preview` tag now"; since run 46010157332 it is `0.0.1-preview.10.sha-13eebff`. Stale wording only; it changes no
  step.
- N12. The disable must actually have run before #13 merges; the merging session checks `gh workflow view publish.yml
  -R AutomataFramework/AutomataFramework` shows it disabled (or the coordinator records that it was run) rather than
  taking it as done.
