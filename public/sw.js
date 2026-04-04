const CACHE = 'wti-v1'
const SHELL = ['/', '/login']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  // Only handle GET requests for same-origin navigation
  if (e.request.method !== 'GET') return
  if (!e.request.url.startsWith(self.location.origin)) return

  // Network-first for API/Supabase calls
  if (e.request.url.includes('supabase') || e.request.url.includes('/api/')) {
    return
  }

  // Cache-first for static assets, network-first for pages
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      return cached || network
    })
  )
})
