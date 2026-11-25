import { describe, expect, it } from 'vitest'
import { readBedroom } from './bedroom'
import { canStand, movement, moveInRoom, nearbyInteraction } from './room'
import source from '../game/maps/bedroom.tmj?raw'

const bedroom = readBedroom(JSON.parse(source))

describe('room rules', () => {
  it('normalizes diagonals and cancels opposing input', () => {
    const diagonal = movement(new Set(['right', 'up']))
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1)
    expect(diagonal.x).toBeGreaterThan(0)
    expect(diagonal.y).toBeLessThan(0)
    expect(movement(new Set(['right', 'left', 'down']))).toEqual({ x: 0, y: 1 })
  })

  it('blocks the avatar footprint and slides along a solid object', () => {
    const solids = [{ x: 10, y: 0, width: 10, height: 20 }]
    expect(canStand({ x: 5, y: 10 }, solids)).toBe(true)
    expect(canStand({ x: 6, y: 10 }, solids)).toBe(false)
    expect(moveInRoom({ x: 5, y: 10 }, { x: 2, y: 2 }, solids)).toEqual({ x: 5, y: 12 })
  })

  it('chooses only an interaction in range and includes the exact boundary', () => {
    const [clothes] = bedroom.anchors
    expect(nearbyInteraction(bedroom.spawn, bedroom.anchors)).toBeNull()
    expect(nearbyInteraction({ x: clothes.x + clothes.radius, y: clothes.y }, bedroom.anchors)).toBe(clothes.id)
    expect(nearbyInteraction({ x: clothes.x + clothes.radius + 0.1, y: clothes.y }, bedroom.anchors)).toBeNull()
  })

  it('chooses the nearest when two interaction ranges overlap', () => {
    expect(nearbyInteraction({ x: 4, y: 0 }, [
      { id: 'scattered-clothes', x: 0, y: 0, radius: 10 },
      { id: 'closed-door', x: 5, y: 0, radius: 10 },
    ])).toBe('closed-door')
  })
})

describe('bedroom map', () => {
  it('has a clear spawn, walls and solid furniture', () => {
    expect(canStand(bedroom.spawn, bedroom.solids)).toBe(true)
    expect(canStand({ x: 160, y: 26 }, bedroom.solids)).toBe(false)
    for (const item of bedroom.furniture.filter((item) => item.solid)) {
      expect(canStand(item.box, bedroom.solids)).toBe(false)
    }
    expect(bedroom.furniture.filter((item) => item.solid)).toHaveLength(3)
  })

  it('rejects an interaction anchor inside a wall', () => {
    const map = JSON.parse(source)
    map.layers.find((layer: { name: string }) => layer.name === 'Interactions').objects[0].y = 16
    expect(() => readBedroom(map)).toThrow('walkable closed-door anchor')
  })
})
