class AuroraWebSocket {
    constructor(url, options = {}) {
        this.url = url;
        this.options = options;
        this.ws = null;
        this.proxyWs = null;
        this.connected = false;
        this.messageQueue = [];
        this.listeners = {
            message: [],
            open: [],
            close: [],
            error: []
        };
    }

    connect(proxyUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.proxyWs = new WebSocket(proxyUrl);
                
                this.proxyWs.onopen = () => {
                    // Request connection to target
                    this.proxyWs.send(JSON.stringify({
                        type: 'connect',
                        url: this.url,
                        headers: this.options.headers || {}
                    }));
                };

                this.proxyWs.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    
                    switch(message.type) {
                        case 'connected':
                            this.connected = true;
                            this.emit('open');
                            resolve();
                            // Send queued messages
                            while (this.messageQueue.length > 0) {
                                this.send(this.messageQueue.shift());
                            }
                            break;
                            
                        case 'message':
                            this.emit('message', { data: message.data });
                            break;
                            
                        case 'error':
                            this.emit('error', new Error(message.error));
                            break;
                            
                        case 'closed':
                            this.connected = false;
                            this.emit('close');
                            break;
                    }
                };

                this.proxyWs.onclose = () => {
                    this.connected = false;
                    this.emit('close');
                };

                this.proxyWs.onerror = (error) => {
                    this.emit('error', error);
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    send(data) {
        if (!this.connected) {
            this.messageQueue.push(data);
            return;
        }

        this.proxyWs.send(JSON.stringify({
            type: 'send',
            data: data
        }));
    }

    close() {
        if (this.proxyWs) {
            this.proxyWs.close();
        }
    }

    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    removeEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}