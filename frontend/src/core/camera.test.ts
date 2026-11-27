import { expect, it } from 'vitest'
import { cameraScroll, cameraViewport, canvasToWorld } from './camera'

it('keeps a 216-pixel vertical view at the fullscreen reference size and crops on narrower surfaces', () => {
  expect(cameraViewport({ width: 1920, height: 1080 })).toEqual({ width: 384, height: 216 })
  expect(cameraViewport({ width: 640, height: 360 })).toEqual({ width: 384, height: 216 })
  expect(cameraViewport({ width: 420, height: 360 })).toEqual({ width: 252, height: 216 })
  expect(cameraViewport({ width: 300, height: 140 })).toEqual({ width: 222, height: 104 })
})

it('follows outside the dead zone, clamps inside the map and centres smaller axes', () => {
  const world = { width: 560, height: 192 }
  const view = { width: 320, height: 216 }
  const start = cameraScroll({ x: 200, y: 100 }, world, view)
  expect(start).toEqual({ x: 40, y: -12 })
  expect(cameraScroll({ x: 220, y: 110 }, world, view, start)).toEqual(start)
  expect(cameraScroll({ x: 245, y: 100 }, world, view, start)).toEqual({ x: 61, y: -12 })
  expect(cameraScroll({ x: 550, y: 100 }, world, view, start)).toEqual({ x: 240, y: -12 })
  expect(cameraScroll({ x: 10, y: 100 }, world, view, start)).toEqual({ x: 0, y: -12 })
})

it('translates the same world point at different canvas sizes and signed camera offsets', () => {
  expect(canvasToWorld({ x: 340, y: 170 }, { x: 20, y: 20, width: 640, height: 360 },
    { x: 55, y: -18, width: 320, height: 180 })).toEqual({ x: 215, y: 57 })
  expect(canvasToWorld({ x: 460, y: 350 }, { x: 60, y: 50, width: 800, height: 480 },
    { x: -35, y: -63, width: 500, height: 192 })).toEqual({ x: 215, y: 57 })
})
