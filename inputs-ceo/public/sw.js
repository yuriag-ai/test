// Service worker simples: o app abre mesmo sem internet (dados ficam no IndexedDB).
const CACHE = 'inputs-ceo-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icone.svg'])))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copia = r.clone()
          caches.open(CACHE).then((c) => c.put('/', copia))
          return r
        })
        .catch(() => caches.match('/')),
    )
    return
  }
  e.respondWith(
    caches.match(e.request).then(
      (salvo) =>
        salvo ||
        fetch(e.request).then((r) => {
          if (r.ok) {
            const copia = r.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copia))
          }
          return r
        }),
    ),
  )
})
