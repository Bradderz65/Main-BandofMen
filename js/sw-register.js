// Retire the previous offline cache so returning visitors receive current prices and assets.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            const legacy = registrations.filter((registration) => {
                const worker = registration.active || registration.waiting || registration.installing;
                return worker && new URL(worker.scriptURL).pathname === '/sw.js';
            });
            // Update first so a previously cached page can also receive the cleanup worker.
            return Promise.all(legacy.map((registration) => registration.update().catch(() => {})));
        }).catch(() => {});
    });
}
