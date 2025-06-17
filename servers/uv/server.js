const express = require('express');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { join } = require('path');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer();
const PORT = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Create bare server
const bareServer = createBareServer('/bare/');

// Serve UV files needed for proxy functionality
app.use('/uv/', express.static(uvPath));

// Create simple status endpoint
app.get('/status', (req, res) => {
    res.json({ status: 'ok', type: 'UV Proxy Server' });
});

// Handle requests
server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

// Handle upgrades
server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`UV proxy server running at http://localhost:${PORT}`);
    console.log(`Use this URL in Aurora settings: http://localhost:${PORT}`);
    console.log(`Or if accessing remotely, use: https://your-domain:${PORT}`);
    console.log(`Example proxy configuration:`);
    console.log(`Current Server: http://localhost:${PORT}`);
});