import { earn, fromHouse, travel } from '../../e2e/gardenFixtures'
import { IDBFactory } from 'fake-indexeddb'
import { expect, it, vi } from 'vitest'
import { quests } from '../content/pack'
import { newSave, pointsOf } from '../core/progress'
import { currentKey, backupKey, databaseName, createSaveRepository, StaleSaveError } from './saveRepository'

const profile = { avatar: 'girl', nickname: 'Żółwik' } as const
const command = { type: 'complete', quest: quests[0].id } as const

function setup(legacy: string | null = null) {
  const indexed = new IDBFactory()
  return {
    indexed,
    repository: createSaveRepository(() => indexed, () => ({ getItem: () => legacy })),
  }
}

function writeRaw(indexed: IDBFactory, value: unknown, key = currentKey) {
  return new Promise<void>((resolve, reject) => {
    const request = indexed.open(databaseName)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('saves', 'readwrite')
      transaction.objectStore('saves').put(value, key)
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  })
}

it('migrates the Stage 01 profile once and keeps newer IndexedDB edits on subsequent loads', async () => {
  const { repository } = setup(JSON.stringify({ schemaVersion: 1, ...profile }))
  expect((await repository.load()).save?.profile).toEqual(profile)
  await repository.commit({ type: 'profile', profile: { ...profile, avatar: 'boy' } })
  expect((await repository.load()).save?.profile.avatar).toBe('boy')
})

it('is atomic and idempotent across concurrent saves; edits and transitions preserve the reward', async () => {
  const { indexed, repository } = setup()
  await repository.commit({ type: 'profile', profile })
  const later = createSaveRepository(() => indexed, () => ({ getItem: () => null }))
  await Promise.all([repository.commit(command), later.commit(command)])
  await later.commit({ type: 'profile', profile: { ...profile, avatar: 'boy' } })
  await repository.commit({ type: 'transition', location: 'bedroom', interaction: 'closed-door' })
  const loaded = (await later.load()).save!
  expect(pointsOf(loaded)).toBe(1)
  expect(loaded.completed).toEqual([quests[0].id])
  expect(loaded.hidden).toEqual([{ location: 'bedroom', object: 'scattered-clothes' }])
  expect(loaded.checkpoint).toEqual({ location: 'landing', spawn: 'from-bedroom' })
  expect(loaded.profile.avatar).toBe('boy')
})

it('uses the previous good save when the current record is corrupt', async () => {
  const { indexed, repository } = setup()
  await repository.commit({ type: 'profile', profile })
  await repository.commit(command)
  await repository.commit({ type: 'transition', location: 'bedroom', interaction: 'closed-door' })
  await writeRaw(indexed, 'broken')
  const recovered = await repository.load()
  expect(recovered.status).toBe('recovered')
  expect(pointsOf(recovered.save!)).toBe(1)
  expect(recovered.save?.checkpoint.location).toBe('bedroom')
})

it('never overwrites a save from an unsupported version even if a backup exists', async () => {
  const { indexed, repository } = setup()
  await repository.commit({ type: 'profile', profile })
  await repository.commit(command)
  await writeRaw(indexed, { schemaVersion: 8 })
  expect((await repository.load()).status).toBe('invalid')
  await expect(repository.commit({ type: 'profile', profile })).rejects.toThrow('Unreadable save')
  expect((await repository.load()).status).toBe('invalid')
})

it('protects an unreadable save without a backup and handles blocked IndexedDB', async () => {
  const { indexed, repository } = setup()
  await repository.load()
  await writeRaw(indexed, { schemaVersion: 8 })
  await expect(repository.commit({ type: 'profile', profile })).rejects.toThrow('Unreadable save')
  expect((await repository.load()).status).toBe('invalid')
  const blocked = createSaveRepository(() => { throw new Error('Blocked') }, () => ({ getItem: () => null }))
  expect(await blocked.load()).toEqual({ status: 'unavailable', save: null, generation: 0 })
})

async function withFailedCurrentWrite(indexed: IDBFactory, assertFailure: () => Promise<unknown>, failedKey = currentKey) {
  const opening = indexed.open(databaseName)
  const db = await new Promise<IDBDatabase>((resolve) => { opening.onsuccess = () => resolve(opening.result) })
  const store = db.transaction('saves').objectStore('saves')
  const proto = Object.getPrototypeOf(store) as IDBObjectStore
  const put = proto.put
  const fail = vi.spyOn(proto, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
    if (key === failedKey) throw new DOMException('Full', 'QuotaExceededError')
    return put.call(this, value, key)
  })
  try {
    await assertFailure()
  } finally {
    fail.mockRestore()
    db.close()
  }
}

