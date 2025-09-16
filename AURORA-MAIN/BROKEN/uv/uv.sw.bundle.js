'use strict';

// Ensure Ultraviolet is defined
if (typeof Ultraviolet === 'undefined') {
    importScripts('/uv/uv.bundle.js');
}

class UVServiceWorker {
    constructor() {
        this.addresses = new Map();
        this.referrers = new Map();
    }

    async fetch(event) {
        try {
            let request = event.request;
            let url = new URL(request.url);

            // Only proxy requests starting with the UV prefix
            if (!url.pathname.startsWith(__uv$config.prefix)) {
                return fetch(request);
            }

            let ultraviolet = new Ultraviolet(__uv$config);
            if (!ultraviolet) {
                throw new Error('Failed to initialize Ultraviolet');
            }

            return await ultraviolet.fetch(request);
        } catch (err) {
            return new Response('UV Error: ' + err.message, { 
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
    }
}

// Export to global scope
self.UVServiceWorker = UVServiceWorker;