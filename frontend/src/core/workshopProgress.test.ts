import { expect, it } from 'vitest'
import { earn, travel } from '../../e2e/gardenFixtures'
import { kitStatus, obtainableQuests, recipes } from '../content/crafting'
import { quests, transitions } from '../content/pack'
import { nextQuestExit, reachableLocations } from '../content/routes'
import { maps } from '../content/world'
import { CatPopulation } from './catPopulation'
import { canObserve } from './discovery'
import { applyCommand, decodeSave, newSave, pointsOf, trustOf } from './progress'
import { canStand } from './room'
import { solidsFor } from './tiledMap'

const profile = { avatar: 'boy', nickname: 'Olek' } as const
const oldGame = () => earn(newSave(profile), ({ introduced }) => introduced <= 4)
const stairs = { type: 'transition', location: 'hall', interaction: 'basement-stairs' } as const
const newHouse = quests.filter(({ introduced, location }) =>
  introduced === 5 && reachableLocations(31).has(location))

it('earns 50 distinct stars through the basement with three accessible tasks still unfinished at entry', () => {
  const outside = reachableLocations(31)
  expect(obtainableQuests(quests, outside).size).toBe(35)
  expect(obtainableQuests(quests, reachableLocations(32)).size).toBe(50)
  expect(reachableLocations(32).size).toBe(12)
  expect(new Set(quests.map(({ id }) => id)).size).toBe(50)
  expect(new Set(quests.map(({ reward }) => reward.id)).size).toBe(50)
  let save = travel(earn(oldGame(), (quest) => newHouse.slice(0, 6).includes(quest)), 'hall')
  expect(pointsOf(save)).toBe(31)
  expect(applyCommand(save, stairs)).toBe(save)
  save = travel(earn(save, (quest) => quest === newHouse[6]), 'hall')
  expect(pointsOf(save)).toBe(32)
  expect(quests.filter(({ id, location }) => outside.has(location) && !save.completed.includes(id))).toHaveLength(3)
  save = applyCommand(save, stairs)!
  expect(save.checkpoint).toEqual({ location: 'basement', spawn: 'from-hall' })
  expect(pointsOf(save)).toBe(32)
  save = earn(save, ({ location }) => !outside.has(location))
  expect(pointsOf(save)).toBe(47)
  expect(travel(save, 'hall').checkpoint.spawn).toBe('from-basement')
  save = earn(save, (quest) => newHouse.slice(7).includes(quest))
  expect(pointsOf(save)).toBe(50)
  expect(decodeSave(save, maps)?.completed).toHaveLength(50)
})

it('uses each designated kit exactly once and rejects impossible ledger records', () => {
  const initial = travel(earn(oldGame(), (quest) => newHouse.includes(quest)), 'workshop')
  expect(nextQuestExit('workshop', new Set(['storage']), 35)).toBe('corridor-door')
  expect(nextQuestExit('basement', new Set(['storage']), 35, 'workshop')).toBe('storage-door')
  for (const recipe of recipes) {
    const command = { type: 'complete', quest: recipe.quest } as const
    expect(kitStatus(recipe, initial.completed)).toBe('waiting')
    expect(applyCommand(initial, command)).toBe(initial)
    const acquired = travel(earn(initial, ({ id }) => id === recipe.source), 'workshop')
    expect(kitStatus(recipe, acquired.completed)).toBe('available')
    const built = applyCommand(acquired, command)!
    expect(kitStatus(recipe, built.completed)).toBe('built')
    expect(applyCommand(built, command)).toBe(built)
    expect(pointsOf(built) - pointsOf(acquired)).toBe(1)
    const prop = quests.find(({ id }) => id === recipe.quest)!.interaction
    expect(decodeSave(built, maps)?.restored).toContainEqual({ location: 'workshop', object: prop })

    const source = quests.find(({ id }) => id === recipe.source)!
    const impossible = {
      ...built, completed: built.completed.filter((id) => id !== source.id),
      rewards: built.rewards.filter(({ id }) => id !== source.reward.id),
      restored: built.restored.filter(({ object }) => object !== source.interaction),
    }
    expect(decodeSave(impossible, maps)).toBeNull()
  }
})

it('preserves the complete Stage 08.1 ledger and rejects later rewards in a legacy save', () => {
  let previous = oldGame()
  previous = applyCommand(previous, { type: 'pet', cat: 'puszek' })!
  const raw = { ...previous, contentVersion: 4 }
  const migrated = decodeSave(raw, maps)!
  expect(migrated).toEqual({ ...previous, contentVersion: 5, trust: expect.arrayContaining(previous.trust) })
  expect(pointsOf(migrated)).toBe(25)
  expect(trustOf(migrated, 'puszek')).toBe(2)
  expect(decodeSave({ ...earn(previous, (quest) => quest === newHouse[0]), contentVersion: 4 }, maps)).toBeNull()
})

it('simulates Iskierka on valid routes and applies only distinct trust events', () => {
  const population = new CatPopulation('workshop')
  const cat = [...population.members][0]
  expect(cat.definition.id).toBe('sparkle')
  const solids = solidsFor(maps.workshop)
  expect(canObserve(cat.definition.greet, cat.state.position, solids)).toBe(true)
  expect(canObserve({ x: 35, y: 234 }, cat.state.position, solids)).toBe(false)
  expect(population.pet('sparkle')).toBe(true)
  expect(population.pet('sparkle')).toBe(false)
  const frozen = cat.state
  population.step(40, solids, true)
  expect(cat.state).toBe(frozen)
  population.setRestored(['cardboard-hideout', 'resting-mat', 'felt-ball'])
  const activities = new Set<string>()
  const used = new Set<string>()
  for (let elapsed = 0; elapsed < 60000; elapsed += 40) {
    population.step(40, solids, false)
    expect(canStand(cat.state.position, solids)).toBe(true)
    activities.add(cat.state.activity)
    if (cat.state.spot && cat.state.activity !== 'walking') used.add(cat.state.spot)
  }
  expect(activities).toEqual(new Set(['petting', 'idle', 'walking', 'resting', 'playing']))
  expect(used).toEqual(new Set(['cardboard-hideout', 'resting-mat', 'felt-ball']))

  const unlocked = earn(oldGame(), (quest) => newHouse.includes(quest))
  expect(applyCommand(unlocked, { type: 'discover', cat: 'sparkle' })).toBe(unlocked)
  let save = travel(unlocked, 'workshop')
  save = applyCommand(save, { type: 'discover', cat: 'sparkle' })!
  expect(applyCommand(save, { type: 'discover', cat: 'sparkle' })).toBe(save)
  expect(trustOf(save, 'sparkle')).toBe(0)
  const pet = { type: 'pet', cat: 'sparkle' } as const
  save = applyCommand(save, pet)!
  expect(applyCommand(save, pet)).toBe(save)
  expect(pointsOf(save)).toBe(35)
  const built = earn(save, (quest) => quest.id === recipes[0].source || quest.id === recipes[0].quest)
  expect(trustOf(built, 'sparkle')).toBe(2)
  const persisted = decodeSave(built, maps)!
  expect(trustOf(persisted, 'sparkle')).toBe(2)
  expect(persisted.discovered).toContain('sparkle')
  expect(transitions.find(({ interaction }) => interaction === 'basement-return')?.minimumPoints).toBe(0)
})
