const CACHE = 'kamalbay-v1';
const ASSETS = ['/', '/logo.jpeg', '/kaspi.png', '/manifest.json', '/icons/192.png', '/icons/512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // при необходимости — очистка старых кэшей
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE) && caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // SW только для GET; не трогаем чужие origins и non-GET
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // кэшируем только успешные same-origin ответы
      if (res.ok && new URL(req.url).origin === self.location.origin) {
        const copy = res.clone();
        const c = await caches.open(CACHE);
        c.put(req, copy);
      }
      return res;
    } catch {
      // оффлайн-фолбэк: отдаем корневую страницу
      const fallback = await caches.match('/');
      return fallback || new Response('Offline', { status: 503 });
    }
  })());
});