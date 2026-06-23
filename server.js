#!/usr/bin/env node
'use strict';

/* ============================================================
   SAMADHAN TRADING — Local Proxy + Static Server
   Serves the app and proxies Yahoo Finance API calls.
   Zero dependencies — pure Node.js built-in modules.
   
   Usage:  node server.js
           node server.js --port 4000
   ============================================================ */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

// ── CONFIG ──
const PORT = parseInt(process.argv.find((a, i) => process.argv[i - 1] === '--port') || '3000', 10);
const STATIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp4':  'video/mp4',
};

// Yahoo Finance hosts to proxy to
const YAHOO_HOSTS = {
  'query1': 'query1.finance.yahoo.com',
  'query2': 'query2.finance.yahoo.com',
};

// Groww API Bridge (Python server)
const GROWW_BRIDGE_HOST = '127.0.0.1';
const GROWW_BRIDGE_PORT = parseInt(process.env.GROWW_BRIDGE_PORT || '5050', 10);

// Dhan API Bridge (Python server)
const DHAN_BRIDGE_HOST = '127.0.0.1';
const DHAN_BRIDGE_PORT = parseInt(process.env.DHAN_BRIDGE_PORT || '5060', 10);

// ── YAHOO FINANCE PROXY ──
function proxyYahoo(req, res, yahooPath, host) {
  const options = {
    hostname: host,
    port: 443,
    path: yahooPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json,text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Referer': 'https://finance.yahoo.com/',
      'Origin': 'https://finance.yahoo.com',
    },
    timeout: 15000,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Forward status + CORS headers
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Cache-Control': 'no-cache',
      'X-Proxy-Source': 'trading-local',
    });

    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] ${host}${yahooPath} → ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: 'Proxy request failed', detail: err.message }));
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: 'Proxy request timed out' }));
    }
  });

  proxyReq.end();
}

// ── STATIC FILE SERVER ──
function serveStatic(req, res, pathname) {
  // Default to index.html
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  // Security: prevent path traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(STATIC_DIR, safePath);

  // Ensure resolved path is within STATIC_DIR
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try index.html for SPA routing
      const indexPath = path.join(STATIC_DIR, 'index.html');
      fs.readFile(indexPath, (err2, data) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': (ext === '.html' || ext === '.js' || ext === '.css') ? 'no-cache' : 'public, max-age=3600',
      });
      res.end(data);
    });
  });
}

