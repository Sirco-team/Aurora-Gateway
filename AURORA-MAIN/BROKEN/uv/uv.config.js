// UV Configuration
(() => {
    const ctx = typeof window !== 'undefined' ? window : self;
    
    ctx.__uv$config = {
        prefix: '/uv/service/',
        bare: location.origin + '/bare/',
        handler: '/uv/uv.handler.js',
        bundle: '/uv/uv.bundle.js',
        config: '/uv/uv.config.js',
        sw: '/uv/sw.js',
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode
    };
})();