// Aurora Gateway Service Worker
importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');
importScripts('/uv/uv.sw.js');

const sw = new UVServiceWorker();
const proxyPreferences = self.__uv$config.proxyPreferences || {};

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Handle fetch events
self.addEventListener('fetch', event => {
    if (event.request.url.startsWith(location.origin + '/service/')) {
        event.respondWith(sw.fetch(event));
    } else if (proxyPreferences.alwaysUseProxy) {
        // If user has enabled "always use proxy" setting
        event.respondWith(sw.fetch({
            request: new Request(location.origin + '/service/' + event.request.url),
            ...event
        }));
    }
});