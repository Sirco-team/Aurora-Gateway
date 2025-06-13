// Aurora Gateway Proxy Interceptor
(function() {
    const config = window.__AURORA_PROXY__;
    if (!config) return;

    const { originalUrl, proxyUrl } = config;

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
        if (url.startsWith('/')) {
            url = new URL(url, originalUrl).href;
        }
        return originalFetch(`${proxyUrl}/proxy?url=${encodeURIComponent(url)}`, options);
    };

    // Intercept XHR
    const XHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (url.startsWith('/')) {
            url = new URL(url, originalUrl).href;
        }
        const proxyUrl = `${proxyUrl}/proxy?url=${encodeURIComponent(url)}`;
        XHROpen.apply(this, [method, proxyUrl, ...args]);
    };

    // Handle dynamic content
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    rewriteNodeUrls(node);
                }
            });
        });
    });

    function rewriteNodeUrls(node) {
        if (node.getAttribute) {
            ['src', 'href', 'action'].forEach(attr => {
                const value = node.getAttribute(attr);
                if (value && !value.startsWith('data:') && !value.startsWith('#')) {
                    try {
                        const absoluteUrl = new URL(value, originalUrl).href;
                        node.setAttribute(attr, `${proxyUrl}/proxy?url=${encodeURIComponent(absoluteUrl)}`);
                    } catch (e) {}
                }
            });
        }

        // Process child nodes
        if (node.querySelectorAll) {
            node.querySelectorAll('[src], [href], [action]').forEach(el => rewriteNodeUrls(el));
        }
    }

    // Start observing
    observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
    });

    // Intercept form submissions
    document.addEventListener('submit', (e) => {
        const form = e.target;
        if (form.tagName === 'FORM') {
            e.preventDefault();
            const action = form.action || window.location.href;
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
                    body: data
                }).then(response => response.text()).then(html => {
                    document.documentElement.innerHTML = html;
                });
            }
        }
    }, true);
})();