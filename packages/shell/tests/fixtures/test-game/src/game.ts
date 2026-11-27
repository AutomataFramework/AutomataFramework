import { clear, drawCircle, drawRect, drawText } from '@automataframework/2d'
import { type Game, content, isDown, stick, win, lose } from '@automataframework/core'

type Level = { stars: [number, number][]; seconds: number }
type Mine = { x: number; y: number; stars: [number, number][]; score: number; ticksLeft: number; seconds: number }

/** Catch every star before the time runs out. Arrow keys move; so does holding a finger or the mouse on the picture. */
export const game: Game<Mine> = {
  init() {
    const level = content<Level>('level')
    return { x: 40, y: 170, stars: level.stars, score: 0, ticksLeft: level.seconds * 60, seconds: level.seconds }
  },
  update(state) {
    const me = state.game
    const [dx, dy] = isDown('pointer')
      ? [stick('pointer')[0] - me.x - 8, stick('pointer')[1] - me.y - 8]
      : stick('move')
    const length = Math.hypot(dx, dy)
    if (length > 0) {
      me.x += (dx / Math.max(1, length)) * 3
      me.y += (dy / Math.max(1, length)) * 3
    }
    me.stars = me.stars.filter(([sx, sy]) => {
      const caught = Math.hypot(sx - me.x - 8, sy - me.y - 8) < 14
      if (caught) me.score += 1
      return !caught
    })
    me.ticksLeft -= 1
    // Used by the tests: the game's own code failing, so the screens around it must carry on.
    if ((globalThis as { throwAt?: number }).throwAt === state.tick + 1)
      throw new Error('The test game broke on purpose.')
    if (me.stars.length === 0) win(state)
    else if (me.ticksLeft <= 0) lose(state)
    return state
  },
  draw(state) {
    const me = state.game
    clear('#1c2b3a')
    drawRect(0, 330, 640, 30, '#2f4a3a')
    for (const [sx, sy] of me.stars) drawCircle(sx, sy, 9, '#ffd23f')
    drawRect(me.x, me.y, 16, 16, '#ffffff')
    drawText(`${me.score}`, 12, 340, { size: 14, color: '#ffffff' })
  },
}
