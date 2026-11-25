import { maxPackBytes, object, verifyPack, type VerifiedPack } from '../content/remote/pack'

export const packDatabase = 'kicimondo-educational-content'
const storeName = 'packs'
const key = 'active'

export function createPackStore(indexed = () => window.indexedDB) {
  function open() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexed().open(packDatabase, 1)
      let blocked = false
      request.onupgradeneeded = () => {
        if (blocked) request.transaction?.abort()
        else request.result.createObjectStore(storeName)
      }
      request.onblocked = () => {
        blocked = true
        reject(new Error('Content database upgrade blocked'))
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        if (blocked) request.result.close()
        else resolve(request.result)
      }
    })
  }

  async function update<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await open()
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode)
        const request = run(transaction.objectStore(storeName))
        transaction.oncomplete = () => resolve(request.result)
        transaction.onabort = () => reject(transaction.error ?? new Error('Content transaction aborted'))
      })
    } finally {
      db.close()
    }
  }

  return {
    async load(): Promise<VerifiedPack | null> {
      try {
        const record: unknown = await update('readonly', (store) => store.get(key))
        if (!object(record) || !(record.bytes instanceof Uint8Array) || record.bytes.length > maxPackBytes ||
            typeof record.sha256 !== 'string') return null
        return await verifyPack(record.bytes.slice(), record.sha256)
      } catch {
        return null
      }
    },
    async save(verified: VerifiedPack | null) {
      if (verified) {
        await update('readwrite', (store) => store.put({ bytes: verified.bytes, sha256: verified.sha256 }, key))
      } else {
        await update('readwrite', (store) => store.delete(key))
      }
    },
  }
}
