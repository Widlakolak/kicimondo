import { maps } from '../content/world'
import { applyCommand, decodeSave, isIncompatibleSave, newSave, type Save, type SaveCommand } from '../core/progress'
import { readProfile } from './profileStore'

export const databaseName = 'kicimondo'
const storeName = 'saves'
export const currentKey = 'current'
export const backupKey = 'previous'

type LoadResult = { save: Save | null; status: 'ready' | 'recovered' | 'invalid' | 'legacy-invalid' | 'unavailable' }

export function createSaveRepository(
  indexed: () => IDBFactory = () => window.indexedDB,
  legacy: () => Pick<Storage, 'getItem'> = () => window.localStorage,
) {
  function open() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexed().open(databaseName, 1)
      let blocked = false
      request.onupgradeneeded = () => {
        if (!blocked) request.result.createObjectStore(storeName)
        else request.transaction?.abort()
      }
      request.onblocked = () => {
        blocked = true
        reject(new Error('Database upgrade is blocked'))
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        if (blocked) request.result.close()
        else resolve(request.result)
      }
    })
  }

  // Read and update inside a single transaction so other tabs cannot overwrite a reward with stale state.
  async function update<T>(operation: (store: IDBObjectStore, value: unknown, backup: unknown) => T): Promise<T> {
    const db = await open()
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        const store = transaction.objectStore(storeName)
        const current = store.get(currentKey)
        const backup = store.get(backupKey)
        let result: T
        let failure: unknown
        backup.onsuccess = () => {
          try {
            result = operation(store, current.result, backup.result)
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
        return await update<LoadResult>((store, raw, backup) => {
          const save = decodeSave(raw, maps)
          if (save) return { save, status: 'ready' }
          const previous = decodeSave(backup, maps)
          if (isIncompatibleSave(raw)) return { save: previous ?? migrated, status: 'invalid' }
          if (previous) return { save: previous, status: 'recovered' }
          if (raw !== undefined || backup !== undefined) return { save: migrated, status: 'invalid' }
          if (migrated) store.put(migrated, currentKey)
          return { save: migrated, status: old.status === 'invalid' ? 'legacy-invalid' : 'ready' }
        })
      } catch {
        return { save: migrated, status: 'unavailable' }
      }
    },

    async commit(command: SaveCommand): Promise<Save | null> {
      return update((store, raw, backup) => {
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
        return next
      })
    },
  }
}
