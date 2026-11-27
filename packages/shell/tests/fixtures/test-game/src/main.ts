import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource-variable/figtree/index.css'
import { startGame } from '@automataframework/shell'
import { game } from './game.ts'
import * as messages from './paraglide/messages.js'

// `?throw` makes the game's own code fail on tick 100, to show the screens carry on.
if (new URLSearchParams(location.search).has('throw')) (globalThis as { throwAt?: number }).throwAt = 100

startGame(game, { messages })
