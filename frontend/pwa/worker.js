/* global self, caches, fetch, URL, Request, CACHE, ASSETS */
const scope = new URL(self.registration.scope)
const index = new URL('index.html', scope)
const assets = new Map(ASSETS.map(([path, integrity]) => [new URL(path, scope).href, integrity]))

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    try {
      await cache.addAll([...assets].map(([url, integrity]) => new Request(url, {
        cache: 'reload',
        integrity,
      })))
    } catch (error) {
      await caches.delete(CACHE)
      throw error
    }
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const prefix = 'kicimondo:' + scope.pathname + ':'
    for (const name of await caches.keys()) {
      if (name.startsWith(prefix) && name !== CACHE) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const entry = request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === index.pathname)
    ? index.href
    : request.url
  if (url.origin !== scope.origin || !assets.has(entry)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    return await cache.match(entry) ?? fetch(new Request(entry, { integrity: assets.get(entry) }))
  })())
})
