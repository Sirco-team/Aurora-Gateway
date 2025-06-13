importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');
importScripts('/uv/uv.sw.bundle.js');

if (typeof UVServiceWorker === 'undefined') {
    throw new Error('UVServiceWorker not found. Check script loading order.');
}

if (typeof __uv$config === 'undefined') {
    throw new Error('UV config not found. Check uv.config.js');
}

const sw = new UVServiceWorker();

self.addEventListener('install', event => {
    console.log('[UV] Installing service worker...');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    console.log('[UV] Activating service worker...');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.pathname.startsWith(__uv$config.prefix)) {
        event.respondWith(
            sw.fetch(event).catch(err => {
                console.error('[UV] Fetch error:', err);
                return new Response('Service Worker Error: ' + err.message, {
                    status: 500,
                    headers: { 'Content-Type': 'text/plain' }
                });
            })
        );
    }
});