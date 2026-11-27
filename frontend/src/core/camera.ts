import type { Box, Point } from './room'

export type Viewport = Pick<Box, 'width' | 'height'>

// A 16:9 surface has a 384 × 216 field of view. Narrower surfaces keep
// the same vertical detail, with a sprite scale floor on short phones.
export function cameraViewport(surface: Viewport): Viewport {
  const scale = Math.max(1.35, surface.height / 216, surface.width / 480)
  return {
    width: Math.max(1, Math.round(surface.width / scale)),
    height: Math.max(1, Math.round(surface.height / scale)),
  }
}

function scrollAxis(position: number, extent: number, visible: number, current?: number) {
  if (extent <= visible) return (extent - visible) / 2
  const half = visible / 2
  const dead = Math.min(24, half / 3)
  const left = current === undefined ? position - half :
    Math.max(position - half - dead, Math.min(current, position - half + dead))
  return Math.max(0, Math.min(extent - visible, left))
}

export function cameraScroll(position: Point, world: Viewport, view: Viewport, current?: Point): Point {
  return {
    x: scrollAxis(position.x, world.width, view.width, current?.x),
    y: scrollAxis(position.y, world.height, view.height, current?.y),
  }
}

export function canvasToWorld(client: Point, canvas: Box, visible: Box): Point {
  return {
    x: visible.x + (client.x - canvas.x) * visible.width / canvas.width,
    y: visible.y + (client.y - canvas.y) * visible.height / canvas.height,
  }
}