// ── REQUEST HANDLER ──
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // ── Groww API Bridge Proxy ──
  // /api/groww/* → localhost:5050/*
  if (pathname.startsWith('/api/groww/')) {
    const growwPath = '/' + pathname.slice('/api/groww/'.length) + (parsed.search || '');
    console.log(`[Groww Proxy] → localhost:${GROWW_BRIDGE_PORT}${growwPath}`);

    const proxyReq = http.request({
      hostname: GROWW_BRIDGE_HOST,
      port: GROWW_BRIDGE_PORT,
      path: growwPath,
      method: req.method,
      headers: { 'Accept': 'application/json' },
      timeout: 15000,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Cache-Control': 'no-cache',
        'X-Proxy-Source': 'trading-groww',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[Groww Proxy Error] ${growwPath} → ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ error: 'Groww bridge not available', detail: err.message }));
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ error: 'Groww bridge timed out' }));
      }
    });

    proxyReq.end();
    return;
  }

  // ── Dhan API Bridge Proxy ──
  // /api/dhan/* → localhost:5060/*
  if (pathname.startsWith('/api/dhan/')) {
    const dhanPath = '/' + pathname.slice('/api/dhan/'.length) + (parsed.search || '');
    console.log(`[Dhan Proxy] → localhost:${DHAN_BRIDGE_PORT}${dhanPath}`);

    const proxyReq = http.request({
      hostname: DHAN_BRIDGE_HOST,
      port: DHAN_BRIDGE_PORT,
      path: dhanPath,
      method: req.method,
      headers: { 'Accept': 'application/json' },
      timeout: 15000,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Cache-Control': 'no-cache',
        'X-Proxy-Source': 'trading-dhan',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[Dhan Proxy Error] ${dhanPath} → ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ error: 'Dhan bridge not available', detail: err.message }));
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ error: 'Dhan bridge timed out' }));
      }
    });

    proxyReq.end();
    return;
  }

  // ── Yahoo Finance API Proxy Routes ──
  // /api/yahoo1/* → query1.finance.yahoo.com/*
  // /api/yahoo2/* → query2.finance.yahoo.com/*
  if (pathname.startsWith('/api/yahoo1/')) {
    const yahooPath = '/' + pathname.slice('/api/yahoo1/'.length) + (parsed.search || '');
    console.log(`[Proxy] → query1.finance.yahoo.com${yahooPath}`);
    proxyYahoo(req, res, yahooPath, YAHOO_HOSTS.query1);
    return;
  }

  if (pathname.startsWith('/api/yahoo2/')) {
    const yahooPath = '/' + pathname.slice('/api/yahoo2/'.length) + (parsed.search || '');
    console.log(`[Proxy] → query2.finance.yahoo.com${yahooPath}`);
    proxyYahoo(req, res, yahooPath, YAHOO_HOSTS.query2);
    return;
  }

  // ── Yahoo Finance RSS Proxy ──
  if (pathname === '/api/news') {
    const options = {
      hostname: 'finance.yahoo.com',
      port: 443,
      path: '/rss/topstories',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=300',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[News Proxy Error] ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Failed to fetch news RSS feed', detail: err.message }));
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'News proxy request timed out' }));
    });

    proxyReq.end();
    return;
  }

  // ── Health check ──
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now(), proxy: true }));
    return;
  }

  // ── Static Files ──
  serveStatic(req, res, pathname);
});

// ── WEBSOCKET UPGRADE PROXY ──
server.on('upgrade', (req, socket, head) => {
  socket.on('error', (err) => {
    console.warn('[Dhan WS Proxy client socket error before upgrade]', err.message);
  });

  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  if (pathname.startsWith('/api/dhan/')) {
    const targetPath = '/' + pathname.slice('/api/dhan/'.length) + (parsed.search || '');
    console.log(`[Dhan WS Proxy] Upgrading WebSocket connection to localhost:${DHAN_BRIDGE_PORT}${targetPath}`);

    const options = {
      hostname: DHAN_BRIDGE_HOST,
      port: DHAN_BRIDGE_PORT,
      path: targetPath,
      method: 'GET',
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Key': req.headers['sec-websocket-key'],
        'Sec-WebSocket-Version': req.headers['sec-websocket-version'] || '13',
        ...req.headers
      }
    };

    const proxyReq = http.request(options);
    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      // Add error handlers to prevent crash on connection reset/closed sockets
      socket.on('error', (err) => {
        console.warn('[Dhan WS Proxy client socket error]', err.message);
        proxySocket.destroy();
      });
      proxySocket.on('error', (err) => {
        console.warn('[Dhan WS Proxy target socket error]', err.message);
        socket.destroy();
      });

      let responseHeaders = `HTTP/1.1 101 Switching Protocols\r\n`;
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        responseHeaders += `${key}: ${value}\r\n`;
      }
      responseHeaders += '\r\n';
      
      socket.write(responseHeaders);
      
      if (proxyHead && proxyHead.length) {
        socket.write(proxyHead);
      }

      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxyReq.on('error', (err) => {
      console.error(`[Dhan WS Proxy Error] ${pathname} → ${err.message}`);
      socket.destroy();
    });

    proxyReq.end();
  } else {
    socket.destroy();
  }
});

// ── START ──
server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║     🚀 Trading — Live Server                    ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log(`  ║  Local:  http://localhost:${PORT}                   ║`);
  console.log('  ║  Proxy:  Yahoo Finance API (CORS-free)          ║');
  console.log('  ║                                                  ║');
  console.log('  ║  Press Ctrl+C to stop                           ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ❌ Port ${PORT} is already in use. Try: node server.js --port ${PORT + 1}\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
