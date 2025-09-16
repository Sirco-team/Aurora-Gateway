// UV Core initialization
(function(scope) {
    if (!scope.client) {
        scope.client = {
            events: {},
            on: function(event, fn) {
                if (!this.events[event]) this.events[event] = [];
                this.events[event].push(fn);
            },
            emit: function(event, data) {
                if (this.events[event]) {
                    this.events[event].forEach(fn => fn(data));
                }
            },
            nativeMethods: {
                defineProperty: Object.defineProperty,
                getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
                getOwnPropertyNames: Object.getOwnPropertyNames,
                getPrototypeOf: Object.getPrototypeOf,
                isExtensible: Object.isExtensible,
                fnToString: Function.prototype.toString,
                call: Function.prototype.call,
                keys: Object.keys
            }
        };

        // Add client modules
        ['fetch', 'xhr', 'element', 'document', 'attribute', 'url', 'storage', 
         'style', 'worker', 'location', 'message', 'navigator', 'object', 
         'function', 'history', 'eventSource', 'websocket'].forEach(name => {
            scope.client[name] = {
                events: {},
                on: function(event, fn) {
                    if (!this.events[event]) this.events[event] = [];
                    this.events[event].push(fn);
                },
                emit: function(event, data) {
                    if (this.events[event]) {
                        this.events[event].forEach(fn => fn(data));
                    }
                }
            };
        });
    }

    if (!scope.__uv) {
        scope.__uv = {
            handler: {},
            methods: {
                setSource: '__uv$setSource',
                source: '__uv$source',
                location: '__uv$location',
                function: '__uv$function',
                string: '__uv$string',
                eval: '__uv$eval',
                parent: '__uv$parent',
                top: '__uv$top'
            }
        };
    }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this);