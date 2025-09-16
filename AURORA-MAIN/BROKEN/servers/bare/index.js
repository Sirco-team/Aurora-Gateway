const express = require('express');
const { createBareServer } = require('@tomphttp/bare-server-node');
const cors = require('cors');
const http = require('http');

const app = express();
const bareServer = createBareServer('/bare/');
const port = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Create HTTP server
const server = http.createServer();

// Handle Bare requests
server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

server.listen(port, () => {
    console.log(`Bare server running on port ${port}`);
});