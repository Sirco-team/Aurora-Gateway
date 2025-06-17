// UV Service Worker
importScripts('uv.bundle.js');
importScripts('uv.client.js');
importScripts('uv.config.js');

class UVServiceWorker {
    constructor() {
        this.config = self.__uv$config;
        this.handler = self.__uv.handler;
        this.bareClient = new Ultraviolet.BareClient(this.config.bare);
    }

    async fetch(event) {
        const url = new URL(event.request.url);
        if (!url.pathname.startsWith(this.config.prefix)) {
            return fetch(event.request);
        }

        try {
            return await this.bareClient.fetch(event.request);
        } catch (error) {
            return new Response('UV Error: ' + error.toString(), { status: 500 });
        }
    }
}

const uv = new UVServiceWorker();

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(uv.fetch(event));
});