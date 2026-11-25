import { IDBFactory } from 'fake-indexeddb'
import { expect, it, vi } from 'vitest'
import { quests } from '../content/pack'
import { pointsOf } from '../core/progress'
import { currentKey, databaseName, createSaveRepository } from './saveRepository'

const profile = { avatar: 'girl', nickname: 'Żółwik' } as const
const command = { type: 'complete', quest: quests[0].id } as const

function setup(legacy: string | null = null) {
  const indexed = new IDBFactory()
  return {
    indexed,
    repository: createSaveRepository(() => indexed, () => ({ getItem: () => legacy })),
  }
}

function writeRaw(indexed: IDBFactory, value: unknown) {
  return new Promise<void>((resolve, reject) => {
    const request = indexed.open(databaseName)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('saves', 'readwrite')
      transaction.objectStore('saves').put(value, currentKey)
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
  expect(await blocked.load()).toEqual({ status: 'unavailable', save: null })
})

it('rolls back the entire completion when the current record write throws', async () => {
  const { indexed, repository } = setup()
  await repository.commit({ type: 'profile', profile })
  const opening = indexed.open(databaseName)
  const db = await new Promise<IDBDatabase>((resolve) => { opening.onsuccess = () => resolve(opening.result) })
  const store = db.transaction('saves').objectStore('saves')
  const proto = Object.getPrototypeOf(store) as IDBObjectStore
  const put = proto.put
  const fail = vi.spyOn(proto, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
    if (key === currentKey) throw new DOMException('Full', 'QuotaExceededError')
    return put.call(this, value, key)
  })
  try {
    await expect(repository.commit(command)).rejects.toThrow('Full')
  } finally {
    fail.mockRestore()
    db.close()
  }
  const loaded = (await repository.load()).save!
  expect(loaded.completed).toEqual([])
  expect(loaded.rewards).toEqual([])
  expect(loaded.hidden).toEqual([])
})
