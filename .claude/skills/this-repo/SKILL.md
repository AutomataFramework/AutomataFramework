---
name: this-repo
description: "Use when working in this repo: its layout, its CI and its own rules"
---

# This repo

What is particular to AutomataFramework.

- **The free part of Automata Framework**, public, MIT. It is published to npm as `@automataframework/*` and
  `create-automata`. The frozen roadmap (in the project's files, `roadmap/roadmap.md`) says what each slice adds; the
  package list there is frozen.
- **Slice 0 holds no product code.** The packages arrive in slice 1a.
- **Private stays private.** No real game name, price or private plan appears here, in a file, a prompt or a commit
  message. A CI check that fails on any name in the `PRIVATE_NAMES` secret is not built yet: it comes in the next
  slice 0 pull request.

## Tools

- Node 24, pnpm 10 workspaces (`packages/*`), TypeScript 7 checked by `bun check`, `bun test` for tests (files import
  from `bun:test`), `bun fmt` for formatting (`bunfig.toml`, ignores in `.prettierignore`), oxlint for lint
  (`.oxlintrc.json`), knip. Bun is pinned to 1.4.4 in CI.
- `.claude/` and Markdown are the owner's text, so neither is linted or formatted.
- `scripts/check-commit-authors.ts` is the same file as in the other repos of the project. Its two lint exceptions
  are in `.oxlintrc.json`.

## Fast CI here

- `.github/workflows/ci.yml`: `plan`, then `lint`, `typecheck`, `test` and `build` side by side, `commit-authors`
  on pull requests and in the merge queue, and `gate`, the one check `main` requires. The whole suite takes seconds,
  so drafts run all of it too.
- A pull request that changes only `CLAUDE.md` or Markdown under `docs/` is docs-only: the testing jobs are left out
  and `gate` passes on `plan` and `commit-authors`.
- `.github/workflows/commit-authors.yml` runs the same check again when a pull request's title or body is edited.
- `tests/workflows/` reads the workflows: every action pinned to a commit, the triggers, and the gate knowing every
  job.

## Pull request bodies here

- When the GitHub MCP tool adds its own footer to a pull request body, set the whole body again with
  `mcp__github__update_pull_request` (its `body` field), then read the pull request back and check that the last
  line is "Requested by **McThayDT**".

## Structure

```
scripts/check-commit-authors.ts   the commit and pull request words check
tests/scripts/, tests/workflows/  checks of the scripts and of the workflows
docs/superpowers/                 specs/, audits/, live/, progress.md and history.md
```
