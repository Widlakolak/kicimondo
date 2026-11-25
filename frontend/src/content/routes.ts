import { start, transitions, type LocationId, type Transition } from './pack.ts'

export function reachableLocations(
  points: number | ((reachable: ReadonlySet<LocationId>) => number),
  edges: readonly Transition[] = transitions,
): Set<LocationId> {
  const reachable = new Set<LocationId>([start.location])
  let size = 0
  while (size !== reachable.size) {
    size = reachable.size
    const total = typeof points === 'number' ? points : points(reachable)
    for (const edge of edges) {
      if (reachable.has(edge.location) && edge.minimumPoints <= total) reachable.add(edge.target.location)
    }
  }
  return reachable
}
