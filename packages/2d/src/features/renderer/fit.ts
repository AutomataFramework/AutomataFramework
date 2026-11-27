/**
 * How many times bigger than the game's own size the canvas is shown in a box. Pixel art keeps whole numbers, except
 * in a box smaller than the game itself, where it is shrunk rather than cropped; anything else fills the box and keeps
 * its shape.
 */
export function fitScale(boxWidth: number, boxHeight: number, width: number, height: number, whole: boolean): number {
  const fit = Math.min(boxWidth / width, boxHeight / height)
  if (!(fit > 0)) return 1
  return whole && fit >= 1 ? Math.floor(fit) : fit
}
