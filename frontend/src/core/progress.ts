import { contentVersion, isLocation, locations, quests, start, transitions, type Checkpoint } from '../content/pack'
import { parseProfile, type Profile } from './profile'
import type { LocationMap } from './tiledMap'

export type Save = {
  schemaVersion: 1
  contentVersion: number
  profile: Profile
  checkpoint: Checkpoint
  completed: string[]
  rewards: { id: string; points: number }[]
  hidden: { location: Checkpoint['location']; object: string }[]
}

export type SaveCommand =
  | { type: 'profile'; profile: Profile }
  | { type: 'complete'; quest: string }
  | { type: 'transition'; location: Checkpoint['location']; interaction: string }

export function newSave(profile: Profile): Save {
  return { schemaVersion: 1, contentVersion, profile, checkpoint: start, completed: [], rewards: [], hidden: [] }
}

export const pointsOf = (save: Save) => save.rewards.reduce((points, reward) => points + reward.points, 0)
export const meetsGate = (points: number, minimum: number) => points >= minimum

export function applyCommand(save: Save | null, command: SaveCommand): Save | null {
  if (command.type === 'profile') return save ? { ...save, profile: command.profile } : newSave(command.profile)
  if (!save) return null
  if (command.type === 'transition') {
    const edge = transitions.find(({ location, interaction }) =>
      location === save.checkpoint.location && location === command.location && interaction === command.interaction)
    return edge && meetsGate(pointsOf(save), edge.minimumPoints) ? { ...save, checkpoint: edge.target } : save
  }

  const quest = quests.find((entry) => entry.id === command.quest && entry.location === save.checkpoint.location)
  if (!quest || save.completed.includes(quest.id) || save.rewards.some(({ id }) => id === quest.reward.id)) return save
  return {
    ...save,
    completed: [...save.completed, quest.id],
    rewards: [...save.rewards, quest.reward],
    hidden: [...save.hidden, ...quest.effects.map(({ object }) => ({ location: quest.location, object }))],
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function isIncompatibleSave(raw: unknown): boolean {
  const data = record(raw)
  return !!data && ((typeof data.schemaVersion === 'number' && data.schemaVersion !== 1) ||
    (typeof data.contentVersion === 'number' && data.contentVersion !== contentVersion))
}

export function decodeSave(raw: unknown, maps: Record<Checkpoint['location'], LocationMap>): Save | null {
  const data = record(raw)
  if (!data || data.schemaVersion !== 1 || data.contentVersion !== contentVersion) return null
  const profile = parseProfile(data.profile)
  if (!profile || !Array.isArray(data.completed) || !Array.isArray(data.rewards) || !Array.isArray(data.hidden) ||
      new Set(data.completed).size !== data.completed.length) return null

  const completedIds: unknown[] = data.completed
  const completed = quests.filter(({ id }) => completedIds.includes(id))
  const rewards = completed.map(({ reward }) => reward)
  const hidden = completed.flatMap(({ location, effects }) => effects.map(({ object }) => ({ location, object })))
  const storedRewards: unknown[] = data.rewards
  const storedHidden: unknown[] = data.hidden
  if (completed.length !== data.completed.length || rewards.length !== storedRewards.length ||
      hidden.length !== storedHidden.length || !rewards.every((reward) => storedRewards.some((stored) => {
        const item = record(stored)
        return item?.id === reward.id && item.points === reward.points
      })) || !hidden.every((effect) => storedHidden.some((stored) => {
        const item = record(stored)
        return item?.location === effect.location && item.object === effect.object
      }))) return null

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
  return { ...newSave(profile), checkpoint, completed: completed.map(({ id }) => id), rewards, hidden }
}
