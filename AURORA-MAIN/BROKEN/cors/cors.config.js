// CORS Proxy Configuration
window.__cors$config = {
    // Available CORS proxies
    proxies: {
        'corsproxy.io': {
            url: 'https://corsproxy.io/?',
            paramName: null // URL is directly appended
        },
        'api.allorigins.win': {
            url: 'https://api.allorigins.win/raw',
            paramName: 'url'
        },
        'api.codetabs.com': {
            url: 'https://api.codetabs.com/v1/proxy',
            paramName: 'quest'
        }
    },
    
    // Default proxy
    defaultProxy: 'corsproxy.io',
    
    // Encode URL for proxy
    encodeUrl: function(url, proxy) {
        const proxyConfig = this.proxies[proxy || this.defaultProxy];
        if (!proxyConfig) {
            throw new Error('Invalid proxy selected');
        }
        
        if (proxyConfig.paramName) {
            return `${proxyConfig.url}?${proxyConfig.paramName}=${encodeURIComponent(url)}`;
        } else {
            return `${proxyConfig.url}${encodeURIComponent(url)}`;
        }
    }
};