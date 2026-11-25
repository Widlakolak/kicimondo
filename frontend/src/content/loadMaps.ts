import { readMap, type LocationMap } from '../core/tiledMap.ts'
import { locationIds, type LocationId } from './pack.ts'

export function loadMaps(source: (location: LocationId) => string): Record<LocationId, LocationMap> {
  return Object.fromEntries(locationIds.map((location) => {
    try {
      return [location, readMap(JSON.parse(source(location)))]
    } catch (error) {
      throw new Error('Could not load map for ' + location, { cause: error })
    }
  })) as Record<LocationId, LocationMap>
}
