import { expect, it } from 'vitest'
import { RoomInput } from './RoomInput'

it('tracks separate input sources and clears movement and interaction when paused', () => {
  const input = new RoomInput()
  input.hold('KeyD', 'right')
  input.hold('pointer:1', 'right')
  input.release('KeyD')
  expect(input.direction()).toEqual({ x: 1, y: 0 })
  input.requestInteraction()
  expect(input.takeInteraction()).toBe(true)
  expect(input.takeInteraction()).toBe(false)

  input.requestInteraction()
  input.setPaused(true)
  input.hold('KeyW', 'up')
  input.requestInteraction()
  expect(input.direction()).toEqual({ x: 0, y: 0 })
  expect(input.takeInteraction()).toBe(false)

  input.setPaused(false)
  input.hold('KeyW', 'up')
  expect(input.direction()).toEqual({ x: 0, y: -1 })
  input.clear()
  expect(input.direction()).toEqual({ x: 0, y: 0 })
})

it('clears input on backgrounding without lifting an existing pause on return', () => {
  const input = new RoomInput()
  input.hold('keyboard', 'up')
  input.requestInteraction()
  input.setPaused(true)
  input.setBackgrounded(true)
  input.setBackgrounded(false)
  expect(input.isPaused()).toBe(true)
  expect(input.takeInteraction()).toBe(false)
  input.setPaused(false)
  expect(input.direction()).toEqual({ x: 0, y: 0 })
  input.setBackgrounded(true)
  input.hold('touch', 'right')
  expect(input.isPaused()).toBe(true)
  expect(input.direction()).toEqual({ x: 0, y: 0 })
})
