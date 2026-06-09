/* NUMAT portal service worker.
   Pages use the network first with an offline fallback.
   Static assets are served from cache, then refreshed.
   Auth and api traffic is never cached. */

const VERSION = 'numat_pwa_v1'
const STATIC_CACHE = VERSION + '_static'
const OFFLINE_URL = '/offline.html'
const PRECACHE = [OFFLINE_URL, '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Never touch auth or api traffic. Let the network handle it directly.
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/portal/login')
  ) {
    return
  }

  // Page loads: try the network, fall back to the offline page when there is no connection.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Static assets that do not change once built: serve from cache, then refresh in the background.
  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    /\.(?:png|svg|jpg|jpeg|gif|webp|ico|woff2?)$/.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy))
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
  }
  // Everything else uses default network handling, with no caching of dynamic signed in content.
})
