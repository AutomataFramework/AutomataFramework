# Progress

Last updated: 2026-11-27 13:39 UTC (from `date`). The project's one roadmap is `/mnt/project-files/roadmap/roadmap.md`.

| Stage | Where it is |
|---|---|
| Slice 0: kit, CI gate, npm preview publish | done 2026-11-27 (merged by #4, `1f0e5bd`) |
| Slice 1a: 2D, the shell and the agent tools | building; plan `docs/superpowers/specs/2026-11-27-shell-plan.md`, 8 of 108 steps ticked (7%) |

## Slice 1a units

| Unit | Lane | Where it is |
|---|---|---|
| U0 Docs | 1 | done, #7 (`f55432a`) |
| U1a CI: `browser` and `budgets` jobs | 3 | done, #5 (`98d33e6`), implementation audit passed |
| U1b CI tests | 1 | building |
| P1 The newcomer's path | 2 | done, #8 (`fa9bdf0`) |
| P2 to P7, P7w, A1, E5a, E5w-F | 2 or 3 | not started; build prompts 08 to 32 in `/mnt/project-files/specs/shell-build-prompts/` |

Examples' units (U2-1, U2-2, U2-3 done) are in that repo's `progress.md`.

## Waiting on the Owner

- O1: first publish of `@automataframework/core`, `/2d`, `/shell`, `/tools` and `/art` (script
  `setup/slice1a-first-publish.sh` in the project's files). Not run: `npm view @automataframework/core` was a 404 at
  13:35 UTC. Examples' E1 waits on it.
- O6: the GitHub OAuth app "Automata" for `link`'s sign-in. P7 waits on it.
