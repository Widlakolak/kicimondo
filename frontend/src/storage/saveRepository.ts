import { maps } from '../content/world'
import { applyCommand, decodeSave, isIncompatibleSave, newSave, pointsOf, type Save, type SaveCommand } from '../core/progress'
import { readProfile } from './profileStore'

export const databaseName = 'kicimondo'
const storeName = 'saves'
export const currentKey = 'current'
export const backupKey = 'previous'
const generationKey = 'generation'
const databaseVersion = 2

export class StaleSaveError extends Error {
  constructor() { super('This game was restarted in another tab') }
}

export type SaveReceipt = {
  save: Save | null
  applied: boolean
  previousPoints: number
  durable: boolean
}

type LoadResult = { save: Save | null; generation: number; status: 'ready' | 'recovered' | 'invalid' | 'legacy-invalid' | 'unavailable' }

export function createSaveRepository(
  indexed: () => IDBFactory = () => window.indexedDB,
  legacy: () => Pick<Storage, 'getItem'> = () => window.localStorage,
) {
  function open() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexed().open(databaseName, databaseVersion)
      let blocked = false
      request.onupgradeneeded = (event) => {
        if (blocked) request.transaction?.abort()
        else if (event.oldVersion === 0) request.result.createObjectStore(storeName)
      }
      request.onblocked = () => {
        blocked = true
        reject(new Error('Database upgrade is blocked'))
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        if (blocked) request.result.close()
        else {
          request.result.onversionchange = () => request.result.close()
          resolve(request.result)
        }
      }
    })
  }

  // Read and update inside a single transaction so other tabs cannot overwrite a reward with stale state.
  async function update<T>(operation: (store: IDBObjectStore, value: unknown, backup: unknown, generation: number) => T): Promise<T> {
    const db = await open()
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const current = store.get(currentKey)
        const backup = store.get(backupKey)
        let result: T
        let failure: unknown
        const stamp = store.get(generationKey)
        stamp.onsuccess = () => {
          try {
            const generation: unknown = stamp.result ?? 0
            if (typeof generation !== 'number' || !Number.isSafeInteger(generation) || generation < 0) {
              throw new Error('Unreadable save generation')
            }
            result = operation(store, current.result, backup.result, generation)
          } catch (error) {
            failure = error
            transaction.abort()
          }
        }
        transaction.oncomplete = () => resolve(result)
        transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Save transaction aborted'))
      })
    } finally {
      db.close()
    }
  }

  return {
    async load(): Promise<LoadResult> {
      const old = readProfile(legacy)
      const migrated = old.profile ? newSave(old.profile) : null
      try {
        return await update<LoadResult>((store, raw, backup, generation) => {
          const save = decodeSave(raw, maps)
          if (save) return { save, generation, status: 'ready' }
          const previous = decodeSave(backup, maps)
          const legacySave = generation ? null : migrated
          if (isIncompatibleSave(raw)) return { save: previous ?? legacySave, generation, status: 'invalid' }
          if (previous) return { save: previous, generation, status: 'recovered' }
          if (raw !== undefined || backup !== undefined || generation) {
            return { save: legacySave, generation, status: 'invalid' }
          }
          if (legacySave) store.put(legacySave, currentKey)
          return { save: legacySave, generation, status: old.status === 'invalid' ? 'legacy-invalid' : 'ready' }
        })
      } catch {
        return { save: migrated, generation: 0, status: 'unavailable' }
      }
    },

    async commit(command: SaveCommand, expectedGeneration = 0): Promise<SaveReceipt> {
      return update((store, raw, backup, generation) => {
        if (expectedGeneration !== generation) throw new StaleSaveError()
        const current = decodeSave(raw, maps)
        const previous = current ?? decodeSave(backup, maps)
        if (isIncompatibleSave(raw) || (!previous && (raw !== undefined || backup !== undefined))) {
          throw new Error('Unreadable save')
        }
        const next = applyCommand(previous, command)
        if (next && (next !== previous || !current)) {
          if (previous) store.put(previous, backupKey)
          store.put(next, currentKey)
        }
        return { save: next, applied: next !== previous, previousPoints: previous ? pointsOf(previous) : 0, durable: true }
      })
    },

    async reset(expectedGeneration: number): Promise<LoadResult> {
      return update((store, raw, backup, generation) => {
        if (expectedGeneration !== generation) throw new StaleSaveError()
        const previous = decodeSave(raw, maps) ?? decodeSave(backup, maps)
        if (!previous || isIncompatibleSave(raw) || generation >= Number.MAX_SAFE_INTEGER) {
          throw new Error('Unreadable save')
        }
        const save = newSave(previous.profile)
        store.put(save, currentKey)
        store.put(save, backupKey)
        store.put(generation + 1, generationKey)
        return { save, generation: generation + 1, status: 'ready' }
      })
    },
  }
}
