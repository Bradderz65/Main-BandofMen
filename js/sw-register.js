/* Register service worker for basic offline and repeat-visit caching. */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // No-op: keep runtime quiet if registration fails.
        });
    });
}
