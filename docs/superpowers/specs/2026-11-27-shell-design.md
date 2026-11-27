# Slice 1a: 2D, the shell and the agent tools

Status: revised in slice 0 (2026-11-27) to match the approved roadmap (`/mnt/project-files/roadmap/roadmap.md`,
frozen 2026-11-27 03:35 UTC). Where this spec and the roadmap differ, the roadmap wins. This spec moves to
`AutomataFramework/docs/superpowers/specs/` with the repo's first pull request. Path: staged. Every answer below is the
Owner's, from the decision cards on 2026-11-27, unless it says "proposed". Slices 1b (3D) and 1c (online rooms) get
their own specs when each is Now.

## Outcome

A person who doesn't code says "make me a game about ..." in a chat and gets a 2D game on their phone, with a splash,
main menu, pause, settings, saves and end screens that just work. The 2D sample's first room proves it, played on a
real phone, an iPad and a computer.

## Who it is for

- **Creatives with taste** (artists, writers, designers, musicians) who have a game in their head and don't code.
  Their agent writes the game; they shape it by hand in the editors later.
- **The brand:** "what people with taste use to make games". Every default (the shell's look, its motion, its words,
  the examples, the docs) is art-directed.
- **The promise:** your whole game is plain files that your agent and your fingers both change. It looks good before
  you touch it. Your agent plays the game to test its own work. Nothing locks you in.
- **Two people.** The non-coder never sees a command, a code file or a programmer's error. The coder gets
  `npm create automata` and Raylib-style examples. The API is judged by whether an agent succeeds with it; the
  short-file limits (criterion 14) are a cheap guard, not the goal.

## Order inside 1a

1. **The newcomer's path first:** one line makes a game, the game plays, and one command puts it on a link that plays
   on a phone.
2. **Then the drawing spike:** 2,000 `drawSprite()` calls a frame hold 60 frames a second, or the drawing layer is
   redesigned before anything is built on it. It passes only with a number from the Owner's real phone. The floor
   device is a 2020 iPhone SE **(proposed)**; if the Owner's phone is faster, the pod's slowed run stands in for the
   floor.
3. Then the rest of 1a.

