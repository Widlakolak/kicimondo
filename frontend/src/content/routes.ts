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

export function nextQuestExit(location: LocationId, remaining: ReadonlySet<LocationId>, points: number,
  previousRoom?: LocationId): string | null {
  const seen = new Set([location])
  const queue: { room: LocationId; exit: string | null }[] = [{ room: location, exit: null }]
  for (const { room, exit } of queue) {
    if (remaining.has(room)) return exit
    const exits = transitions.filter((edge) => edge.location === room && edge.minimumPoints <= points)
    if (room === location && previousRoom) {
      exits.sort((a, b) => Number(a.target.location === previousRoom) - Number(b.target.location === previousRoom))
    }
    for (const edge of exits) {
      if (seen.has(edge.target.location)) continue
      seen.add(edge.target.location)
      queue.push({ room: edge.target.location, exit: exit ?? edge.interaction })
    }
  }
  return null
}
