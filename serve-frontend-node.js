#!/usr/bin/env node
/**
 * Simple Node.js HTTP server for serving frontend files
 * More reliable than Python's SimpleHTTPServer for modern browsers
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;
const ROOT_DIR = path.join(__dirname, 'frontend');

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // Parse URL and remove query string
    let filePath = req.url.split('?')[0];
    
    // Default to index.html for directory requests
    if (filePath === '/' || filePath.endsWith('/')) {
        filePath += 'index.html';
    }

    // Build full file path
    const fullPath = path.join(ROOT_DIR, filePath);

    // Security check - prevent directory traversal
    if (!fullPath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    // Check if file exists
    fs.stat(fullPath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        // Get MIME type
        const ext = path.extname(fullPath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        // Read and serve file
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                return;
            }

            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': data.length,
                'Cache-Control': 'no-cache'
            });
            res.end(data);
        });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('Frontend Server Started');
    console.log('='.repeat(60));
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log(`Experimental viz: http://localhost:${PORT}/experimental/annular-viz.html`);
    console.log('');
    console.log('Make sure backend is running on port 3001:');
    console.log('  cd backend && npm start');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('='.repeat(60));
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop the other server first.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});

// Made with Bob