The one-day baseline (Claude Code with Phaser's skills making a menu, settings, saves, touch controls and Spanish,
timed and played on a phone) runs in slice 0, and its note goes in the 1a plan.
It came out at about 8 minutes and $2.78 for a plain Phaser game (`/mnt/project-files/baseline/baseline-note.md`).
1a is not judged against that time. Automata may take longer, as long as the game looks better and scales better
(the Owner, 2026-11-27): the comparison in the slice report is on look (the Owner's screens approval) and on scale
(more screens, players, languages and content files with no code change), not on minutes.

## What we build

### Packages (in AutomataFramework; the roadmap's list is frozen)

1a starts six of the eight:

- `@automataframework/core`: everything a game's `update` uses and nothing that draws. It runs in a browser, in Node
  and later on a room server: the tick, `state`, input, saves, loading content files, the published zod schemas, the
  format upgrader, and the record and replay engine.
- `@automataframework/2d`: drawing on PixiJS 8.23.0 (pinned).
- `@automataframework/shell`: the screens, settings, saves screens and languages, in Svelte 5.
- `@automataframework/tools`: the commands, in Node: the `automata` command, the MCP server, `automata check` and the
  screenshot tool. They call `/core` and hold no game logic of their own.
- `@automataframework/art`: opt-in, build time only (see Art).
- `create-automata`: makes a new game.

`/3d` comes in 1b and `/rooms` in 1c. Each package touched gets a line budget (source, without tests), set in the 1a
plan from the count on `main` when 1a starts; CI checks it, and at the budget the slice cuts something or brings a
card.

The API is plain functions, one obvious way to do each thing, in the spirit of Raylib: `drawSprite()`,
`isDown('jump', player)`, `playSound()`. `player` defaults to the first, so solo code stays short. No classes to wire
up.

### How a game is shaped

- **Multiplayer by default.** Every game's `state` holds a list of players; solo is a list of one. In 1a that means
  two or more players on one screen, each with their own controls. Online rooms come in 1c.
- **Two parts.** `update(state, inputs)` takes plain data and returns plain data on a fixed 60-a-second tick, and
  `draw(state)` is the only part that touches the screen. `update` runs in plain Node with no PixiJS, Svelte or
  browser.
- **Physics.** No physics library until slice 3; 1a games use simple box collisions written in the game. `state` has
  a named place for the physics world's saved form from 1a, so saves and recorded plays keep their shape when it
  lands.
- **Content is loaded when the game runs,** not baked into the code, so changing a content file changes a built game
  with no rebuild. A game may add its own kind of content file with its own schema; the editors show it as a plain
  form from slice 2. Nothing for that is built in 1a beyond the schema hook.
- **What a user's game needs:** Node, git and a GitHub account, and nothing else.

### The shell

- **Screens are files.** Each shell screen (what is on it, where it sits), the game's own UI during play (the HUD:
  the 2D sample's star count and clock) and the flow from one screen to the next is a JSON content file, listed in
  `automata.json` and checked like the others. These three formats are marked "may change" until slice 2 closes. 1a
  also makes one rough sketch of how the Screens editor will show a screen, and nothing more of the editor.
- **Splash.** The game's own logo, a few seconds; any key, button or tap skips it. A game can skip the splash and menu
  and start straight in play.
- **Main menu.** Continue (only when there is a save), New game, Settings. No Quit.
- **Pause.** Resume, Settings, Main menu. Main menu asks first, since progress since the last save is lost.
- **Settings.**
  - Language: English and Spanish, with `@inlang/paraglide-js` 2.25.4 and `@inlang/plugin-message-format` 4.4.4.
    Same files, two readers: shipped games use Paraglide's compiler on its message files; while an editor is open
    (from slice 2), the shell reads the same files directly. One format, never a second copy.
  - Sound: master, music and effects sliders, plus mute. Until slice 6 the sounds are a few plain ones (a click, a
    blip, a short loop) made by a small script at no cost, kept in Examples.
  - Controls: touch first, then gamepad, then keyboard and mouse. Players can remap the gamepad and keyboard. Held
    buttons can be set to tap. On touch screens the shell draws on-screen controls from the game's controls file (a
    stick and up to four buttons), which players can move and resize, and which hide when a pad or keyboard is used.
  - Bigger text, More contrast, Less motion: each has a few levels, not a switch, and each starts from what the
    device already asks for **(proposed)**.
- **Saves.** Three slots plus an autosave, kept in the browser. Players can export a save as a plain JSON file and
  import it back.
- **End screens.** Win and lose, each with Retry and Main menu, and a credits screen read from a file.
- **Theme.** Each game restyles the shell from one theme file: colours, fonts, art. The samples use Fusion Pixel Font
  (SIL Open Font License 1.1; Latin, Chinese, Japanese and Korean), kept in the samples, with a plain font that the
  top text size and More contrast can switch to.
- **Accessible from the start:** by keys alone with the focus in sight, every drag also a button or key, every control
  named for a screen reader, nothing told by colour alone (two players included), words at 4.5 to 1, less motion
  obeyed, 44-point targets.

### Built for agents, open to any agent

- **The games workflow runs quietly under every game:** short slices, a brief, checks that fail on their own, the
  game played before "done", early previews and plain questions. The creative sees a link, a picture of what changed
  and a question when one is theirs. `create-automata` and the chat door both set it up, for one person making one
  game.
- **Rules ship as `AGENTS.md`,** which most agents read. `CLAUDE.md` is a one-line pointer to it. `AGENTS.md` stays
  under 24 KiB **(proposed; the roadmap says well under 32 KiB)**, checked by a test.
- **Skills** in the open skills format, written into the game's own folder and kept in step by `automata check`: "make
  a game", "add a screen", "change the words".
- **`automata check`** checks every content file, the theme's contrast and anything that looks like a key, and prints
  plain-words fixes an agent can act on.
- **The MCP server,** and every one of its tools is also a plain command: check the game; play it without a screen
  (send inputs, step the ticks, read the state); take a screenshot; record a play and replay the plays; list the
  content files with their schemas.
