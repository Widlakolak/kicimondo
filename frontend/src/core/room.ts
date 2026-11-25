export type Point = { x: number; y: number }
export type Box = Point & { width: number; height: number }

export type InteractionId = string
export type Anchor = Point & { id: InteractionId; radius: number }

export type Direction = 'up' | 'down' | 'left' | 'right'

export function movement(held: ReadonlySet<Direction>): Point {
  const x = Number(held.has('right')) - Number(held.has('left'))
  const y = Number(held.has('down')) - Number(held.has('up'))
  const length = Math.hypot(x, y) || 1
  return { x: x / length, y: y / length }
}

// The collision footprint is centered on the avatar's feet.
export function canStand({ x, y }: Point, solids: readonly Box[]): boolean {
  return !solids.some((box) =>
    x + 5 > box.x && x - 5 < box.x + box.width &&
    y + 3 > box.y && y - 3 < box.y + box.height,
  )
}

export function moveInRoom(position: Point, delta: Point, solids: readonly Box[]): Point {
  const horizontal = { x: position.x + delta.x, y: position.y }
  const x = canStand(horizontal, solids) ? horizontal.x : position.x
  const vertical = { x, y: position.y + delta.y }
  return canStand(vertical, solids) ? vertical : { x, y: position.y }
}

export function nearbyInteraction(position: Point, anchors: readonly Anchor[]): InteractionId | null {
  let nearest: InteractionId | null = null
  let closest = Infinity
  for (const anchor of anchors) {
    const distance = Math.hypot(position.x - anchor.x, position.y - anchor.y)
    if (distance <= anchor.radius && distance < closest) {
      nearest = anchor.id
      closest = distance
    }
  }
  return nearest
}
