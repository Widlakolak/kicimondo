import type { Point } from '../core/room.ts'
import type { pl } from '../i18n/pl.ts'
import type { LocationId } from './pack.ts'

export type CatId = keyof typeof pl.cat.names
export type HabitatTag = keyof typeof pl.attractions
export type Attraction = {
  location: LocationId
  object: string
  tag: HabitatTag
  position: Point
  activity: 'drinking' | 'resting' | 'playing'
}
export type CatAppearance = {
  coat: number
  markings: number
  muzzle: number
  shape: 'tabby' | 'fluffy' | 'patched' | 'slender' | 'bright'
}
export type CatDefinition = {
  id: CatId
  location: LocationId
  greet: Point
  rest: Point
  appearance: CatAppearance
  attractions: readonly Attraction[]
  requires?: readonly HabitatTag[]
  female?: boolean
  pace?: { speed: number; idleMs: number }
}

function spot(location: LocationId, object: string, tag: HabitatTag, x: number, y: number, activity: Attraction['activity']): Attraction {
  return { location, object, tag, position: { x, y }, activity }
}

const bedroomSpots = [
  spot('bedroom', 'water-bowl', 'water', 210, 188, 'drinking'),
  spot('bedroom', 'cat-bed', 'bedding', 255, 188, 'resting'),
]

const gardenSpots = [
  spot('garden', 'garden-water', 'water', 50, 81, 'drinking'),
  spot('garden', 'garden-bed', 'bedding', 120, 81, 'resting'),
  spot('garden', 'garden-post', 'scratch', 200, 81, 'playing'),
  spot('garden', 'garden-tunnel', 'tunnel', 270, 81, 'playing'),
  spot('garden', 'garden-toys', 'toys', 50, 160, 'playing'),
  spot('garden', 'garden-platform', 'platform', 120, 160, 'resting'),
  spot('garden', 'garden-shelter', 'shelter', 200, 160, 'resting'),
  spot('garden', 'garden-flowers', 'flowers', 270, 160, 'resting'),
]
export const attractions: readonly Attraction[] = [...bedroomSpots, ...gardenSpots]

function visitor(id: CatId, x: number, appearance: CatAppearance, requires: readonly HabitatTag[],
  speed: number, idleMs: number, female = false): CatDefinition {
  return {
    id, location: 'garden', greet: { x, y: 121 }, rest: { x, y: 138 }, appearance, requires, female,
    attractions: gardenSpots.filter(({ tag }) => requires.includes(tag)),
    pace: { speed, idleMs },
  }
}

export const cats: readonly CatDefinition[] = [
  {
    id: 'amber', location: 'bedroom', greet: { x: 124, y: 188 }, rest: { x: 148, y: 188 },
    appearance: { coat: 0xd78a4f, markings: 0xa75c39, muzzle: 0xf3c993, shape: 'tabby' },
    attractions: bedroomSpots,
  },
  visitor('puszek', 76, { coat: 0xebe0cb, markings: 0xa898a1, muzzle: 0xfff3dc, shape: 'fluffy' }, ['water', 'bedding'], 43, 4700),
  visitor('latka', 132, { coat: 0xe7c2a0, markings: 0x8e594b, muzzle: 0xffe5c5, shape: 'patched' }, ['scratch', 'tunnel'], 52, 4300, true),
  visitor('cien', 188, { coat: 0x66677b, markings: 0x414353, muzzle: 0xbab7c5, shape: 'slender' }, ['shelter', 'water'], 41, 4900),
  visitor('migotka', 244, { coat: 0x96a5aa, markings: 0x576f87, muzzle: 0xd4e0d9, shape: 'bright' }, ['platform', 'toys'], 56, 4200, true),
]
