// UV Configuration
self.__uv$config = {
    prefix: '/uv/',
    // List of working bare servers (we can try them in order)
    bare: [
        'https://bare.celestialtech.app/',
        'https://bare.projectflare.org/',
        'https://bare.rjph.net/',
        'https://uv.holyubofficial.net/',
        'https://tomp.app/',
    ].map(url => url.endsWith('/') ? url : url + '/'),
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/uv/uv.handler.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/sw.js',

    // Helper functions
    validateUrl: function(url) {
        if (!url) return null;
        try {
            // Handle special URLs
            if (url.startsWith('about:') || url.startsWith('blob:') || url.startsWith('data:')) {
                return url;
            }

            // Add protocol if missing
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }

            return new URL(url).href;
        } catch (err) {
            console.warn('URL validation error:', err);
            return null;
        }
    }
};