it('rolls back the entire completion when the current record write throws', async () => {
  const { indexed, repository } = setup()
  await repository.commit({ type: 'profile', profile })
  await withFailedCurrentWrite(indexed, () =>
    expect(repository.commit({ type: 'complete', quest: 'bedroom-fill-water-bowl' })).rejects.toThrow('Full'))
  const loaded = (await repository.load()).save!
  expect(loaded.completed).toEqual([])
  expect(loaded.rewards).toEqual([])
  expect(loaded.hidden).toEqual([])
  expect(loaded.restored).toEqual([])
  expect(loaded.trust).toEqual([])
})

it('upgrades the Stage 08 database, atomically resets both snapshots and rejects stale commands', async () => {
  const { indexed, repository } = setup(JSON.stringify({ schemaVersion: 1, ...profile, nickname: 'Stary' }))
  const previous = fromHouse()
  await new Promise<void>((resolve, reject) => {
    const request = indexed.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('saves').put(previous, currentKey)
    request.onsuccess = () => { request.result.close(); resolve() }
    request.onerror = () => reject(request.error)
  })
  const oldTab = createSaveRepository(() => indexed)
  expect(await oldTab.load()).toMatchObject({
    save: { ...previous, trust: expect.arrayContaining(previous.trust) }, generation: 0,
  })
  await expect(new Promise((resolve, reject) => {
    const request = indexed.open(databaseName, 1)
    request.onsuccess = () => { request.result.close(); resolve(null) }
    request.onerror = () => reject(request.error)
  })).rejects.toHaveProperty('name', 'VersionError')
  const reset = await repository.reset(0)
  expect(reset).toMatchObject({ generation: 1, save: {
    profile: previous.profile, checkpoint: { location: 'bedroom', spawn: 'bedside' },
    completed: [], rewards: [], restored: [], hidden: [], trust: [], discovered: [],
  } })
  await expect(oldTab.commit(command, 0)).rejects.toBeInstanceOf(StaleSaveError)
  await expect(oldTab.reset(0)).rejects.toBeInstanceOf(StaleSaveError)
  await writeRaw(indexed, 'corrupt')
  expect(await repository.load()).toEqual({ ...reset, status: 'recovered' })
  const earned = await oldTab.commit(command, 1)
  expect(earned).toMatchObject({ applied: true, durable: true, previousPoints: 0 })
  expect(pointsOf(earned.save!)).toBe(1)
  expect(await repository.commit(command, 1)).toMatchObject({ applied: false, previousPoints: 1 })
  await writeRaw(indexed, 'corrupt')
  await writeRaw(indexed, 'corrupt', backupKey)
  expect(await repository.load()).toEqual({ generation: 1, status: 'invalid', save: null })
})

it('keeps both old snapshots when a reset cannot write its generation and protects newer saves', async () => {
  const { indexed, repository } = setup()
  await repository.commit({ type: 'profile', profile })
  const { save: previous } = await repository.commit(command)
  await withFailedCurrentWrite(indexed, () => expect(repository.reset(0)).rejects.toThrow('Full'), 'generation')
  expect(await repository.load()).toEqual({ generation: 0, status: 'ready', save: previous })
  await writeRaw(indexed, { schemaVersion: 99 })
  await expect(repository.reset(0)).rejects.toThrow('Unreadable save')
  expect((await repository.load()).status).toBe('invalid')
})

it('migrates a Stage 02 record in place on the next write and preserves its landing checkpoint', async () => {
  const { indexed, repository } = setup()
  await repository.load()
  const stage02 = {
    schemaVersion: 1, contentVersion: 1, profile,
    checkpoint: { location: 'landing', spawn: 'from-bedroom' },
    completed: [quests[0].id], rewards: [quests[0].reward],
    hidden: [{ location: 'bedroom', object: 'scattered-clothes' }],
  }
  await writeRaw(indexed, stage02)
  expect(await repository.load()).toEqual({
    status: 'ready', generation: 0,
    save: { ...stage02, schemaVersion: 3, contentVersion: 5, restored: [], trust: [], discovered: [] },
  })
  await repository.commit({ type: 'transition', location: 'landing', interaction: 'bedroom-door' })
  const water = { type: 'complete', quest: 'bedroom-fill-water-bowl' } as const
  const other = createSaveRepository(() => indexed, () => ({ getItem: () => null }))
  await Promise.all([repository.commit(water), other.commit(water)])
  expect((await repository.load()).save).toMatchObject({
    schemaVersion: 3, contentVersion: 5, profile,
    checkpoint: { location: 'bedroom', spawn: 'from-landing' },
    completed: [quests[0].id, water.quest],
    hidden: stage02.hidden,
    restored: [{ location: 'bedroom', object: 'water-bowl' }],
    trust: [{ cat: 'amber', id: 'restored:water-bowl' }], discovered: [],
  })
  expect(pointsOf((await repository.load()).save!)).toBe(2)
})

