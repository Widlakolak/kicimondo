import { cats, contentVersion, isLocation, locationIds, locations, quests, start, transitions, type Checkpoint, type Quest } from '../content/pack'
import { kitStatus, obtainableQuests, recipeFor } from '../content/crafting'
import type { CatId } from '../content/catCatalog'
import { recordDiscovery } from './discovery'
import { eligibleCats } from './habitat'
import { reachableLocations } from '../content/routes'
import { parseProfile, type Profile } from './profile'
import type { LocationMap } from './tiledMap'

type WorldObject = { location: Checkpoint['location']; object: string }
type TrustEvent = { cat: string; id: string }

export type Save = {
  schemaVersion: 3
  contentVersion: number
  profile: Profile
  checkpoint: Checkpoint
  completed: string[]
  rewards: { id: string; points: number }[]
  hidden: WorldObject[]
  restored: WorldObject[]
  trust: TrustEvent[]
  discovered: CatId[]
}

export type SaveCommand =
  | { type: 'profile'; profile: Profile }
  | { type: 'complete'; quest: string }
  | { type: 'pet'; cat: string }
  | { type: 'discover'; cat: CatId }
  | { type: 'transition'; location: Checkpoint['location']; interaction: string }

export function newSave(profile: Profile): Save {
  return { schemaVersion: 3, contentVersion, profile, checkpoint: start, completed: [], rewards: [],
    hidden: [], restored: [], trust: [], discovered: [] }
}

export const pointsOf = (save: Save) => save.rewards.reduce((points, reward) => points + reward.points, 0)
export const trustOf = (save: Save, cat: string) => save.trust.filter((event) => event.cat === cat).length
export const meetsGate = (points: number, minimum: number) => points >= minimum

function objectsFor(completed: readonly Quest[], types: readonly Quest['effects'][number]['type'][]): WorldObject[] {
  return completed.flatMap(({ location, effects }) => effects.filter((effect) => types.includes(effect.type))
    .map(({ object }) => ({ location, object })))
}

function restoredIn(restored: readonly WorldObject[], location: Checkpoint['location']): string[] {
  return restored.filter((prop) => prop.location === location).map(({ object }) => object)
}

function restoredTrust(restored: readonly WorldObject[]): TrustEvent[] {
  const resident = restored.flatMap(({ location, object }) => cats.filter((cat) => !cat.requires &&
    cat.location === location && cat.attractions.some((spot) => spot.object === object))
    .map(({ id }) => ({ cat: id, id: 'restored:' + object })))
  const visitors = locationIds.flatMap((location) => eligibleCats(location, restoredIn(restored, location)))
    .filter(({ requires }) => requires).map(({ id }) => ({ cat: id, id: 'habitat-ready' }))
  return [...resident, ...visitors]
}

const hasEvent = (events: readonly TrustEvent[], event: TrustEvent) =>
  events.some(({ cat, id }) => cat === event.cat && id === event.id)

function firstPet(cat: string): TrustEvent {
  return { cat, id: 'first-pet' }
}

