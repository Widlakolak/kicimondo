import { canStand, type Box, type Point } from './room.ts'
import type { Viewport } from './camera'

const spacing = 8
const offsets = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const

export function clearSegment(from: Point, to: Point, solids: readonly Box[]) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return !solids.some(({ x, y, width, height }) => {
    const left = x - 5, right = x + width + 5, top = y - 3, bottom = y + height + 3
    if (!dx && (from.x <= left || from.x >= right)) return false
    if (!dy && (from.y <= top || from.y >= bottom)) return false
    const startX = dx ? (left - from.x) / dx : -Infinity
    const endX = dx ? (right - from.x) / dx : Infinity
    const startY = dy ? (top - from.y) / dy : -Infinity
    const endY = dy ? (bottom - from.y) / dy : Infinity
    // Touching an edge is allowed. Entering the footprint between samples is not.
    return Math.max(0, Math.min(startX, endX), Math.min(startY, endY)) <
      Math.min(1, Math.max(startX, endX), Math.max(startY, endY))
  })
}

export function routeTo(from: Point, to: Point, world: Viewport, solids: readonly Box[]): Point[] | null {
  const inside = ({ x, y }: Point) => x >= 5 && y >= 3 && x <= world.width - 5 && y <= world.height - 3
  const walkable = (point: Point) => inside(point) && canStand(point, solids)
  if (!walkable(to) || !walkable(from)) return null
  if (clearSegment(from, to, solids)) return [to]

  const columns = Math.ceil(world.width / spacing)
  const rows = Math.ceil(world.height / spacing)
  const previous = new Int32Array(columns * rows).fill(-2)
  const queue: number[] = []
  const cell = (index: number): Point => ({ x: (index % columns) * spacing, y: Math.floor(index / columns) * spacing })
  function add(column: number, row: number, origin: Point, parent: number) {
    if (column < 0 || row < 0 || column >= columns || row >= rows) return
    const index = row * columns + column
    if (previous[index] !== -2) return
    const point = cell(index)
    if (!walkable(point) || !clearSegment(origin, point, solids)) return
    previous[index] = parent
    queue.push(index)
  }
  const column = Math.round(from.x / spacing)
  const row = Math.round(from.y / spacing)
  add(column, row, from, -1)
  for (const [x, y] of offsets) add(column + x, row + y, from, -1)

  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]
    const point = cell(index)
    if (Math.abs(point.x - to.x) <= 2 * spacing && Math.abs(point.y - to.y) <= 2 * spacing &&
        clearSegment(point, to, solids)) {
      const path = [to]
      for (let cursor = index; cursor >= 0; cursor = previous[cursor]) path.push(cell(cursor))
      path.reverse()
      // Skip redundant waypoints while preserving a collision-free segment.
      const route: Point[] = []
      let origin = from
      for (let step = 0; step < path.length; step++) {
        if (step + 1 < path.length && clearSegment(origin, path[step + 1], solids)) continue
        origin = path[step]
        route.push(origin)
      }
      return route
    }
    for (const [x, y] of offsets) add(index % columns + x, Math.floor(index / columns) + y, point, index)
  }
  return null
}
