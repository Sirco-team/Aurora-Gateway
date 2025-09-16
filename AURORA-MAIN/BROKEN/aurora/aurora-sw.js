// Aurora Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Handle proxy requests
    if (url.pathname.startsWith('/aurora/~/')) {
        event.respondWith(
            fetch(decodeURIComponent(url.pathname.slice(9)))
            .then(response => new Response(response.body, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    ...response.headers
                }
            }))
        );
    }
});