- **A smoothness check, so it never rests on the agent's taste** (a lesson from slice 0's baseline, which was choppy on
  a real phone because of 70 separately animated dots, and whose agent never measured it). A tool, also a plain
  command, plays the game in the floor phone's browser profile with the CPU slowed 4 times and reports the lowest
  frame rate and what costs the most each frame. The shipped games workflow runs it before any change is called
  done, and under 30 frames a second the change is not done. It refuses to report a pass when the page draws with a
  software renderer, and says so in plain words instead. The shell has a frame counter a person can turn on, so a
  real phone's number can be read off the screen.
- **Recorded plays are a QA tool, not a selling point.** An agent records plays and replays them after every change
  to see what it broke. A play gives the same result on the same machine and build, and that is all we rely on. The
  sample is also replayed in Chromium, WebKit and Firefox in CI as an early warning for online play; a mismatch there
  is logged and blocks nothing.
- **The gate is in our own tools.** The command that makes the play link refuses a broken game, or one holding
  anything that looks like a key, on every agent, in plain words. Small hooks exist for Claude Code and OpenCode only.
  The docs list which agents are tested and recommend none.
- **Never bare `automata`.** `automata` on npm is a stranger's package, so no skill, doc or `AGENTS.md` line runs it
  except through the game's own scripts, and a test greps for it.

### The two doors

- **The non-coder's door: a chat in Claude's app,** the only one built and checked end to end in 1a. They install one
  thing, say what game they want, and the agent runs every command and hands back a link. Nothing is hosted or paid
  for by us. Before the repo is made, the agent says in plain words that a free account's game files are public, and
  names bought art, fonts and music, which often may not be shared that way. Private is GitHub's paid choice; the
  agent explains it and does not set it up.
- **Where the game lives:** the creative's own GitHub account. The agent makes the repo, GitHub Pages in the same
  account hosts the play link, and a workflow that `create-automata` writes runs the same gate as the link command
  and republishes the link on every commit, whoever made it. The new game's ignore file covers key files.
- **The coder's door:** `npm create automata` makes a game in one line, and one command puts it on a link. OpenCode
  proves the files are not locked to Claude through this door. The skills are not listed in any directory before
  Release 1.

### Won't break

- **Content files are JSON.** Each has a `format` number and an `id`, is checked by a zod schema `/core` publishes
  (also as JSON Schema, for agents and editors), and is listed in the game's one manifest, `automata.json`. A file
  not listed is not part of the game. The format upgrader is built with the first format: when a format changes, code
  upgrades old files and saves, and nobody edits them by hand.
- Every content file is checked when the game starts. A mistake shows a plain message that names the file, the line
  and what to write instead.
- The shell keeps working if the game's code throws: the menu, settings and saves stay usable, and the player sees a
  plain "Something went wrong. Try again" with a way back to the menu.

### Art

- `@automataframework/art`, opt-in and build time only: it takes AI-made art from fal.ai (images and sprite frames),
  cleans it with unfake.js (MIT) and quantizes it to the DUEL palette (Lospec, 256 colours). The samples use it; a
  user's own game never has to.
- Every generated file is kept with the prompt, model and seed that made it. Generated files go only into the samples,
  never into the framework.
- The art review's "reimagine this image" step also runs on fal.ai.

### The 2D sample's first room (in AutomataFrameworkExamples)

The Owner's own concept, under its code name; the real name stays in the private notes. One room with real art from
`/art`: the hero runs and jumps and collects three stars before a clock runs out. Collecting them wins; the clock
running out loses. The clock and the box collisions stay in the game's own code. Examples carries its licence split
from slice 0: the code is MIT, and the sample's content folders carry their own "all rights reserved" notice.

### Small examples, Raylib-style (in AutomataFrameworkExamples/examples/)

Tiny one-file examples, one idea each, grouped like Raylib's. 1a adds about ten: open a window, draw shapes, move a
shape by touch, gamepad and keys, play a sound, draw text in two languages, and the shell's splash, menu, settings and
saves. CI runs every one. They are also what agents copy from.

### The check harness

Built once in 1a; every later slice only adds cases to it. It runs the every-slice checks in roadmap section 4: the
fresh-agent check, the newcomer check, the non-coder check, upgrades, every way to play, the agent's play and replay,
frame rate, the loading budget, the accessibility bar and the site's examples journey. The pipe that puts Examples'
builds on the website is built once here too.

