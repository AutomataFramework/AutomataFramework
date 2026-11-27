# History

Finished milestones and their decision records, setup, rule changes, standing permissions, approved screens and lessons.

## Setup

- 2026-11-27 03:47 UTC: first-time setup (roadmap slice 0). The apps kit from https://mcthaydt.com/prompts/claude-md-apps/ (CLAUDE.md,
  the shared skills, the compaction hook, the rule hooks). The page's copy of `.claude/hooks/rules.mjs` lost its line
  breaks when read from the page (a `//` comment swallowed code, so it did not run), so `rules.mjs`,
  `settings.json` and `rules.json` were taken from AutomataFrameworkSite, which regenerated them from the same page
  (commit 562f2bb there); `rules.json` names this repo. Every other block matched the Site's copy word for word.
  Superpowers **7.0.2** (its `plugin.json`). Graphify: this repo is not indexed (only RukenApp is). Session tools:
  this session can message the coordinator and other threads; starting a fresh review session goes through the
  coordinator.
- Stack per the roadmap: Node 24, pnpm 10.34.9, TypeScript 7 via `bun check` (Bun 1.4.4), `bun test`,
  `bun fmt`, oxlint 1.95.0 (`bun lint` does not exist in Bun 1.4.4 or 1.4.5), knip 6.48.0.
- Setup check, item by item, on 813dcf3 (2026-11-27):
  - Owner-only steps: listed as one batch, `setup/slice0-framework-protection.sh` in the project's files (not in the
    repo): a ruleset on `main` that requires `gate`, turns on the merge queue with merge commits, and leaves out the
    up-to-date rule. **Missing** until the owner runs it (`gh api repos/AutomataFramework/AutomataFramework/rulesets`
    returns `[]`, and branch protection on `main` answers 404).
  - The commands in Stack and checks: **added**; all pass locally and in CI on this pull request. `pnpm build` matches
    no package until slice 1a.
  - The CI gate: **added** (`ci.yml`: `ready_for_review` listed, `plan` decides what applies, `gate` collects it).
  - The gate required by branch protection: **missing**, owner batch above. No other required check exists to keep.
  - Up-to-date rule off, and every push to `main` gets its own run: **added** (the ruleset leaves the rule out; the
    `concurrency` group never cancels a `main` run).
  - Merge queue: **missing**, owner batch above (the repo is an organization's, so GitHub's queue is available);
    `ci.yml` lists `merge_group`.
  - Graphify: **missing** (not indexed; only RukenApp is).
  - `commit-authors` inside the gate: **added**.
  - Restart handoff: none named, so nothing restored.
  - Auto-merge (`allow_auto_merge`) and deleting merged branches (`delete_branch_on_merge`): **present**, both `true`.
  - Session tools: this session can message the coordinator and threads, and the coordinator starts, picks the model
    of and resolves threads: **present**.
  - Superpowers: **7.0.2**, recorded above.
  - The compaction hook: **present** (`SessionStart`, matcher `compact`, prints `.claude/after-compaction.md`).
  - The rule hooks: **present**; `--check` reports no blanks; `firstTimeSetup` stays **on** through slice 0's setup
    pull requests (this one, then the preview publish, the private-name check and the fresh-agent runs, which put
    workflows and their scripts together); the last of them turns it off, and history names that pull request. With
    it off, the hook judges a whole branch against `main`, so turning it off here would refuse this setup branch. In a cloud environment, paste what
    `node .claude/hooks/rules.mjs --print-setup` prints into the environment's setup script once (an owner step that
    is not in the batch script; this project's cloud sessions already load the hooks through the Site repo's
    launcher).
  - The `verify` skill: **missing** until there is something to start (slice 1a); the file is the kit's template.

## Standing permissions

- 2026-11-27 04:32 UTC, the Owner (decision card), confirmed in the project thread on 2026-11-27 13:14 UTC ("yes,
  record my standing merge permission in history.md"): sessions may merge any pull request in all four repos
  (Framework, Examples, Editors, Site), lane 3 included, once its required reviews and audits pass and CI is green,
  and report after. They never ask the Owner to type or tap merge. Not covered: product choices, money, new accounts,
  releases and tags, credentials, and running fork code on RunPod pods (even after queueing); those still ask.

## Decisions

- 2026-11-27 14:22 UTC, the Owner (decision card, answered "Today's unfake.js" in the project chat): `/art` copies
  unfake.js 1.4.0 (commit 6636868), whose built core includes `imagequant` (GPL-3.0-or-later), so
  `@automataframework/art` is GPL-3.0-or-later. Every other package stays MIT; games never load `/art`, and the
  pictures it makes are not covered. Scope: unit A1, pull request #15.

## Flaky tests

- `ci` in the merge queue, run 46017760960 (2026-11-27, merge of #17, commit 11d426b): `audio.spec.ts`, "mute(true)
  puts the master at 0...", read 0.5 for the muted master instead of 0; the same test passed on the pull request heads.
  Cause: while an `AudioContext` is running, the audio thread writes a gain node's `gain.value` too, so reading it
  straight after setting it can give the value from before. A loop that set 0.5 then 0 and read back at once in headless
  Chromium read 0.5 23 times in 80,000; read after three blocks of sound, it read 0 10,000 times in 10,000. Fixed:
  `createAudio().gain()` answers from the volumes it was given, not from the nodes, and the test reads the nodes only
  after the audio thread has caught up (400 of 400 runs green). Scope: `packages/core/src/features/audio/audio.ts` and
  its test, lane 2.
- `publish` on `main`, run 45966147542 (2026-11-27, commit f55432a): npm took the upload of
  `create-automata@0.0.1-preview.4.sha-f55432a`, but `waitForNpm` in `scripts/publish-preview.ts` still did not see it
  after its five-minute read-back, so the run went red. The version is on npm now (`npm view create-automata versions`
  lists it), and the next runs (`7e242cc`, `98d33e6`) were green with no change. The same wait went red once before at
  `1c42ed0` (run 45940697237), which #4 answered by stretching the wait from one minute to five. Still open: a fix that
  does not hang on npm's serving delay (a lane 2 change to `scripts/publish-preview.ts`, with its review).
- `core/tests/features/audio/audio.spec.ts`, "mute(true) puts the master at 0 and mute(false) brings back the volume it
  had", merge-queue run 46017760960 (2026-11-27, `gh-readonly-queue/main/pr-17-...`): `audio.gain('master')` read 0.5
  right after `mute(true)`, where the test expects 0. It passed in the same job on the pull request's own head
  (`674b4fa`) and locally, and the change under test (`/2d`) does not touch core. Likely cause, not yet proved: in a
  running `AudioContext`, Chromium's `AudioParam.value` getter can return the value from the last render quantum rather
  than the one just set, so the read-back races the audio thread; `createAudio().gain()` could return the value it
  stored instead. Still open: its own thread (a lane 2 change to `packages/core/src/features/audio/audio.ts`, with its
  review).
