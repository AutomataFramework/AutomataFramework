import { clear, drawRect } from '@automataframework/2d'
import { type Game, stick } from '@automataframework/core'

export const game: Game<{ x: number; y: number }> = {
  init: () => ({ x: 20, y: 20 }),
  update(state) {
    const [dx, dy] = stick('move')
    state.game.x += dx * 2
    state.game.y += dy * 2
    return state
  },
  draw: (state) => (clear('#101820'), drawRect(state.game.x, state.game.y, 16, 16, '#ffd23f')),
}