## Acceptance criteria

Each is checked by a program unless it says "by a person".

1. In the 2D sample, on small phone, tablet and computer browser profiles: splash, main menu, a run, pause, settings,
   back, and both end screens can each be reached and left with touch alone, gamepad alone and keyboard alone.
2. Every button is at least 44 by 44 points, has a visible focus ring, one plain label and a name a screen reader
   says.
3. Changing the language changes every word on every shell screen, and the choice survives a reload.
4. Each sound slider changes what is heard (checked through the audio graph's gain), and mute silences everything.
5. A remapped key or button works in the game and survives a reload. A held button set to tap works as a tap.
6. Each level of Bigger text, More contrast and Less motion changes the screens as stated, and the first run follows
   the device's own setting.
7. Saving to a slot, reloading and pressing Continue returns to the same state. An exported save imports back to the
   same state. A broken save file shows a plain message and harms no other slot.
8. A content file with a mistake shows a message naming the file and the fix, and the game does not start broken.
9. A game whose code throws during play leaves the menu, settings and saves working.
10. Two players can play the 2D sample on one screen with separate controls, and are told apart by more than colour.
11. Frame rate: 60 frames a second is the aim and never under 30. The number that counts comes from the Owner's real
    phone and iPad, written in the slice report; the sample can show its own frame count. The pod run in Examples is
    a guard against getting slower, with the CPU slowed 4 times **(proposed)**, and takes the screenshots, never on a
    software renderer.
12. The drawing spike: 2,000 `drawSprite()` calls a frame at 60 frames a second on the Owner's real phone, before
    anything is built on the drawing layer.
13. No generated content and no boilerplate in the packages: a test fails on any art, sound or text file in them.
    The one exception is the shell's own words (its button and screen labels, in English and Spanish), which live in
    `/shell`'s message files because the shell cannot work without them.
14. A whole game that uses the shell fits in one code file under 40 lines plus its content files, and the "move a
    shape" example is under 15 lines.
15. The website's examples page shows 1a's small examples, each live and with its source, and the 2D sample under
    its code name, checked by a journey.
16. The fresh-agent check: an agent given only the skills, in an empty folder with none of this project's rules,
    memory or hooks, makes a small game that passes `automata check` and has a recorded play that reaches its win
    screen. It runs headless in CI, 5 times on Claude Code and 5 times on OpenCode with the one pinned non-Claude model
    named on slice 0's card. Pass is 4 of 5 on each. Time and tokens are recorded. At 3 of 5 or fewer the skills are
    fixed and it runs again, three tries at most; then it is a card, never a lower pass line.
17. The sample's `update` runs in plain Node, with no browser, for 10,000 ticks with recorded inputs and ends in the
    same state every time on the same machine.
18. By a person (the Owner): the 2D sample feels right on a real iPad and phone, with the lowest frame count seen
    written down.
19. Every shell screen, the HUD and the flow between screens are read from content files; changing one of those
    files changes the screen with no code change, and changing one content file in a built game changes the game
    with no rebuild.
20. The newcomer check: from a real npm install outside our repos, `npm create automata` and one command give a game
    that plays from a link on a phone.
21. The non-coder check: the Owner types the slice's few sentences once in a fresh chat in Claude's app and saves the
    chat. A program scans the whole transcript and fails on any command, code or stack trace shown to the person,
    and the chat ends in a link that plays on a phone. The chat says the game's files will be public before the repo
    is made.
22. By a person (the Owner): the shell's default look is approved on a screens page. The look rounds go on until the
    Owner approves, each round past the kit's cap logged in the roadmap. Then one short design language page for the
    games' look is written.
23. `automata check` fails a theme under 4.5 to 1 and any file that looks like a key; the link command and the game's
    workflow refuse both, in plain words.
24. The first screen of the sample shows within 3 seconds on a throttled phone profile, with under 1.5 MB loaded
    before it shows **(proposed)**.
25. `AGENTS.md` is under its size limit, and no skill, doc or `AGENTS.md` line runs `automata` except through the
    game's own scripts.
26. Every MCP tool is also a plain command, and each is covered by a test.
27. An agent plays the sample through the tools, and its recorded plays replay to the same end state.
27a. The smoothness check fails a planted test game that drops under 30 frames a second on the slowed floor profile,
    passes the 2D sample, names what costs the most, and refuses to pass on a software renderer. The fresh-agent
    check's game must pass it too.
28. Every package touched is under its line budget, and the slice report gives the running line count of every
    package and the hours the slice end took.
29. The accessibility bar (rule 6 of the roadmap) is checked by a program on every shell screen and the sample's HUD.
    By a person (a fresh reviewer, then the Owner): every word and screen passes the drunk-grandma test.
30. CI in Examples fails on a content file outside a folder that carries the "all rights reserved" notice, and CI in
    the public repos fails on a planted private name, read from a secret.
31. At the slice end, the waitlist sits beside the examples on the site, and one short clip of the sample points to
    the playable example there. A session posts it to the Owner's own X and Instagram only after the Owner's OK on a
    card that shows the clip and its words; a yes covers that one post.

## Boundaries

- **Toolchain** (the kit's Default stack): Node 24, a pnpm 10 workspace, TypeScript 7. bun runs the checks:
  `bun test` (test files keep their `vitest` imports), `bun check`, `bun lint` (reads `.oxlintrc.json`) and
  `bun fmt`. Playwright in its own image pinned by digest, run with `--user 1001 --ipc=host`; every browser step waits
  for a ready signal. Vite builds the games. knip finds unused code.
- **Dependencies:** pixi.js 8.23.0 (pinned), Svelte 5, @inlang/paraglide-js 2.25.4 with
  @inlang/plugin-message-format 4.4.4, zod 4.6.6, @modelcontextprotocol/sdk, unfake.js. Anything else needs the Owner.
- **Out of scope:** 3D, online play, any editor (beyond the one rough sketch), physics libraries, sound from
  ElevenLabs, listing the skills anywhere, any announcement.
- **Fresh code.** The old repos are read for lessons only. The one exception is later: the editors reuse V1's editor
  shell (roadmap section 7).
- **How Examples gets the framework:** AutomataFramework's CI publishes every merge to `main` to npm as a preview
  (for example `0.1.0-next.12`), and Examples pins an exact version. Every version is 0.x and says "formats may
  change" until Framework 1.0 in slice 8.
- **New ideas** go on the roadmap's waiting list the day they arrive and are read only at the slice end. The slice
  being built never changes.
- **Where work runs:** cloud sessions and CI only. AutomataFramework uses GitHub's runners. Examples runs CI on
  RunPod, GPU pods for anything drawn. Nothing runs on the Owner's computer except the commands in roadmap section 12.
- **Budget:** RunPod CI at the cap slice 0's card sets from a measured run. The second agent's model and Claude Code's
  headless runs at the caps on that same card. Art through fal.ai at $50 a month, one key; work stops and asks at any
  cap.
- **Private stays private.** No real game names or prices in public repos; CI in the public repos fails on any
  private name, read from a secret, in files, prompts and commit messages.
- **Expected duration (estimate):** 12 days, Dec 4 to Dec 15, 2026 (roadmap section 6), two of them the slice end.

## Lessons carried from V1

- Check every acceptance criterion has a test before the build starts.
- Browser tests wait for the page to be ready before acting.
- Run the mockup drift check before the Owner's screen approvals, not after.
- Keep the commit-authors check; never commit test output folders such as `.vitest/`.
- Keep CI under its measured capacity, or runs queue.

## Open questions for the Owner

None that block the plan. The numbers marked "proposed" (the floor device, the 4 times CPU slowdown, 3 seconds and
1.5 MB, the 24 KiB limit) are set here and change only by a card.

## After 1a (each with its own spec when it is Now)

- **1b:** `/3d` on @pixi/3d 0.1.0, 3D art (Tripo models and Meshy rigs, both on fal.ai) and the 3D sample's first
  room, after the Owner has played 1a.
- **1c:** `/rooms`, a small online proof on the creative's own host account.
- **Slices 2 to 7:** one editor each, Screens first, then World, Characters, Feel (with Tuner), Sound, Story.
- **Release 1** after all six editors and Framework 1.0; **Release 2**, the Suite on sale in the browser, after it.
