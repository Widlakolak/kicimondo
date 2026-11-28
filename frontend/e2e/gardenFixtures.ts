import { quests, transitions, type LocationId, type Quest, type Transition } from '../src/content/pack'
import { applyCommand, newSave, pointsOf, type Save } from '../src/core/progress'

export function travel(save: Save, target: LocationId): Save {
  const queue: { location: LocationId; path: Transition[] }[] = [{ location: save.checkpoint.location, path: [] }]
  const seen = new Set<LocationId>([save.checkpoint.location])
  const points = pointsOf(save)
  for (const { location, path } of queue) {
    if (location === target) {
      return path.reduce((current, edge) => applyCommand(current, {
        type: 'transition', location: edge.location, interaction: edge.interaction,
      })!, save)
    }
    for (const edge of transitions) {
      if (edge.location !== location || points < edge.minimumPoints || seen.has(edge.target.location)) continue
      seen.add(edge.target.location)
      queue.push({ location: edge.target.location, path: [...path, edge] })
    }
  }
  throw new Error('Cannot reach ' + target)
}

export function earn(save: Save, allowed: (quest: Quest) => boolean): Save {
  for (const quest of quests.filter(allowed)) {
    // The catalog lists earlier quests first. The new bedroom/study/etc. quests can be done on a return trip.
    save = travel(save, quest.location)
    const next = applyCommand(save, { type: 'complete', quest: quest.id })!
    if (next === save) throw new Error('Cannot complete ' + quest.id)
    save = next
  }
  return save
}

export function fromHouse(contentV3 = false): Save {
  const initial = newSave({ avatar: 'girl', nickname: 'Żółwik' })
  const greeted = applyCommand(initial, { type: 'pet', cat: 'amber' })!
  return travel(earn(greeted, (quest) => contentV3 ? quest.introduced <= 3 :
    quest.introduced <= 4 && quest.location !== 'garden' && quest.id !== 'bedroom-read-desk-words' &&
    quest.id !== 'living-match-living-items'), 'hall')
}

// The previous client persisted schema 2/content 3, with no discoveries field.
export function stage05Record() {
  const { profile, checkpoint, completed, rewards, hidden, restored, trust } = fromHouse(true)
  return { schemaVersion: 2, contentVersion: 3, profile, checkpoint, completed, rewards, hidden, restored, trust }
}
