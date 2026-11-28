import { expect, it } from 'vitest'
import { earn, fromHouse, stage05Record, travel } from '../../e2e/gardenFixtures'
import { quests } from '../content/pack'
import { reachableLocations } from '../content/routes'
import { maps } from '../content/world'
import { applyCommand, decodeSave, isIncompatibleSave, pointsOf, trustOf } from './progress'

const gate = { type: 'transition', location: 'hall', interaction: 'garden-gate' } as const
const living = (quest: { id: string }) => quest.id === 'living-match-living-items'

it('provides 17 indoor rewards, opens the garden at 16 and reaches exactly 25 with a return trip', () => {
  let save = fromHouse()
  expect(pointsOf(save)).toBe(15)
  expect(applyCommand(save, gate)).toBe(save)
  const indoor = reachableLocations(15)
  expect(indoor.has('garden')).toBe(false)
  expect(quests.filter((quest) => quest.introduced <= 4 && indoor.has(quest.location))).toHaveLength(17)
  save = travel(earn(save, living), 'hall')
  expect(pointsOf(save)).toBe(16)
  save = applyCommand(save, gate)!
  expect(save.checkpoint).toEqual({ location: 'garden', spawn: 'from-hall' })
  expect(pointsOf(save)).toBe(16)
  expect(applyCommand(save, { type: 'discover', cat: 'puszek' })).toBe(save)

  save = earn(save, ({ introduced, location }) => introduced <= 4 && location === 'garden')
  expect(save.restored.filter(({ location }) => location === 'garden')).toHaveLength(8)
  expect(save.discovered).toEqual(['amber'])
  expect(pointsOf(save)).toBe(24)
  for (const cat of ['puszek', 'latka', 'cien', 'migotka'] as const) {
    expect(trustOf(save, cat)).toBe(1)
    save = applyCommand(save, { type: 'discover', cat })!
    expect(applyCommand(save, { type: 'discover', cat })).toBe(save)
    save = applyCommand(save, { type: 'pet', cat })!
    expect(trustOf(save, cat)).toBe(2)
    expect(applyCommand(save, { type: 'pet', cat })).toBe(save)
  }
  expect(pointsOf(save)).toBe(24)
  expect(decodeSave({ ...save, discovered: ['amber', 'puszek', 'latka', 'cien'] }, maps)).toBeNull()
  expect(decodeSave({ ...save, discovered: [...save.discovered, 'amber'] }, maps)).toBeNull()
  save = applyCommand(save, { type: 'transition', location: 'garden', interaction: 'return-hall' })!
  expect(save.checkpoint).toEqual({ location: 'hall', spawn: 'from-garden' })
  save = earn(save, ({ id }) => id === 'bedroom-read-desk-words')
  expect(pointsOf(save)).toBe(25)
  expect(new Set(save.completed).size).toBe(25)
  expect(new Set(save.rewards.map(({ id }) => id)).size).toBe(25)
  const restored = decodeSave(save, maps)!
  expect(restored.checkpoint).toEqual(save.checkpoint)
  expect(restored.discovered).toEqual(save.discovered)
  expect(restored.trust).toEqual(expect.arrayContaining(save.trust))
})

it('migrates a Stage 05 schema 2/content 3 save including 12 PS and historical trust', () => {
  const record = stage05Record()
  const migrated = decodeSave(record, maps)!
  expect(migrated).toMatchObject({
    schemaVersion: 3, contentVersion: 5, profile: record.profile, checkpoint: record.checkpoint,
    completed: expect.arrayContaining(record.completed), rewards: expect.arrayContaining(record.rewards),
    hidden: record.hidden, restored: expect.arrayContaining(record.restored), trust: expect.arrayContaining(record.trust),
    discovered: ['amber'],
  })
  expect(pointsOf(migrated)).toBe(12)
  expect(trustOf(migrated, 'amber')).toBe(3)
  expect(isIncompatibleSave(record)).toBe(false)
  expect(isIncompatibleSave({ ...record, schemaVersion: 4, contentVersion: 5 })).toBe(true)
})
