import { expect, it } from 'vitest'
import { attractions, type CatId } from '../content/catCatalog'
import { maps } from '../content/world'
import { canPet, startCat, stepCat } from './cat'
import { CatPopulation } from './catPopulation'
import { canObserve, recordDiscovery } from './discovery'
import { eligibleCats, rotationInterval, VisitorRotation, visitorCapacity } from './habitat'
import { canStand } from './room'
import { solidsFor } from './tiledMap'

const gardenSpots = attractions.filter(({ location }) => location === 'garden').map(({ object }) => object)
const visitorIds = ['puszek', 'latka', 'cien', 'migotka'] as const

it('requires all restored tags in the correct habitat', () => {
  const ids = (restored: string[]) => eligibleCats('garden', restored).map(({ id }) => id)
  expect(ids([])).toEqual([])
  expect(ids(['water-bowl', 'garden-bed'])).toEqual([])
  expect(ids(['garden-water', 'garden-bed'])).toEqual(['puszek'])
  expect(ids(['garden-shelter', 'garden-water'])).toEqual(['cien'])
  expect(ids(gardenSpots)).toEqual(visitorIds)
  expect(eligibleCats('bedroom', []).map(({ id }) => id)).toEqual(['amber'])
  expect(eligibleCats('hall', gardenSpots)).toEqual([])
})

it('rotates four eligible cats deterministically within the bound and protects a petting visitor', () => {
  const rotation = new VisitorRotation()
  const petting = (id: CatId) => id === 'puszek'
  const first = rotation.step(visitorIds, 0, false, petting)
  expect(first).toEqual(['puszek', 'latka', 'cien'])
  expect(rotation.step(visitorIds, 60000, true, petting)).toBe(first)
  expect(rotation.step(visitorIds, rotationInterval - 1, false, petting)).toBe(first)
  const next = rotation.step(visitorIds, 1, false, petting)
  expect(next).toEqual(['puszek', 'cien', 'migotka'])
  expect(new Set([...first, ...next]).size).toBe(4)
  expect(rotation.step(visitorIds, rotationInterval, false, () => false)).toEqual(['cien', 'migotka', 'latka'])
})

it('reserves one cat per spot in transit and at rest, and runs only on active frames', () => {
  const population = new CatPopulation('garden')
  const solids = solidsFor(maps.garden)
  population.setRestored(gardenSpots)
  population.step(40, solids, false)
  const initial = Array.from(population.members, ({ state }) => state)
  population.step(40000, solids, true)
  expect(Array.from(population.members, ({ state }) => state)).toEqual(initial)
  expect(population.pet('migotka')).toBe(false)
  expect(population.pet('puszek')).toBe(true)
  expect(population.pet('puszek')).toBe(false)

  const observed = new Set<CatId>()
  const activities = new Set<string>()
  for (let frame = 0; frame < 1500; frame++) {
    population.step(40, solids, false)
    expect(population.visitorIds.length).toBeLessThanOrEqual(visitorCapacity)
    const occupied: string[] = []
    for (const { definition, state } of population.members) {
      observed.add(definition.id)
      activities.add(state.activity)
      if (state.spot) occupied.push(state.spot)
      expect(canStand(state.position, solids)).toBe(true)
    }
    expect(new Set(occupied).size).toBe(occupied.length)
  }
  expect([...observed].sort()).toEqual([...visitorIds].sort())
  expect(activities).toEqual(new Set(['idle', 'petting', 'walking', 'resting', 'drinking', 'playing']))
})

it('chooses an available preferred spot and falls back to its own resting point when both are busy', () => {
  const cat = eligibleCats('garden', gardenSpots).find(({ id }) => id === 'puszek')!
  const state = { ...startCat(cat), elapsed: 5000 }
  const solids = solidsFor(maps.garden)
  const occupied = new Map<string, CatId>([['garden-water', 'cien']])
  const alternative = stepCat(state, cat, 40, gardenSpots, solids, false, occupied)
  expect(alternative.spot).toBe('garden-bed')
  occupied.set('garden-bed', 'migotka')
  const fallback = stepCat(state, cat, 40, gardenSpots, solids, false, occupied)
  expect(fallback.spot).toBeNull()
  expect(fallback.destination?.position).toEqual(cat.rest)
  expect(canPet(fallback)).toBe(false)
})

it('records discovery idempotently only after a usable observation', () => {
  const avatar = { x: 50, y: 50 }
  const cat = { x: 75, y: 50 }
  expect(canObserve(avatar, cat, [])).toBe(true)
  expect(canObserve(avatar, { x: 81, y: 50 }, [])).toBe(false)
  expect(canObserve(avatar, cat, [{ x: 62, y: 32, width: 2, height: 50 }])).toBe(false)
  const discovered = recordDiscovery([], 'latka')
  expect(recordDiscovery(discovered, 'latka')).toBe(discovered)
  expect(recordDiscovery(discovered, 'cien')).toEqual(['latka', 'cien'])
})
