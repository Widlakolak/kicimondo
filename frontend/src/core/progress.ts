import { cats, contentVersion, isLocation, locations, quests, start, transitions, type Checkpoint, type Quest } from '../content/pack'
import { parseProfile, type Profile } from './profile'
import type { LocationMap } from './tiledMap'

type WorldObject = { location: Checkpoint['location']; object: string }
type TrustEvent = { cat: string; id: string }

export type Save = {
  schemaVersion: 2
  contentVersion: number
  profile: Profile
  checkpoint: Checkpoint
  completed: string[]
  rewards: { id: string; points: number }[]
  hidden: WorldObject[]
  restored: WorldObject[]
  trust: TrustEvent[]
}

export type SaveCommand =
  | { type: 'profile'; profile: Profile }
  | { type: 'complete'; quest: string }
  | { type: 'pet'; cat: string }
  | { type: 'transition'; location: Checkpoint['location']; interaction: string }

export function newSave(profile: Profile): Save {
  return { schemaVersion: 2, contentVersion, profile, checkpoint: start, completed: [], rewards: [], hidden: [], restored: [], trust: [] }
}

export const pointsOf = (save: Save) => save.rewards.reduce((points, reward) => points + reward.points, 0)
export const trustOf = (save: Save, cat: string) => save.trust.filter((event) => event.cat === cat).length
export const meetsGate = (points: number, minimum: number) => points >= minimum

function objectsFor(completed: readonly Quest[], type: Quest['effects'][number]['type']): WorldObject[] {
  return completed.flatMap(({ location, effects }) => effects.filter((effect) => effect.type === type)
    .map(({ object }) => ({ location, object })))
}

function restoredTrust(restored: readonly WorldObject[]): TrustEvent[] {
  return restored.flatMap(({ location, object }) => cats.filter((cat) => cat.location === location &&
    cat.attractions.some((spot) => spot.object === object)).map(({ id }) => ({ cat: id, id: 'restored:' + object })))
}

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

  if (command.type === 'pet') {
    const event = firstPet(command.cat)
    const known = cats.some((cat) => cat.id === event.cat && cat.location === save.checkpoint.location)
    const recorded = save.trust.some(({ cat, id }) => cat === event.cat && id === event.id)
    return known && !recorded ? { ...save, trust: [...save.trust, event] } : save
  }

  const quest = quests.find((entry) => entry.id === command.quest && entry.location === save.checkpoint.location)
  if (!quest || save.completed.includes(quest.id) || save.rewards.some(({ id }) => id === quest.reward.id)) return save
  const restored = objectsFor([quest], 'RESTORE_ATTRACTION')
  return {
    ...save,
    completed: [...save.completed, quest.id],
    rewards: [...save.rewards, quest.reward],
    hidden: [...save.hidden, ...objectsFor([quest], 'HIDE_OBJECT')],
    restored: [...save.restored, ...restored],
    trust: [...save.trust, ...restoredTrust(restored)],
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function isIncompatibleSave(raw: unknown): boolean {
  const data = record(raw)
  if (!data || (data.schemaVersion === 1 && data.contentVersion === 1)) return false
  return (typeof data.schemaVersion === 'number' && data.schemaVersion !== 2) ||
    (typeof data.contentVersion === 'number' && data.contentVersion !== contentVersion)
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
  const legacy = stored.schemaVersion === 1 && stored.contentVersion === 1
  // Stage 02 stored no attractions or trust. Keep its existing arrays and checkpoint intact.
  const data = legacy ? { ...stored, schemaVersion: 2, contentVersion, restored: [], trust: [] } : stored
  if (data.schemaVersion !== 2 || data.contentVersion !== contentVersion) return null
  const profile = parseProfile(data.profile)
  if (!profile || !Array.isArray(data.completed) || new Set(data.completed).size !== data.completed.length) return null

  const completedIds: unknown[] = data.completed
  const completed = quests.filter(({ id }) => completedIds.includes(id))
  const rewards = completed.map(({ reward }) => reward)
  const hidden = objectsFor(completed, 'HIDE_OBJECT')
  const restored = objectsFor(completed, 'RESTORE_ATTRACTION')
  const trust = restoredTrust(restored)
  if (Array.isArray(data.trust)) {
    const recorded: unknown[] = data.trust
    for (const cat of cats) {
      if (recorded.some((value) => record(value)?.cat === cat.id && record(value)?.id === 'first-pet')) {
        trust.push(firstPet(cat.id))
      }
    }
  }
  if (completed.length !== completedIds.length || !sameEntries(data.rewards, rewards) ||
    !sameEntries(data.hidden, hidden) || !sameEntries(data.restored, restored) || !sameEntries(data.trust, trust)) return null

  const saved = record(data.checkpoint)
  const location = saved?.location
  const spawn = saved?.spawn
  const reachable = new Set<string>([start.location])
  let size = 0
  while (size !== reachable.size) {
    size = reachable.size
    const points = rewards.reduce((total, reward) => total + reward.points, 0)
    for (const edge of transitions) {
      if (reachable.has(edge.location) && meetsGate(points, edge.minimumPoints)) reachable.add(edge.target.location)
    }
  }
  const checkpoint = isLocation(location) && reachable.has(location)
    ? { location, spawn: typeof spawn === 'string' && maps[location].spawns.has(spawn) ? spawn : locations[location].entry }
    : start
  return { ...newSave(profile), checkpoint, completed: completed.map(({ id }) => id), rewards, hidden, restored, trust }
}
