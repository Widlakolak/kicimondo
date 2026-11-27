import { expect, it } from 'vitest'
import { maps } from '../content/world'
import { clearSegment, routeTo } from './navigation'
import { solidsFor } from './tiledMap'

it('routes around furniture and rejects diagonal corner cuts and sealed destinations', () => {
  const world = { width: 144, height: 112 }
  const furniture = { x: 56, y: 18, width: 28, height: 50 }
  const from = { x: 27, y: 61 }
  const to = { x: 120, y: 58 }
  expect(clearSegment(from, to, [furniture])).toBe(false)
  expect(clearSegment({ x: 48, y: 69 }, { x: 56, y: 72 }, [furniture])).toBe(false)
  const route = routeTo(from, to, world, [furniture])!
  expect(route.length).toBeGreaterThan(1)
  expect(route.at(-1)).toEqual(to)
  let previous = from
  for (const point of route) {
    expect(clearSegment(previous, point, [furniture])).toBe(true)
    previous = point
  }
  expect(routeTo(from, { x: 70, y: 40 }, world, [furniture])).toBeNull()
  expect(routeTo(from, to, world, [{ ...furniture, y: 0, height: world.height }])).toBeNull()
})

it('routes to every interaction anchor from every spawn in the shipped maps', () => {
  for (const [location, map] of Object.entries(maps)) {
    const solids = solidsFor(map)
    for (const spawn of map.spawns.values()) {
      for (const { id, x, y } of map.anchors) {
        expect(routeTo(spawn, { x, y }, map, solids), `${location} → ${id}`).not.toBeNull()
      }
    }
  }
})
