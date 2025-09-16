const express = require('express');
const { WebSocket, WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ 
    server,
    path: '/ws'
});

const PORT = process.env.PORT || 3000;
const SECURE = process.env.SECURE === 'true';

app.use(cors());

// WebSocket URL handler
function formatWsUrl(url) {
    // Format: wss://your-server.com/aurora-ws/[encoded-target-url]
    if (url.startsWith('wss://') || url.startsWith('ws://')) {
        return url;
    }
    
    // Handle HTTP URLs - convert to WS
    if (url.startsWith('http://')) {
        return 'ws://' + url.slice(7);
    }
    if (url.startsWith('https://')) {
        return 'wss://' + url.slice(8);
    }
    
    // Default to WSS
    return 'wss://' + url;
}

// WebSocket connection handling
wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection');
    let targetWs = null;

    try {
        // Extract target URL from path: /ws/encoded-url
        const encodedUrl = req.url.slice(4); // Remove /ws/
        const targetUrl = decodeURIComponent(encodedUrl);
        
        // Connect to target WebSocket
        targetWs = new WebSocket(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Origin': new URL(targetUrl).origin
            }
        });

        // Forward messages
        targetWs.on('message', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        ws.on('message', (data) => {
            if (targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(data);
            }
        });

        // Handle connection events
        targetWs.on('open', () => {
            console.log('Connected to target:', targetUrl);
            ws.send(JSON.stringify({ type: 'connected' }));
        });

        targetWs.on('error', (error) => {
            console.error('Target connection error:', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        });

        targetWs.on('close', () => {
            console.log('Target connection closed');
            ws.close();
        });

        ws.on('close', () => {
            if (targetWs) {
                targetWs.close();
            }
        });

    } catch (error) {
        console.error('WebSocket setup error:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
        ws.close();
    }
});

// Client-side interceptor code that gets injected into proxied pages
const INTERCEPTOR_CODE = `
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
        return originalFetch(\`\${proxyUrl}/proxy?url=\${encodeURIComponent(url)}\`, options);
    };

    // Intercept XHR
    const XHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (url.startsWith('/')) {
            url = new URL(url, originalUrl).href;
        }
        const proxyUrl = \`\${proxyUrl}/proxy?url=\${encodeURIComponent(url)}\`;
        XHROpen.apply(this, [method, proxyUrl, ...args]);
    };

    // Intercept dynamic content
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
                        node.setAttribute(attr, \`\${proxyUrl}/proxy?url=\${encodeURIComponent(absoluteUrl)}\`);
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

    // Handle form submissions
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
                window.location.href = \`\${proxyUrl}/proxy?url=\${encodeURIComponent(url.href)}\`;
            } else {
                fetch(\`\${proxyUrl}/proxy?url=\${encodeURIComponent(action)}\`, {
                    method,
                    body: data
                }).then(response => response.text()).then(html => {
                    document.documentElement.innerHTML = html;
                });
            }
        }
    }, true);
})();`;

// URL rewriting function
function rewriteUrls($, baseUrl, proxyUrl) {
    $('[src],[href],[action]').each((_, el) => {
        const $el = $(el);
        ['src', 'href', 'action'].forEach(attr => {
            const val = $el.attr(attr);
            if (val && !val.startsWith('data:') && !val.startsWith('#')) {
                try {
                    const absoluteUrl = new URL(val, baseUrl).href;
                    $el.attr(attr, `${proxyUrl}${encodeURIComponent(absoluteUrl)}`);
                } catch (e) {}
            }
        });
    });
}

// Main proxy endpoint
app.get('/proxy', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).send('URL parameter required');
    }

    try {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type') || '';

        // Handle different content types
        if (contentType.includes('text/html')) {
            const html = await response.text();
            const $ = cheerio.load(html);
            
            // Remove potentially problematic elements
            $('script').remove();
            $('meta[http-equiv="Content-Security-Policy"]').remove();
            
            // Rewrite URLs
            rewriteUrls($, url, '/proxy?url=');
            
            // Add our interceptor script
            $('body').append(`
                <script>
                    window.__AURORA_PROXY__ = {
                        originalUrl: "${url}",
                        proxyUrl: "${process.env.PROXY_URL || 'http://localhost:3000'}"
                    };
                </script>
                <script>${INTERCEPTOR_CODE}</script>
            `);

            res.send($.html());
        } else {
            // Pass through other content types
            const buffer = await response.buffer();
            res.set('Content-Type', contentType);
            res.send(buffer);
        }
    } catch (error) {
        res.status(500).send(`Proxy error: ${error.message}`);
    }
});

// Aurora Gateway registration endpoint
app.post('/register', express.json(), (req, res) => {
    const { clientId, capabilities } = req.body;
    console.log(`New Aurora Gateway client registered: ${clientId}`);
    res.json({ 
        status: 'registered',
        proxyId: 'aurora-proxy-' + Math.random().toString(36).substring(7),
        endpoints: {
            proxy: '/proxy'
        }
    });
});

server.listen(PORT, () => {
    console.log(`Aurora Proxy Server running on port ${PORT} (${SECURE ? 'WSS' : 'WS'})`);
});

// Example usage in client:
/*
const ws = new WebSocket('wss://your-server:3000/wss://target-site.com/websocket');
ws.onmessage = (event) => console.log(event.data);
*/