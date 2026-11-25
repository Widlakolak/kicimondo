import { expect, it } from 'vitest'
import { cats } from '../content/pack'
import { maps } from '../content/world'
import { canPet, clearCatRoute, petCat, startCat, stepCat } from './cat'
import { canStand } from './room'
import { solidsFor } from './tiledMap'

const cat = cats[0]
const solids = solidsFor(maps.bedroom)
const ticks = (restored: string[]) => {
  let state = startCat(cat)
  return Array.from({ length: 500 }, () => {
    state = stepCat(state, cat, 40, restored, solids, false)
    return state
  })
}

it('moves along deterministic clear routes and rests without requiring an attraction', () => {
  const states = ticks([])
  expect(states).toEqual(ticks([]))
  expect(states.some(({ activity }) => activity === 'walking')).toBe(true)
  expect(states.some(({ activity, position }) => activity === 'resting' && position.x === cat.rest.x)).toBe(true)
  expect(states.some(({ activity }) => activity === 'drinking')).toBe(false)
  expect(states.every(({ position }) => canStand(position, solids))).toBe(true)
  expect(clearCatRoute(cat.greet, { x: 46, y: 123 }, solids)).toBe(false)
  expect(clearCatRoute(cat.greet, { x: 316, y: 188 }, solids)).toBe(false)
})

it('visits water and bedding on separate turns once restored during active play', () => {
  const states = ticks(['water-bowl', 'cat-bed'])
  for (const { activity, position } of cat.attractions) {
    expect(states.some((state) => state.activity === activity &&
      Math.hypot(state.position.x - position.x, state.position.y - position.y) < 0.001)).toBe(true)
  }
  expect(ticks(['cat-bed']).some(({ activity }) => activity === 'drinking')).toBe(false)
})

it('pauses its clock and refuses petting while busy', () => {
  const idle = startCat(cat)
  const walking = ticks([]).find(({ activity }) => activity === 'walking')!
  expect(stepCat(walking, cat, 60000, [], solids, true)).toBe(walking)
  expect(canPet(walking)).toBe(false)
  expect(petCat(walking)).toBe(walking)
  expect(canPet(idle)).toBe(true)
  const petting = petCat(idle)
  expect(petting.activity).toBe('petting')
  expect(petCat(petting)).toBe(petting)
  expect(stepCat(petting, cat, 40, [], solids, true)).toBe(petting)
})
