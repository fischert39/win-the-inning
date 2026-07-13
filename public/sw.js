const CACHE = 'wti-v2'
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

  // Pages: network-first so a fresh deploy is picked up immediately;
  // the cache is only a fallback for offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(e.request, clone))
          }
          return res
        })
        .catch(() => caches.match(e.request).then(cached => cached ?? caches.match('/')))
    )
    return
  }

  // Static assets: cache-first with background refresh
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

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  if (!e.data) return
  let payload
  try {
    payload = e.data.json()
  } catch {
    payload = { title: 'Win the Inning', body: e.data.text(), url: '/' }
  }

  e.waitUntil(
    self.registration.showNotification(payload.title ?? 'Win the Inning', {
      body:  payload.body ?? '',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      tag:   payload.tag ?? 'wti',
      data:  { url: payload.url ?? '/' },
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
