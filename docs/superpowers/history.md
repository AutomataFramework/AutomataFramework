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
    `node .claude/hooks/rules.mjs --print-setup` prints into the environment's setup script once (owner step, same
    batch).
  - The `verify` skill: **missing** until there is something to start (slice 1a); the file is the kit's template.

## Standing permissions

None yet.

## Flaky tests

None yet.
