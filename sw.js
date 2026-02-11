const CACHE_NAME = 'bom-static-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/account.html',
    '/css/variables.css',
    '/css/base.css',
    '/css/components.css',
    '/css/layout.css',
    '/css/responsive.css',
    '/css/account.css',
    '/js/preloader.js',
    '/js/navigation.js',
    '/js/gallery.js',
    '/js/tabs.js',
    '/js/open-status.js',
    '/js/main.js',
    '/js/account.js',
    '/js/sw-register.js',
    '/roundlogo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => Promise.resolve())
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key !== CACHE_NAME)
                .map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.pathname.startsWith('/.netlify/functions/')) return;

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type === 'opaque') {
                        return response;
                    }

                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, copy);
                    });

                    return response;
                })
                .catch(() => caches.match('/index.html'));
        })
    );
});
