import type { FurnitureArt } from '../core/tiledMap.ts'
import type { Point } from '../core/room.ts'
import type { pl } from '../i18n/pl.ts'
import type { LocationId } from './pack.ts'

export type CatId = keyof typeof pl.cat.names
export type HabitatTag = keyof typeof pl.attractions
export type Attraction = {
  location: LocationId
  object: string
  art: FurnitureArt
  tag: HabitatTag
  position: Point
  activity: 'drinking' | 'resting' | 'playing'
}
export type CatAppearance = {
  coat: number
  markings: number
  muzzle: number
  shape: 'tabby' | 'fluffy' | 'patched' | 'slender' | 'bright' | 'spark'
}
export type CatDefinition = {
  id: CatId
  location: LocationId
  greet: Point
  rest: Point
  roam?: readonly Point[]
  appearance: CatAppearance
  attractions: readonly Attraction[]
  requires?: readonly HabitatTag[]
  female?: boolean
  pace?: { speed: number; idleMs: number }
}

function spot(location: LocationId, object: string, tag: HabitatTag, art: FurnitureArt, x: number, y: number, activity: Attraction['activity']): Attraction {
  return { location, object, tag, art, position: { x, y }, activity }
}

const bedroomSpots = [
  spot('bedroom', 'water-bowl', 'water', 'bowl', 210, 188, 'drinking'),
  spot('bedroom', 'cat-bed', 'bedding', 'cat-bed', 255, 188, 'resting'),
]

const gardenSpots = [
  spot('garden', 'garden-water', 'water', 'garden-bowl', 50, 81, 'drinking'),
  spot('garden', 'garden-bed', 'bedding', 'garden-bed', 120, 81, 'resting'),
  spot('garden', 'garden-post', 'scratch', 'garden-post', 200, 81, 'playing'),
  spot('garden', 'garden-tunnel', 'tunnel', 'garden-tunnel', 270, 81, 'playing'),
  spot('garden', 'garden-toys', 'toys', 'garden-toys', 50, 160, 'playing'),
  spot('garden', 'garden-platform', 'platform', 'garden-platform', 120, 160, 'resting'),
  spot('garden', 'garden-shelter', 'shelter', 'garden-shelter', 200, 160, 'resting'),
  spot('garden', 'garden-flowers', 'flowers', 'garden-flowers', 270, 160, 'resting'),
]
const workshopSpots = [
  spot('workshop', 'cardboard-hideout', 'workshop-hideout', 'cardboard-hideout', 66, 100, 'resting'),
  spot('workshop', 'resting-mat', 'workshop-mat', 'resting-mat', 375, 92, 'resting'),
  spot('workshop', 'felt-ball', 'workshop-ball', 'felt-ball', 221, 86, 'playing'),
]
export const attractions: readonly Attraction[] = [...bedroomSpots, ...gardenSpots, ...workshopSpots]

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
    roam: [{ x: 92, y: 190 }, { x: 164, y: 114 }, { x: 268, y: 130 }, { x: 216, y: 214 }],
    appearance: { coat: 0xd78a4f, markings: 0xa75c39, muzzle: 0xf3c993, shape: 'tabby' },
    attractions: bedroomSpots,
  },
  visitor('puszek', 76, { coat: 0xebe0cb, markings: 0xa898a1, muzzle: 0xfff3dc, shape: 'fluffy' }, ['water', 'bedding'], 43, 4700),
  visitor('latka', 132, { coat: 0xe7c2a0, markings: 0x8e594b, muzzle: 0xffe5c5, shape: 'patched' }, ['scratch', 'tunnel'], 52, 4300, true),
  visitor('cien', 188, { coat: 0x66677b, markings: 0x414353, muzzle: 0xbab7c5, shape: 'slender' }, ['shelter', 'water'], 41, 4900),
  visitor('migotka', 244, { coat: 0x96a5aa, markings: 0x576f87, muzzle: 0xd4e0d9, shape: 'bright' }, ['platform', 'toys'], 56, 4200, true),
  {
    id: 'sparkle', location: 'workshop', greet: { x: 254, y: 148 }, rest: { x: 278, y: 183 },
    roam: [{ x: 150, y: 155 }, { x: 88, y: 130 }, { x: 330, y: 167 }],
    appearance: { coat: 0xc48282, markings: 0x754c6a, muzzle: 0xffdfab, shape: 'spark' },
    attractions: workshopSpots, female: true, pace: { speed: 53, idleMs: 2600 },
  },
]
