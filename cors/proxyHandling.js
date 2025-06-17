// CORS Proxy Configuration
const proxyMapping = {
    "corsproxy.io": "https://corsproxy.io/?url=",
    "allorigins": "https://api.allorigins.win/raw?url=",
    "codetabs": "https://api.codetabs.com/v1/proxy?quest="
};

// Force Base Tag Insertion
function forceBaseTag(html, baseHref) {
    html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/i, "");
    return html.replace(/<head>/i, `<head><base href="${baseHref}">`);
}

// Process HTML to clean up and fix issues
function processHtml(html, url) {
    // Remove cookie consent popups and similar overlays
    html = html.replace(/<div[^>]*cookie[^>]*>.*?<\/div>/gi, '');
    html = html.replace(/<div[^>]*consent[^>]*>.*?<\/div>/gi, '');
    html = html.replace(/<div[^>]*popup[^>]*>.*?<\/div>/gi, '');
    
    // Make all scripts run in local context
    html = html.replace(/<script/g, '<script nonce="aurora"');
    
    // Fix relative URLs
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    const elements = doc.querySelectorAll("[src], [href], [action]");
    elements.forEach(el => {
        ["src", "href", "action"].forEach(attr => {
            const val = el.getAttribute(attr);
            if (val && !val.startsWith("data:") && !/^(mailto:|javascript:)/.test(val)) {
                try {
                    const fullUrl = new URL(val, url).href;
                    el.setAttribute(attr, fullUrl);
                } catch(e) {}
            }
        });
    });

    return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
}

// Inject navigation interceptor and other scripts
function injectInterceptor(html, originalUrl, proxyBase, proxyType) {
    const interceptorScript = `
    <script nonce="aurora">
    (function() {
        const __ORIGINAL_URL = "${originalUrl}";
        const __PROXY_BASE = "${proxyBase}";
        const __PROXY_TYPE = "${proxyType}";
        
        function handleNavigation(url) {
            // Update URL bar
            const urlBar = window.parent.document.getElementById('urlBar');
            if (urlBar) urlBar.value = url;

            // Check for fullscreen and maintain it
            if (window.parent.document.fullscreenElement) {
                const wasFullscreen = true;
                window.parent.localStorage.setItem('wasFullscreen', 'true');
            }

            if (!/^https?:\\/\\//i.test(url)) {
                try { url = new URL(url, __ORIGINAL_URL).href; }
                catch(e) { }
            }
            window.parent.browser.loadTab(window.parent.browser.activeTabId, url);
        }
        
        window.location.assign = function(url) { handleNavigation(url); };
        window.location.replace = function(url) { handleNavigation(url); };
        window.open = function(url) { handleNavigation(url); return null; };
        
        document.addEventListener("click", function(e) {
            const anchor = e.target.closest("a");
            if (anchor && anchor.href) {
                e.preventDefault();
                handleNavigation(anchor.href);
            }
        }, true);
        
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            let url = typeof input === "string" ? input : input.url;
            if (!/^https?:\\/\\//i.test(url)) {
                try { url = new URL(url, __ORIGINAL_URL).href; } catch(e) { }
            }
            return originalFetch(__PROXY_BASE + encodeURIComponent(url), init);
        };
        
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            if (!/^https?:\\/\\//i.test(url)) {
                try { url = new URL(url, __ORIGINAL_URL).href; } catch(e) { }
            }
            return origOpen.call(this, method, __PROXY_BASE + encodeURIComponent(url), async, user, password);
        };
        
        // Remove cookie/consent related stuff
        function removeOverlays() {
            const selectors = [
                '[class*="cookie"]',
                '[class*="consent"]',
                '[id*="cookie"]',
                '[id*="consent"]',
                '[class*="popup"]',
                '[id*="popup"]'
            ];
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    if (el.tagName !== 'SCRIPT') el.remove();
                });
            });
        }
        
        // Run cleanup on load and periodically
        removeOverlays();
        setInterval(removeOverlays, 1000);
    })();
    </script>`;

    if (/<\/body>/i.test(html)) {
        return html.replace(/<\/body>/i, interceptorScript + "</body>");
    } else {
        return html + interceptorScript;
    }
}

// Fetch and process content
async function fetchAndProcess(url, proxyType) {
    const proxyBase = proxyMapping[proxyType] || proxyMapping["corsproxy.io"];
    const fetchUrl = proxyBase + encodeURIComponent(url);

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error("HTTP error " + response.status);
        let data = await response.text();

        // Process the HTML
        data = processHtml(data, url);
        
        // Add our script handler
        const scriptHandler = `
            <script nonce="aurora">
            (function() {
                // Override window.open
                window.open = function(url) {
                    if (url) {
                        window.parent.browser.newTab(url);
                    }
                    return null;
                };

                // Handle navigation
                document.addEventListener('click', function(e) {
                    const link = e.target.closest('a');
                    if (link && link.href) {
                        e.preventDefault();
                        window.parent.browser.loadTab(window.parent.browser.activeTabId, link.href);
                    }
                }, true);

                // Remove cookie/consent related stuff
                function removeOverlays() {
                    const selectors = [
                        '[class*="cookie"]',
                        '[class*="consent"]',
                        '[id*="cookie"]',
                        '[id*="consent"]',
                        '[class*="popup"]',
                        '[id*="popup"]'
                    ];
                    selectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                            if (el.tagName !== 'SCRIPT') el.remove();
                        });
                    });
                }
                
                // Run cleanup on load and periodically
                removeOverlays();
                setInterval(removeOverlays, 1000);
            })();
            </script>
        `;
        
        data = data.replace('</body>', scriptHandler + '</body>');
        
        return {
            html: data,
            proxiedUrl: fetchUrl
        };
    } catch (error) {
        throw new Error("Failed to fetch content: " + error.message);
    }
}

window.proxyHandler = {
    proxyMapping: {
        'corsproxy.io': 'https://corsproxy.io/?',
        'api.allorigins.win': 'https://api.allorigins.win/raw?url=',
        'api.codetabs.com': 'https://api.codetabs.com/v1/proxy/?quest=',
        'direct': ''
    },

    async fetchAndProcess(url, proxyType) {
        if (proxyType === 'direct') {
            // Direct fetch without proxy
            const response = await fetch(url);
            const html = await response.text();
            return { html, proxiedUrl: url };
        }
        
        // Use proxy
        const proxyUrl = this.proxyMapping[proxyType] || this.proxyMapping['corsproxy.io'];
        const finalUrl = proxyUrl + encodeURIComponent(url);
        
        try {
            const response = await fetch(finalUrl);
            const html = await response.text();
            return { html, proxiedUrl: finalUrl };
        } catch (err) {
            console.error('Proxy fetch failed, trying direct:', err);
            // Fallback to direct if proxy fails
            const response = await fetch(url);
            const html = await response.text();
            return { html, proxiedUrl: url };
        }
    }
};