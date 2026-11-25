import type { CatId } from '../content/catCatalog.ts'
import { clearCatRoute } from './cat.ts'
import type { Box, Point } from './room.ts'

export function canObserve(player: Point, cat: Point, solids: readonly Box[]) {
  return (player.x - cat.x) ** 2 + (player.y - cat.y) ** 2 <= 30 ** 2 && clearCatRoute(player, cat, solids)
}

export function recordDiscovery(discovered: CatId[], cat: CatId): CatId[] {
  return discovered.includes(cat) ? discovered : [...discovered, cat]
}
