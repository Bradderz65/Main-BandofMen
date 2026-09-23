// Cleanup worker for visitors who installed the old cache-first version.
// No fetch handler: pages and assets now use normal HTTP caching.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('bom-static-')).map((key) => caches.delete(key)));
        await self.clients.claim();
        await self.registration.unregister();
    })());
});
