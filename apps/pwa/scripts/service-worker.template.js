/* Generated with each production build. User data lives in IndexedDB, never in this cache. */
/* global __PRECACHE__ */
const CACHE = 'mymind-pwa-__VERSION__'
const PRECACHE = __PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      try {
        await cache.addAll(PRECACHE)
      } catch (error) {
        await caches.delete(CACHE)
        throw error
      }
    })()
  )
  // Wait for all open windows to close before activating a new application version.
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith('mymind-pwa-') && name !== CACHE) await caches.delete(name)
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        return (await cache.match('/')) || fetch(request)
      })()
    )
    return
  }
  if (!PRECACHE.includes(url.pathname)) return
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      return (await cache.match(url.pathname)) || fetch(request)
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const route = event.notification.data?.route === 'habits' ? 'habits' : 'calendar'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const current = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (current) {
        await current.focus()
        current.postMessage({ type: 'MYMIND_REMINDER_NAVIGATE', route })
      } else await self.clients.openWindow(`/#${route}`)
    })()
  )
})
