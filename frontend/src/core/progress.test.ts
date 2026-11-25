import { expect, it } from 'vitest'
import { quests } from '../content/pack'
import { maps } from '../content/world'
import { applyCommand, decodeSave, meetsGate, newSave, pointsOf } from './progress'

const quest = quests[0]
const initial = () => newSave({ avatar: 'girl', nickname: 'Żółwik' })
const complete = { type: 'complete', quest: quest.id } as const
const exit = { type: 'transition', location: 'bedroom', interaction: 'closed-door' } as const

it('adds the quest, reward and world effect together and ignores repeat and unknown completion', () => {
  const before = initial()
  const after = applyCommand(before, complete)!
  expect(after.completed).toEqual([quest.id])
  expect(after.rewards).toEqual([quest.reward])
  expect(after.hidden).toEqual([{ location: 'bedroom', object: 'scattered-clothes' }])
  expect(pointsOf(after)).toBe(1)
  expect(pointsOf(before)).toBe(0)
  expect(applyCommand(after, complete)).toBe(after)
  expect(applyCommand(before, { ...complete, quest: 'missing' })).toBe(before)
})

it('unlocks at the exact threshold and restores safe arrival spawns in both directions', () => {
  const before = initial()
  expect(meetsGate(0, 1)).toBe(false)
  expect(meetsGate(1, 1)).toBe(true)
  expect(applyCommand(before, exit)).toBe(before)
  const landing = applyCommand(applyCommand(before, complete), exit)!
  expect(landing.checkpoint).toEqual({ location: 'landing', spawn: 'from-bedroom' })
  const bedroom = applyCommand(landing, { type: 'transition', location: 'landing', interaction: 'bedroom-door' })!
  expect(bedroom.checkpoint).toEqual({ location: 'bedroom', spawn: 'from-landing' })
  expect(pointsOf(bedroom)).toBe(1)
})

it('rejects inconsistent saves and repairs a stale spawn without removing earned progress', () => {
  const save = applyCommand(initial(), complete)!
  expect(decodeSave({ ...save, schemaVersion: 2 }, maps)).toBeNull()
  expect(decodeSave({ ...save, rewards: [quest.reward, quest.reward] }, maps)).toBeNull()
  expect(decodeSave({ ...save, hidden: [] }, maps)).toBeNull()
  expect(decodeSave({ ...save, checkpoint: { location: 'bedroom', spawn: 'gone' } }, maps)).toEqual(save)
  expect(decodeSave({ ...save, checkpoint: { location: 'landing', spawn: 'gone' } }, maps)?.checkpoint)
    .toEqual({ location: 'landing', spawn: 'from-bedroom' })
  expect(decodeSave({ ...initial(), checkpoint: { location: 'landing', spawn: 'from-bedroom' } }, maps))
    .toEqual(initial())
})
