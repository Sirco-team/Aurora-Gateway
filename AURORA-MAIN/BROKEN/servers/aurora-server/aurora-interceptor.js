// Aurora Gateway Proxy Interceptor
(function() {
    const config = window.__AURORA_PROXY__;
    if (!config) return;

    const { originalUrl, proxyUrl } = config;

    // URL validation and processing
    function processUrl(url) {
        try {
            if (!url) return null;
            if (url.startsWith('data:') || url.startsWith('blob:')) return url;
            if (url.startsWith('javascript:')) return 'about:blank';
            
            // Handle relative URLs
            if (url.startsWith('/')) {
                return new URL(url, originalUrl).href;
            }
            
            // Handle absolute URLs
            if (url.match(/^https?:\/\//)) {
                return url;
            }
            
            // Handle protocol-relative URLs
            if (url.startsWith('//')) {
                return 'https:' + url;
            }
            
            // Default to HTTPS
            return 'https://' + url;
        } catch (err) {
            console.warn('URL processing error:', err);
            return null;
        }
    }

    // WebSocket handling
    const WS = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        if (url.startsWith('ws://') || url.startsWith('wss://')) {
            const wsUrl = `${proxyUrl.replace('http', 'ws')}/ws/${encodeURIComponent(url)}`;
            return new WS(wsUrl, protocols);
        }
        return new WS(url, protocols);
    };

    // Fetch interceptor
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        try {
            const processedUrl = processUrl(url);
            if (!processedUrl) return Promise.reject(new Error('Invalid URL'));
            
            if (processedUrl.startsWith('data:') || processedUrl.startsWith('blob:')) {
                return originalFetch(processedUrl, options);
            }

            const proxyOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'X-Original-URL': processedUrl
                }
            };

            return originalFetch(`${proxyUrl}/proxy?url=${encodeURIComponent(processedUrl)}`, proxyOptions);
        } catch (err) {
            console.error('Fetch error:', err);
            return Promise.reject(err);
        }
    };

    // XHR interceptor
    const XHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        try {
            const processedUrl = processUrl(url);
            if (!processedUrl) throw new Error('Invalid URL');
            
            if (processedUrl.startsWith('data:') || processedUrl.startsWith('blob:')) {
                return XHROpen.apply(this, [method, processedUrl, ...args]);
            }

            const proxyUrl = `${config.proxyUrl}/proxy?url=${encodeURIComponent(processedUrl)}`;
            this.setRequestHeader('X-Original-URL', processedUrl);
            return XHROpen.apply(this, [method, proxyUrl, ...args]);
        } catch (err) {
            console.error('XHR error:', err);
            throw err;
        }
    };

    // Dynamic content observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    rewriteNodeUrls(node);
                }
            });
        });
    });

    function rewriteNodeUrls(node) {
        if (!node || !node.getAttribute) return;

        ['src', 'href', 'action'].forEach(attr => {
            try {
                const value = node.getAttribute(attr);
                if (!value || value.startsWith('data:') || value.startsWith('#')) return;
                
                const processedUrl = processUrl(value);
                if (processedUrl) {
                    node.setAttribute(attr, `${proxyUrl}/proxy?url=${encodeURIComponent(processedUrl)}`);
                }
            } catch (e) {
                console.warn('URL rewrite error:', e);
            }
        });

        // Process child nodes
        if (node.querySelectorAll) {
            node.querySelectorAll('[src], [href], [action]').forEach(el => rewriteNodeUrls(el));
        }
    }

    // Start observing DOM changes
    observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
    });

    // Form submission handler
    document.addEventListener('submit', (e) => {
        const form = e.target;
        if (form.tagName !== 'FORM') return;
        
        try {
            e.preventDefault();
            const action = processUrl(form.action) || window.location.href;
            const method = (form.method || 'GET').toUpperCase();
            const data = new FormData(form);

            if (method === 'GET') {
                const params = new URLSearchParams(data);
                const url = new URL(action);
                url.search = params.toString();
                window.location.href = `${proxyUrl}/proxy?url=${encodeURIComponent(url.href)}`;
            } else {
                fetch(`${proxyUrl}/proxy?url=${encodeURIComponent(action)}`, {
                    method,
                    body: data,
                    headers: {
                        'X-Original-URL': action
                    }
                })
                .then(response => response.text())
                .then(html => {
                    document.documentElement.innerHTML = html;
                })
                .catch(err => {
                    console.error('Form submission error:', err);
                });
            }
        } catch (err) {
            console.error('Form handling error:', err);
        }
    }, true);

    // Initialize
    console.log('[Aurora Gateway] Interceptor initialized');
})();