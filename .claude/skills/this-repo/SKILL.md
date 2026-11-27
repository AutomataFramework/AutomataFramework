---
name: this-repo
description: "Use when working in this repo: its layout, its CI and its own rules"
---

# This repo

What is particular to AutomataFramework.

- **The free part of Automata Framework**, public, MIT (but `packages/art`, GPL-3.0-or-later for its unfake.js core, the Owner's choice on 2026-11-27). It is published to npm as `@automataframework/*` and
  `create-automata`. The frozen roadmap (in the project's files, `roadmap/roadmap.md`) says what each slice adds; the
  package list there is frozen.
- **Slice 0 holds no product code.** The packages arrive in slice 1a; `create-automata` is a placeholder.
- **Private stays private.** No real game name, price or private plan appears here, in a file, a prompt or a commit
  message. CI's `private-names` job fails on any name in the `PRIVATE_NAMES` secret, in a file (words or path),
  any commit message reachable from the head, the pull request's title or description, and each fresh-agent prompt.
  It never prints a name in any spelling (a path that holds one is printed with that part as `[hidden]`), and it
  plants each name first to prove it catches it. It reads text files only (a binary file by its path) and not branch
  names, which are public too: keep names out of both. A pull request from a fork gets no
  secret, so the job fails there until a maintainer brings the change into a branch here.

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
- `.github/workflows/commit-authors.yml` runs the `commit-authors` and `private-names` checks again when a pull
  request's title or body is edited.
- `.github/workflows/publish.yml` publishes a preview of every public package in `packages/` after `ci` passes on a
  push to `main` (`scripts/publish-preview.ts`): version `<version>-preview.<run>.sha-<commit>`, dist-tag `preview`,
  never `latest`. A package npm has never seen is left out: its first version and its trusted publisher are the
  owner's step, because npm gives a first version `latest` whatever the tag. npm's trusted publishing (OIDC) signs in for a package that has `publish.yml` as its trusted
  publisher; `NPM_TOKEN` covers the rest until each package has one (npm stops 2FA-bypass tokens in January 2027).
  A new package gets `npm trust github <name> --repo AutomataFramework/AutomataFramework --file publish.yml
  --allow-publish` as an owner command once it first exists on npm.
- `.github/workflows/fresh-agent.yml` is the fresh-agent check, started by hand
  (`gh workflow run fresh-agent.yml -f runs=5`): Claude Code and OpenCode each make the prompt's game in an empty
  folder with an empty home, and the summary gives made or not, seconds, tokens and dollars per run. Claude Code
  stops at $2 a run; OpenCode runs one at a time (its dollars are the key's usage before and after) and only when
  the OpenRouter key has a credit limit with at most `OPENROUTER_CEILING` dollars left. Only `index.html` and
  `report.json` are kept, for 7 days, after a check that neither holds a key.
  `scripts/fresh-agent-report.ts` reads each agent's output.
- `tests/workflows/` reads the workflows: every action pinned to a commit, the triggers, and the gate knowing every
  job.

## Pull request bodies here

- When the GitHub MCP tool adds its own footer to a pull request body, set the whole body again with
  `mcp__github__update_pull_request` (its `body` field), then read the pull request back and check that the last
  line is "Requested by **McThayDT**".

## Structure

```
packages/create-automata/         the placeholder `npm create automata` (prints "not ready yet")
scripts/check-commit-authors.ts   the commit and pull request words check
scripts/check-private-names.ts    the private-names check
scripts/publish-preview.ts        the preview publish
scripts/fresh-agent-report.ts     one fresh-agent run's seconds, tokens and dollars
fresh-agent/                      the fresh-agent prompts
tests/scripts/, tests/workflows/  checks of the scripts and of the workflows
docs/superpowers/                 specs/, audits/, live/, progress.md and history.md
```
