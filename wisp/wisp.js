// Wisp Client Implementation
class WispConnection extends EventTarget {
    constructor(url) {
        super();
        this.url = url;
        this.ws = new WebSocket(url);
        this.streams = new Map();
        this.nextStreamId = 1;
        
        this.ws.binaryType = "arraybuffer";
        this.ws.addEventListener("open", () => {
            this.dispatchEvent(new Event("open"));
        });
        this.ws.addEventListener("message", (event) => {
            this.handleMessage(event.data);
        });
        this.ws.addEventListener("close", () => {
            this.dispatchEvent(new Event("close"));
        });
        this.ws.addEventListener("error", (event) => {
            this.dispatchEvent(new ErrorEvent("error", {error: event.error}));
        });
    }

    create_stream(hostname, port, type = "tcp") {
        const stream = new WispStream(this, this.nextStreamId++, hostname, port, type);
        this.streams.set(stream.id, stream);
        const msg = new Uint8Array([
            0x01, // Create stream
            ...new TextEncoder().encode(JSON.stringify({
                id: stream.id,
                hostname,
                port,
                type
            }))
        ]);
        this.ws.send(msg);
        return stream;
    }

    handleMessage(data) {
        const view = new DataView(data);
        const type = view.getUint8(0);
        const streamId = view.getUint32(1);
        const stream = this.streams.get(streamId);
        
        if (!stream) return;
        
        switch(type) {
            case 0x02: // Data
                stream.dispatchEvent(new MessageEvent("message", {
                    data: new Uint8Array(data, 5)
                }));
                break;
            case 0x03: // Close
                stream.dispatchEvent(new CloseEvent("close", {
                    code: view.getUint16(5)
                }));
                this.streams.delete(streamId);
                break;
            case 0x04: // Error
                const errorText = new TextDecoder().decode(new Uint8Array(data, 5));
                stream.dispatchEvent(new ErrorEvent("error", {
                    error: new Error(errorText)
                }));
                break;
        }
    }
}

class WispStream extends EventTarget {
    constructor(conn, id, hostname, port, type) {
        super();
        this.conn = conn;
        this.id = id;
        this.hostname = hostname;
        this.port = port;
        this.type = type;
    }

    send(data) {
        if (!(data instanceof Uint8Array)) {
            throw new Error("Data must be a Uint8Array");
        }
        const msg = new Uint8Array(5 + data.length);
        msg[0] = 0x02; // Data message
        new DataView(msg.buffer).setUint32(1, this.id);
        msg.set(data, 5);
        this.conn.ws.send(msg);
    }

    close() {
        const msg = new Uint8Array([0x03, ...new Uint32Array([this.id])]);
        this.conn.ws.send(msg);
    }
}

// WebSocket Polyfill 
class WispWebSocket extends EventTarget {
    constructor(url) {
        super();
        const parsedUrl = new URL(url);
        const [hostname, port] = parsedUrl.pathname.split("/").pop().split(":");
        
        if (!window._wisp_connections) {
            window._wisp_connections = new Map();
        }

        let baseUrl = parsedUrl.href.replace(parsedUrl.pathname, "/wisp/");
        let conn = window._wisp_connections.get(baseUrl);
        
        if (!conn) {
            conn = new WispConnection(baseUrl);
            window._wisp_connections.set(baseUrl, conn);
        }

        conn.addEventListener("open", () => {
            this.stream = conn.create_stream(hostname, parseInt(port) || 80);
            this.stream.addEventListener("message", (event) => {
                this.dispatchEvent(new MessageEvent("message", {data: event.data}));
            });
            this.stream.addEventListener("close", (event) => {
                this.dispatchEvent(new CloseEvent("close", {code: event.code}));
            });
            this.dispatchEvent(new Event("open"));
        });
    }

    send(data) {
        if (typeof data === "string") {
            data = new TextEncoder().encode(data);
        }
        this.stream.send(data);
    }

    close() {
        this.stream?.close();
    }
}

window.WispConnection = WispConnection;
window.WispWebSocket = WispWebSocket;