const CACHE_NAME = 'bom-static-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/css/variables.css',
    '/css/base.css',
    '/css/components.css',
    '/css/layout.css',
    '/css/responsive.css',
    '/js/preloader.js',
    '/js/navigation.js',
    '/js/gallery.js',
    '/js/tabs.js',
    '/js/open-status.js',
    '/js/contact-mailto.js',
    '/js/main.js',
    '/js/sw-register.js',
    '/favicon.ico',
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

    // Keep HTML fresh on deploys while still supporting offline fallback.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put('/index.html', copy);
                        });
                    }

                    return response;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // For static assets, serve cached content immediately and refresh in the background.
    event.respondWith(
        caches.match(request).then((cached) => {
            const networkFetch = fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type === 'opaque') {
                        return response;
                    }

                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, copy);
                    });

                    return response;
                });

            return cached || networkFetch;
        }).catch(() => Response.error())
    );
});
