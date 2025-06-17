// UV Client initialization
(() => {
    const ctx = typeof window !== 'undefined' ? window : self;
    
    if (!ctx.client) {
        ctx.client = {};
        
        // Core event system
        const eventSystem = {
            events: {},
            on(event, fn) {
                if (!this.events[event]) this.events[event] = [];
                this.events[event].push(fn);
            },
            emit(event, data) {
                if (this.events[event]) {
                    this.events[event].forEach(fn => fn(data));
                }
            }
        };

        // Add core methods
        ctx.client = Object.assign(ctx.client, {
            nativeMethods: {
                defineProperty: Object.defineProperty,
                getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
                getOwnPropertyNames: Object.getOwnPropertyNames
            }
        });

        // Add event system
        Object.assign(ctx.client, eventSystem);

        // Create module prototypes with event system
        ['fetch', 'xhr', 'element', 'document', 'attribute', 'url', 'storage', 
         'style', 'worker', 'location', 'message', 'navigator', 'object', 
         'function', 'history', 'eventSource', 'websocket'].forEach(name => {
            const module = Object.create(eventSystem);
            module.events = {};
            ctx.client[name] = module;
        });
    }

    // Initialize UV if not already done
    if (!ctx.__uv) {
        ctx.__uv = {
            methods: {},
            meta: {},
            handler: {},
            config: ctx.__uv$config || {}
        };
    }
})();