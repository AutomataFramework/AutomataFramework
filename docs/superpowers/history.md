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

## Standing permissions

None yet.

## Flaky tests

None yet.