it('migrates an earlier landing save and rolls back a new organized prop and reward together', async () => {
  const { indexed, repository } = setup()
  await repository.commit({ type: 'profile', profile })
  for (const quest of quests.filter(({ location, introduced }) => location === 'bedroom' && introduced <= 2)) {
    await repository.commit({ type: 'complete', quest: quest.id })
  }
  await repository.commit({ type: 'pet', cat: 'amber' })
  const { save: landing } = await repository.commit({ type: 'transition', location: 'bedroom', interaction: 'closed-door' })
  await writeRaw(indexed, { ...landing, schemaVersion: 2, contentVersion: 2 })
  expect(await repository.load()).toEqual({ status: 'ready', save: landing, generation: 0 })
  const { save: study } = await repository.commit({ type: 'transition', location: 'landing', interaction: 'study-door' })
  const pack = { type: 'complete', quest: 'study-pack-school-bag' } as const
  await withFailedCurrentWrite(indexed, () => expect(repository.commit(pack)).rejects.toThrow('Full'))
  expect((await repository.load()).save).toEqual(study)

  const other = createSaveRepository(() => indexed, () => ({ getItem: () => null }))
  await Promise.all([repository.commit(pack), other.commit(pack)])
  const after = (await repository.load()).save!
  expect(pointsOf(after)).toBe(4)
  expect(after.completed.filter((id) => id === pack.quest)).toHaveLength(1)
  expect(after.restored).toContainEqual({ location: 'study', object: 'school-bag' })
  expect(after.trust).toEqual(landing?.trust)
})

it('serializes an encounter, restoration and greeting across tabs and rolls back an aborted discovery', async () => {
  const { indexed, repository } = setup()
  await repository.load()
  const seed = travel(earn(fromHouse(), ({ id }) => id === 'living-match-living-items'), 'garden')
  await writeRaw(indexed, seed)
  await repository.commit({ type: 'complete', quest: 'garden-fill-garden-water' })
  await repository.commit({ type: 'complete', quest: 'garden-prepare-sheltered-bed' })
  const discover = { type: 'discover', cat: 'puszek' } as const
  await withFailedCurrentWrite(indexed, () => expect(repository.commit(discover)).rejects.toThrow('Full'))
  expect((await repository.load()).save?.discovered).toEqual(['amber'])

  const other = createSaveRepository(() => indexed, () => ({ getItem: () => null }))
  await Promise.all([
    repository.commit(discover),
    other.commit({ type: 'complete', quest: 'garden-restore-scratching-post' }),
    other.commit(discover),
    repository.commit({ type: 'pet', cat: 'puszek' }),
    other.commit({ type: 'pet', cat: 'puszek' }),
  ])
  const result = (await repository.load()).save!
  expect(pointsOf(result)).toBe(19)
  expect(result.discovered).toEqual(['amber', 'puszek'])
  expect(result.trust.filter(({ cat }) => cat === 'puszek')).toEqual([
    { cat: 'puszek', id: 'habitat-ready' }, { cat: 'puszek', id: 'first-pet' },
  ])
})

it('preserves the kit after a failed construction, then commits it exactly once across tabs and reset', async () => {
  const { indexed, repository } = setup()
  await repository.load()
  const outside = earn(newSave(profile), ({ location }) => location !== 'workshop' &&
    location !== 'storage' && location !== 'basement')
  const withMaterials = earn(outside, ({ id }) => id === 'basement-sort-storage-boxes')
  const pending = travel(withMaterials, 'workshop')
  await writeRaw(indexed, pending)
  const build = { type: 'complete', quest: 'workshop-build-cardboard-hideout' } as const

  await withFailedCurrentWrite(indexed, () => expect(repository.commit(build)).rejects.toThrow('Full'))
  expect((await repository.load()).save?.restored).not.toContainEqual({ location: 'workshop', object: 'cardboard-hideout' })
  const staleTab = createSaveRepository(() => indexed)
  const results = await Promise.all([repository.commit(build), staleTab.commit(build)])
  expect(results.filter(({ applied }) => applied)).toHaveLength(1)
  expect(results[1].save?.restored).toContainEqual({ location: 'workshop', object: 'cardboard-hideout' })
  expect(pointsOf(results[1].save!)).toBe(pointsOf(pending) + 1)
  const reset = await repository.reset(0)
  expect(reset.save).toMatchObject({ completed: [], restored: [], trust: [], discovered: [] })
  await expect(staleTab.commit(build, 0)).rejects.toBeInstanceOf(StaleSaveError)
  await writeRaw(indexed, 'damaged')
  expect(await repository.load()).toEqual({ ...reset, status: 'recovered' })
})
