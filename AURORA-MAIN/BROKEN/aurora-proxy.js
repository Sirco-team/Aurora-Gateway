const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// URL rewriting functions
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

// Resource handler
async function handleResource(url, type = 'html') {
    try {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type') || '';

        // Handle different content types
        if (type === 'html' && contentType.includes('text/html')) {
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
                <script src="/aurora-interceptor.js"></script>
            `);

            return $.html();
        }
        
        // Pass through other content types
        return response.buffer();
    } catch (error) {
        throw new Error(`Failed to fetch: ${error.message}`);
    }
}

// Main proxy endpoint
app.get('/proxy', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).send('URL parameter required');
    }

    try {
        const type = req.query.type || 'html';
        const content = await handleResource(url, type);
        
        // Set appropriate headers
        res.header('Access-Control-Allow-Origin', '*');
        res.header('X-Frame-Options', 'SAMEORIGIN');
        res.header('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
        
        res.send(content);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// API endpoint for Aurora Gateway to register as a proxy
app.post('/register', express.json(), (req, res) => {
    const { clientId, capabilities } = req.body;
    console.log(`New Aurora Gateway client registered: ${clientId}`);
    // Store client info if needed
    res.json({ 
        status: 'registered',
        proxyId: 'aurora-proxy-' + Math.random().toString(36).substring(7),
        endpoints: {
            proxy: '/proxy',
            ws: '/ws'  // For future WebSocket support
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Aurora Proxy running on port ${PORT}`);
});