// Service Worker Registration
const swRegister = async () => {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers are not supported');
    }

    try {
        // Unregister existing service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));

        // Wait for UV bundle to load
        await new Promise((resolve, reject) => {
            if (typeof Ultraviolet !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = '/uv/uv.bundle.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        // Register new service worker
        const registration = await navigator.serviceWorker.register('/uv/sw.js', {
            scope: '/uv/',
            updateViaCache: 'none'
        });

        // Wait for the service worker to be ready
        if (registration.installing) {
            await new Promise((resolve, reject) => {
                registration.installing.addEventListener('statechange', (e) => {
                    if (e.target.state === 'activated') {
                        resolve();
                    } else if (e.target.state === 'redundant') {
                        reject(new Error('Service Worker became redundant'));
                    }
                });
            });
        }

        console.log('[UV] Service Worker registered:', registration.scope);
        return registration;
    } catch (err) {
        console.error('[UV] Service Worker registration failed:', err);
        throw err;
    }
};

// Initialize proxy
const initProxy = async () => {
    try {
        await swRegister();
        console.log('[UV] Proxy initialized successfully');
    } catch (err) {
        console.error('[UV] Failed to initialize proxy:', err);
        throw err;
    }
};

// Register service worker when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initProxy());
} else {
    initProxy();
}