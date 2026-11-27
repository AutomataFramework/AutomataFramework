import { clear, drawRect } from '@automataframework/2d'
import { type Game, content, isDown, stick, win } from '@automataframework/core'

type Level = { goal: [number, number] }
type Mine = { x: number; y: number; goal: [number, number] }

// Move the square to the yellow one. Touch and hold, or use the arrow keys.
export const game: Game<Mine> = {
  init: () => ({ x: 20, y: 20, goal: content<Level>('level').goal }),
  update(state) {
    const me = state.game
    const [dx, dy] = isDown('pointer')
      ? [stick('pointer')[0] - me.x - 8, stick('pointer')[1] - me.y - 8]
      : stick('move')
    const length = Math.hypot(dx, dy) || 1
    if (length > 3) {
      me.x += (dx / length) * 3
      me.y += (dy / length) * 3
    }
    if (Math.hypot(me.goal[0] - me.x, me.goal[1] - me.y) < 12) win(state)
    return state
  },
  draw(state) {
    clear()
    drawRect(state.game.goal[0], state.game.goal[1], 16, 16, '#ffd23f')
    drawRect(state.game.x, state.game.y, 16, 16)
  },
}
