// CORS Proxy Handler
window.__cors = {
    // Initialize CORS proxy
    init: function() {
        if (!window.__cors$config) {
            throw new Error('CORS proxy configuration not found');
        }
        
        // Load saved proxy preference
        const savedProxy = localStorage.getItem('selectedCorsProxy');
        if (savedProxy && window.__cors$config.proxies[savedProxy]) {
            window.__cors$config.defaultProxy = savedProxy;
        }
        
        return this;
    },
    
    // Process URL through CORS proxy
    processUrl: function(url) {
        if (!window.__cors$config) {
            throw new Error('CORS proxy configuration not found');
        }
        
        // Use the current selected proxy
        const currentProxy = localStorage.getItem('selectedCorsProxy') || window.__cors$config.defaultProxy;
        return window.__cors$config.encodeUrl(url, currentProxy);
    }
};