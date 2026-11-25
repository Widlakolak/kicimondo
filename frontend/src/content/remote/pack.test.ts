import { createHash } from 'node:crypto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'
import demo from '../../../../contracts/demo-math.json'
import invalid from '../../../../contracts/fixtures/invalid-packs.json'
import vectors from '../../../../contracts/fixtures/math-vectors.json'
import { mathQuestions } from '../../core/education'
import { createPackStore, packDatabase } from '../../storage/educationalPacks'
import { challenges } from '../pack'
import { apiEndpoint, defaultPackId, downloadPack } from './download'
import { challengeAttempt, decodePack, maxPackBytes } from './pack'

const endpoint = 'https://example.invalid/api/v1/content/packs'
const metadata = {
  packId: defaultPackId, version: 1, gameContentVersion: 4, locale: 'pl',
  publishedAt: '2026-11-25T00:00:00Z',
}

function responses(payload = JSON.stringify(demo), checksum = createHash('sha256').update(payload).digest('hex')) {
  return vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ ...metadata, sha256: checksum }))
    .mockResolvedValueOnce(new Response(payload, { headers: { 'X-Content-SHA256': checksum } }))
}

describe('shared educational contracts', () => {
  it.each(invalid)('rejects $name', ({ overrides }) => {
    expect(() => decodePack({ ...demo, ...overrides })).toThrow()
  })

  it('uses the same deterministic questions and only replaces the seed for the selected attempt', () => {
    for (const { challengeId, seed, questions } of vectors) {
      const challenge = challenges[challengeId as keyof typeof challenges]
      if (challenge.type !== 'MATH_CHOICE') throw new Error('Missing math challenge')
      expect(mathQuestions({ ...challenge, seed })).toEqual(questions)
    }
    const pack = decodePack(demo)
    const original = challenges['count-water-drops']
    const changed = challengeAttempt('count-water-drops', pack, () => 0)
    expect(changed).toEqual({ ...original, seed: demo.variants[0].seed })
    expect(challengeAttempt('clothes-to-basket', pack)).toBe(challenges['clothes-to-basket'])
    expect(challengeAttempt('count-water-drops', null)).toBe(original)
    expect(() => decodePack({ ...demo, variants: Array(33).fill(demo.variants[0]) })).toThrow()
  })
})

describe('optional pack download', () => {
  it('only permits configured origins with HTTPS on native builds', () => {
    const page = 'http://127.0.0.1:4173/dist/'
    expect(apiEndpoint(undefined, false, page)).toBeNull()
    expect(apiEndpoint('same-origin', false, 'http://192.168.0.1/')).toBeNull()
    expect(apiEndpoint('same-origin', false, page)).toBe('http://127.0.0.1:4173/api/v1/content/packs')
    expect(apiEndpoint('http://127.0.0.1:8080', false, page)).toBe('http://127.0.0.1:8080/api/v1/content/packs')
    expect(apiEndpoint('http://127.0.0.1:8080', true, page)).toBeNull()
    expect(apiEndpoint('http://192.168.0.1', false, page)).toBeNull()
    expect(apiEndpoint('https://example.invalid', true, page)).toBe(endpoint)
    expect(apiEndpoint('https://user@example.invalid', true, page)).toBeNull()
  })

  it('checks exact identity, bytes and checksum without credentials or referrer', async () => {
    const request = responses()
    const result = await downloadPack(endpoint, defaultPackId, 200, request)
    expect(result.pack).toEqual(demo)
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      endpoint + '/kicimondo-math/latest?gameContentVersion=4&locale=pl',
      endpoint + '/kicimondo-math/versions/1?gameContentVersion=4&locale=pl',
    ])
    expect(request.mock.calls[0][1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' })
    await expect(downloadPack(endpoint, defaultPackId, 200, responses(JSON.stringify({ ...demo, version: 2 }))))
      .rejects.toThrow('identity')
    await expect(downloadPack(endpoint, defaultPackId, 200, responses(JSON.stringify(demo), 'a'.repeat(64))))
      .rejects.toThrow('checksum')
  })

  it('rejects oversized response bodies without trusting Content-Length', async () => {
    const payload = JSON.stringify(demo).padEnd(maxPackBytes + 1, ' ')
    await expect(downloadPack(endpoint, defaultPackId, 200, responses(payload))).rejects.toThrow('too large')
  })

  it('reports network failure and aborts a stalled request within the configured budget', async () => {
    const unavailable = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))
    await expect(downloadPack(endpoint, defaultPackId, 200, unavailable)).rejects.toThrow('offline')
    const stalled = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }))
    await expect(downloadPack(endpoint, defaultPackId, 20, stalled)).rejects.toThrow('aborted')
    expect(stalled.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })

  it('persists a verified pack, leaves it available after an invalid update, and falls back after a reset', async () => {
    const indexed = new IDBFactory()
    const cache = createPackStore(() => indexed)
    expect(await cache.load()).toBeNull()
    const pack = await downloadPack(endpoint, defaultPackId, 200, responses())
    await cache.save(pack)
    await expect(downloadPack(endpoint, defaultPackId, 200, responses(JSON.stringify({ ...demo, schemaVersion: 8 }))))
      .rejects.toThrow('Invalid')
    expect((await createPackStore(() => indexed).load())?.pack).toEqual(demo)
    await cache.save(null)
    expect(await cache.load()).toBeNull()
  })

  it('ignores a corrupted local cache', async () => {
    const indexed = new IDBFactory()
    const cache = createPackStore(() => indexed)
    const verified = await downloadPack(endpoint, defaultPackId, 200, responses())
    await cache.save(verified)
    await new Promise<void>((resolve, reject) => {
      const open = indexed.open(packDatabase)
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const transaction = db.transaction('packs', 'readwrite')
        transaction.objectStore('packs').put({ bytes: verified.bytes, sha256: 'a'.repeat(64) }, 'active')
        transaction.oncomplete = () => { db.close(); resolve() }
        transaction.onabort = () => { db.close(); reject(transaction.error) }
      }
    })
    expect(await cache.load()).toBeNull()
  })
})