export function applyCommand(save: Save | null, command: SaveCommand): Save | null {
  if (command.type === 'profile') return save ? { ...save, profile: command.profile } : newSave(command.profile)
  if (!save) return null
  if (command.type === 'transition') {
    const edge = transitions.find(({ location, interaction }) =>
      location === save.checkpoint.location && location === command.location && interaction === command.interaction)
    return edge && meetsGate(pointsOf(save), edge.minimumPoints) ? { ...save, checkpoint: edge.target } : save
  }

  if (command.type === 'discover' || command.type === 'pet') {
    // The scene submits these commands only after observing a present cat or accepting a greeting.
    const { location } = save.checkpoint
    const cat = eligibleCats(location, restoredIn(save.restored, location)).find(({ id }) => id === command.cat)
    if (!cat) return save
    const discovered = recordDiscovery(save.discovered, cat.id)
    const event = firstPet(cat.id)
    const trust = command.type === 'pet' && !hasEvent(save.trust, event) ? [...save.trust, event] : save.trust
    return discovered === save.discovered && trust === save.trust ? save : { ...save, discovered, trust }
  }

  const quest = quests.find((entry) => entry.id === command.quest && entry.location === save.checkpoint.location)
  if (!quest || save.completed.includes(quest.id) || save.rewards.some(({ id }) => id === quest.reward.id)) return save
  const recipe = recipeFor(quest.id)
  if (recipe && kitStatus(recipe, save.completed) !== 'available') return save
  const restored = [...save.restored, ...objectsFor([quest], ['RESTORE_ATTRACTION', 'ORGANIZE_OBJECT'])]
  const earnedTrust = restoredTrust(restored).filter((event) => !hasEvent(save.trust, event))
  return {
    ...save,
    completed: [...save.completed, quest.id],
    rewards: [...save.rewards, quest.reward],
    hidden: [...save.hidden, ...objectsFor([quest], ['HIDE_OBJECT'])],
    restored,
    trust: [...save.trust, ...earnedTrust],
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function saveContentVersion(value: Record<string, unknown>): Quest['introduced'] | null {
  if (value.schemaVersion === 1 && value.contentVersion === 1) return 1
  if (value.schemaVersion === 2 && (value.contentVersion === 2 || value.contentVersion === 3)) return value.contentVersion
  if (value.schemaVersion === 3 && (value.contentVersion === 4 || value.contentVersion === 5)) return value.contentVersion
  return null
}

export function isIncompatibleSave(raw: unknown): boolean {
  const data = record(raw)
  if (!data || saveContentVersion(data)) return false
  return (typeof data.schemaVersion === 'number' && ![1, 2, 3].includes(data.schemaVersion)) ||
    (typeof data.contentVersion === 'number' && ![1, 2, 3, 4, 5].includes(data.contentVersion)) ||
    (typeof data.schemaVersion === 'number' && typeof data.contentVersion === 'number')
}

function sameEntries(stored: unknown, expected: readonly Record<string, string | number>[]) {
  if (!Array.isArray(stored) || stored.length !== expected.length) return false
  const entries: unknown[] = stored
  return expected.every((entry) => entries.some((value) => {
    const candidate = record(value)
    return Object.entries(entry).every(([key, field]) => candidate?.[key] === field)
  }))
}

export function decodeSave(raw: unknown, maps: Record<Checkpoint['location'], LocationMap>): Save | null {
  const stored = record(raw)
  if (!stored) return null
  const version = saveContentVersion(stored)
  if (!version) return null
  // Stage 02 stored neither attractions nor trust.
  const data = version === 1 ? { ...stored, restored: [], trust: [] } : stored
  const profile = parseProfile(data.profile)
  if (!profile || !Array.isArray(data.completed) || new Set(data.completed).size !== data.completed.length) return null

  const completedIds: unknown[] = data.completed
  const completed = quests.filter(({ id, introduced }) => introduced <= version && completedIds.includes(id))
  const routes = transitions.filter(({ target }) => locations[target.location].introduced <= version)
  const reachable = reachableLocations((visited) => obtainableQuests(completed, visited).size, routes)
  if (obtainableQuests(completed, reachable).size !== completedIds.length) return null
  const rewards = completed.map(({ reward }) => reward)
  const hidden = objectsFor(completed, ['HIDE_OBJECT'])
  const restored = objectsFor(completed, ['RESTORE_ATTRACTION', 'ORGANIZE_OBJECT'])
  const trust = restoredTrust(restored)
  const visibleCats = [...reachable].flatMap((location) => eligibleCats(location, restoredIn(restored, location)))
  const petted = visibleCats.filter(({ id }) => Array.isArray(data.trust) &&
    (data.trust as unknown[]).some((value) => record(value)?.cat === id && record(value)?.id === 'first-pet'))
    .map(({ id }) => id)
  for (const id of petted) trust.push(firstPet(id))

  const discovered: CatId[] = []
  if (version >= 4) {
    if (!Array.isArray(data.discovered) || new Set(data.discovered).size !== data.discovered.length) return null
    for (const rawId of data.discovered as unknown[]) {
      const cat = visibleCats.find(({ id }) => id === rawId)
      if (!cat) return null
      discovered.push(cat.id)
    }
    if (petted.some((id) => !discovered.includes(id))) return null
  } else {
    // A previous accepted greeting proves that the resident has already been encountered.
    if (petted.includes('amber')) discovered.push('amber')
  }
  if (!sameEntries(data.rewards, rewards) ||
    !sameEntries(data.hidden, hidden) || !sameEntries(data.restored, restored) || !sameEntries(data.trust, trust)) return null

  const saved = record(data.checkpoint)
  const location = saved?.location
  const spawn = saved?.spawn
  const checkpoint = isLocation(location) && reachable.has(location)
    ? { location, spawn: typeof spawn === 'string' && maps[location].spawns.has(spawn) ? spawn : locations[location].entry }
    : start
  return { ...newSave(profile), checkpoint, completed: completed.map(({ id }) => id), rewards, hidden, restored, trust, discovered }
}
