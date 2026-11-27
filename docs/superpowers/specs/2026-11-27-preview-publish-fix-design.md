# Preview publish fix

Staged path, lane 3 (it changes `.github/workflows/publish.yml`). Brief for the fix of red R1 in the lane 3 catch-up
audit of PR #2 (`fa9bdf0 FAIL: 2 red`, issue comment 7219742809), and of the flaky read-back recorded under "Flaky
tests" in `history.md` (run 45966147542, commit `f55432a`). R2 (the Claude Code monthly cap) is an owner-side
credential step and is not in this brief.

## The problem, measured

- `publish.yml` checks out, sets up Node and npm, and runs `node scripts/publish-preview.ts`. Nothing installs or
  builds, so `dist/` never exists. `create-automata@0.0.1-preview.7.sha-fa9bdf0` holds no `dist/` and is the `preview`
  tag now: `npm create automata@preview` gets no command (run 46007544289: "No bin file found at dist/bin.js").
- `npm publish` leaves `workspace:*` as written. `@automataframework/2d` and `tools` depend on
  `@automataframework/core: workspace:*`. Today they are left out (not on npm), but the owner is first-publishing
  `0.0.1` of `core`, `2d` and `tools` now, so the next merge would publish them with a range no one can install.
- Packages go out in name order: `2d` before `core`, so `2d`'s preview would point at a `core` preview not yet up.
- The read-back (`waitForNpm`) asks `/<name>/<version>` every 6 s for 5 min and fails the run when npm is slow.
  At `f55432a` npm took the upload ("may take a few minutes to become available") and the run went red at 5 min; the
  version is on npm now. A re-run cannot recover: it publishes again and fails on "cannot publish over". The cause of
  the delay is npm's, not proven further; the version document answers `cache-control: max-age=300`
  (`curl -sI`, 2026-11-27 13:40 UTC).

## Outcome

Every preview on npm holds its built files, its `bin` and `exports` targets exist in the tarball, workspace ranges are
real preview versions of packages published in the same run, and a run that npm is slow to serve can be re-run to
green without publishing twice.

## Acceptance criteria

1. **Built.** `publish.yml` sets up pnpm (the version in `packageManager`), runs `pnpm install --frozen-lockfile` and
   `pnpm build` before the script.
2. **Packed by pnpm.** For each package, the script sets the preview version in every package of the run, then
   `pnpm pack` makes the tarball (pnpm turns `workspace:*` into the exact version), and `npm publish <tarball>`
   publishes it, so npm's own trusted publishing and `--provenance` are unchanged.
3. **Checked before it leaves.** Before any upload, every tarball is unpacked and the run fails, publishing nothing,
   when a tarball lacks a `bin` target, an `exports` target (every string in the map), `main` or `types` where set,
   or holds a dependency range starting `workspace:`. Each failure names the package and the file.
4. **Dependency order.** Packages publish dependencies first. A package whose workspace dependency is left out of the
   run (not on npm) is left out too, with a line saying why.
5. **Re-run safe.** A version npm already lists is not published again; the run goes straight to its read-back.
6. **Read-back.** After every upload, the run waits until npm lists each version (the package document's `versions`,
   asked with `cache-control: no-cache` and a new query each try, or the version document). Budget 10 minutes for the
   whole run, not per package. On timeout the run is red and says to re-run it, which (criterion 5) uploads nothing.
   The job's `timeout-minutes` goes from 10 to 20.
7. **Tests** in `tests/scripts/publish-preview.test.ts`: missing `bin`, missing `exports` target, a `workspace:`
   range, dependency order, a left-out dependency leaving its dependent out, an already-listed version skipped, the
   read-back's request (no-cache header, changing query). One test packs the real `packages/` after `pnpm build` and
   passes the check; with `dist/` removed it fails. `tests/workflows/` gains a `publish.yml` test: pnpm set up,
   install and build run before the script.
8. **Live proof.** After the last pull request merges, the next `publish` run on `main` is green and
   `npm pack create-automata@preview` lists `dist/bin.js`; `npm view @automataframework/tools@preview dependencies`
   (once it is on npm) shows an exact `core` version.

## Units

The rules keep a workflow change out of a pull request that changes code or tests, so three pull requests, on this
branch one after the other. Both U1 and U2 are lane 3 here (`CLAUDE.md`: "anything that publishes to npm"), so the
one implementation audit reads both before U2 merges, and U1 also merges only after it.

| Unit | Lane | Files | Waits on | Check |
|---|---|---|---|---|
| U1 script | 3 | `scripts/publish-preview.ts`, `tests/scripts/publish-preview.test.ts` | this spec | criteria 2 to 7 (script part) in `bun test` |
| U2 workflow | 3 | `.github/workflows/publish.yml`, the `this-repo` skill's publish line | U1 merged | criterion 1, then 8 |
| U3 workflow test | 1 | `tests/workflows/publish.test.ts` | U2 merged | criterion 7 (workflow part) |

U3 comes after U2 because a test of `publish.yml` would fail until U2 lands, and a workflow and the test that reads it
never share a pull request.

Between U1 and U2 merging, one `publish` run uses the new script with the old workflow: nothing is built and pnpm is
not set up, so it fails before any upload. It is red and publishes nothing, which is the safe way round; it is
expected and named here so no one records it as flaky. U2's merge starts the run that proves criterion 8.

## Boundaries

- No new dependency: pnpm and npm are already in the stack; `tar` is on GitHub's runners.
- Not in scope: `npm deprecate` of the broken previews `0.0.1-preview.2` to `.7` (an outside action; the owner may ask
  for it), the Claude Code monthly cap (R2), and the round 2 note on previews landing out of order.
- Expected duration: about 2 hours of session time, audits included.
