import { contentVersion } from '../pack'
import { checksumPattern, identifier, integer, maxPackBytes, object, verifyPack } from './pack'

const path = '/api/v1/content/packs'
const configured = import.meta.env.VITE_CONTENT_API_ORIGIN as string | undefined
export const defaultPackId = 'kicimondo-math'

export function apiEndpoint(origin: string | undefined, native: boolean, page: string): string | null {
  if (!origin || (origin === 'same-origin' && native)) return null
  try {
    const url = new URL(origin === 'same-origin' ? new URL(page).origin : origin)
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.protocol !== 'https:' && (native || url.protocol !== 'http:' || !local)) return null
    return new URL(path, url).href
  } catch {
    return null
  }
}

export function configuredContentEndpoint() {
  return apiEndpoint(configured, import.meta.env.MODE === 'android', window.location.href)
}

async function bytesFrom(response: Response, maximum: number) {
  const length = response.headers.get('content-length')
  if (!response.ok || !response.body || (length !== null && Number(length) > maximum)) {
    await response.body?.cancel()
    throw new Error('Content response unavailable')
  }
  const reader = response.body.getReader()
  const output = new Uint8Array(maximum)
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) return output.subarray(0, size)
      if (size + value.length > maximum) throw new Error('Content response too large')
      output.set(value, size)
      size += value.length
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
}

export async function downloadPack(endpoint: string, packId = defaultPackId, timeoutMs = 8000, request = fetch) {
  if (!identifier(packId)) throw new Error('Invalid pack ID')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const query = '?gameContentVersion=' + contentVersion + '&locale=pl'
  const get = (suffix: string) => request(endpoint + '/' + packId + suffix + query, {
    signal: controller.signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store',
  })
  try {
    const metadata: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true })
      .decode(await bytesFrom(await get('/latest'), 2048)))
    if (!object(metadata) || Object.keys(metadata).length !== 6 || metadata.packId !== packId ||
        !integer(metadata.version, 1) || metadata.gameContentVersion !== contentVersion || metadata.locale !== 'pl' ||
        typeof metadata.sha256 !== 'string' || !checksumPattern.test(metadata.sha256) ||
        typeof metadata.publishedAt !== 'string') {
      throw new Error('Invalid pack metadata')
    }
    const exact = await get('/versions/' + metadata.version)
    if (exact.headers.get('X-Content-SHA256') !== metadata.sha256) {
      await exact.body?.cancel()
      throw new Error('Pack response differs from metadata')
    }
    const verified = await verifyPack(await bytesFrom(exact, maxPackBytes), metadata.sha256)
    if (verified.pack.packId !== packId || verified.pack.version !== metadata.version) {
      throw new Error('Unexpected pack identity')
    }
    return verified
  } finally {
    clearTimeout(timeout)
  }
}
