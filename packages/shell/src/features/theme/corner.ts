// Our own corner. A plain round corner turns at one steady rate; ours turns slowly, then steeply, then slowly again:
// after a share `s` of the way round, the turn is 90 degrees x s^k / (s^k + (1 - s)^k). `k` of 1 is a plain circle, and
// a bigger `k` is nearer a square corner. It is drawn as an SVG shape because `border-radius` cannot make this curve,
// `clip-path` cuts off focus rings and shadows, and `corner-shape` is not in Safari.
type Point = [number, number]

const steps = 18
const unit = new Map<number, Point[]>()

/** One corner as `steps + 1` points from the top edge to the side edge, scaled to fit a 1 by 1 square. */
export function unitCorner(k: number): Point[] {
  const known = unit.get(k)
  if (known) return known
  const points: Point[] = [[0, 0]]
  let x = 0
  let y = 0
  // Integrate the direction of travel finely, and keep a point at each of the `steps` shares of the way round.
  const fine = 24
  for (let i = 0; i < steps * fine; i += 1) {
    const s = (i + 0.5) / (steps * fine)
    const a = s ** k
    const turn = ((Math.PI / 2) * a) / (a + (1 - s) ** k)
    x += Math.sin(turn)
    y += Math.cos(turn)
    if ((i + 1) % fine === 0) points.push([x, y])
  }
  const made = points.map(([px, py]): Point => [px / x, py / x])
  unit.set(k, made)
  return made
}

/** Which of the four corners are curved: top left, top right, bottom right, bottom left. */
export type Curved = [boolean, boolean, boolean, boolean]
export const allCurved: Curved = [true, true, true, true]

/** The points of a `width` by `height` shape, grown by `grow` all round, with corners of size `size` and steepness `k`. */
export function shapePoints(
  width: number,
  height: number,
  size: number,
  k: number,
  grow = 0,
  curved = allCurved,
): Point[] {
  const [x0, y0, x1, y1] = [0 - grow, 0 - grow, width + grow, height + grow]
  const r = Math.max(0, Math.min(size + grow, (x1 - x0) / 2, (y1 - y0) / 2))
  const from = unitCorner(k)
  const back = from.toReversed()
  const out: Point[] = []
  if (curved[0] && r > 0) for (const [u, v] of from) out.push([x0 + r * u, y0 + r - r * v])
  else out.push([x0, y0])
  if (curved[1] && r > 0) for (const [u, v] of back) out.push([x1 - r * u, y0 + r - r * v])
  else out.push([x1, y0])
  if (curved[2] && r > 0) for (const [u, v] of from) out.push([x1 - r * u, y1 - r + r * v])
  else out.push([x1, y1])
  if (curved[3] && r > 0) for (const [u, v] of back) out.push([x0 + r * u, y1 - r + r * v])
  else out.push([x0, y1])
  return out
}

/** The same, as the text of an SVG path. The same inputs always give the same text. */
export function shapePath(...args: Parameters<typeof shapePoints>): string {
  return `M${shapePoints(...args)
    .map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`)
    .join('L')}Z`
}
