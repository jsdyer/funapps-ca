'use strict';

const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { createRooms, RoomError } = require('./rooms.cjs');

const MAX_BODY = 4096;
const ROOT = path.join(__dirname, '..');
const SITE_FILES = [
  'index.html', 'favicon.svg', 'styles.css', 'games.css', 'postcards.css',
  'roadtrip.css', 'extra.css', 'games.js', 'postcards.js', 'roadtrip.js',
  'extra.js', 'extensions.js', 'app.js', 'multiplayer/index.html',
  'rain-window.css', 'rain-window.js', 'postcard-maker.css', 'postcard-maker.js',
  'multiplayer/rooms.css', 'multiplayer/rooms.js', 'multiplayer/mosaic.css', 'multiplayer/mosaic.js'
];
const PUBLIC_FILES = new Map(SITE_FILES.map(file => ['/' + file, file]));
PUBLIC_FILES.set('/', 'index.html');
PUBLIC_FILES.set('/multiplayer/', 'multiplayer/index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function requireSameOrigin(request) {
  const { origin, host } = request.headers;
  if (origin) {
    let source;
    try { source = new URL(origin); } catch { /* invalid origin */ }
    if (!source || !['http:', 'https:'].includes(source.protocol) || source.host !== host) {
      throw new RoomError(403, 'Open this page from the same site as the room.');
    }
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const mediaType = request.headers['content-type']?.split(';')[0].trim().toLowerCase();
    if (mediaType !== 'application/json') {
      request.resume();
      reject(new RoomError(415, 'Send a JSON request.'));
      return;
    }
    if (Number(request.headers['content-length']) > MAX_BODY) {
      request.resume();
      reject(new RoomError(413, 'That request is too large.'));
      return;
    }
    let size = 0;
    let chunks = [];
    let oversized = false;
    request.on('data', chunk => {
      size += chunk.length;
      if (size <= MAX_BODY) chunks.push(chunk);
      else if (!oversized) {
        oversized = true;
        chunks = [];
        reject(new RoomError(413, 'That request is too large.'));
      }
    });
    request.on('error', reject);
    request.on('end', () => {
      if (size > MAX_BODY) {
        reject(new RoomError(413, 'That request is too large.'));
        return;
      }
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
        resolve(body);
      } catch {
        reject(new RoomError(400, 'Send a valid JSON object.'));
      }
    });
  });
}

function tokenFrom(request) {
  const match = /^Bearer ([A-Za-z0-9_-]{32})$/.exec(request.headers.authorization || '');
  if (!match) throw new RoomError(401, 'Join the room first.');
  return match[1];
}

function createApp() {
  const rooms = createRooms();

  const server = http.createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const { pathname } = new URL(request.url, 'http://localhost');
      const method = request.method;
      if (method === 'GET' && pathname === '/api/health') {
        return json(response, 200, { ok: true });
      }
      if (method === 'POST' && pathname === '/api/rooms') {
        requireSameOrigin(request);
        const { name } = await readBody(request);
        return json(response, 201, rooms.create(name));
      }
      const route = /^\/api\/rooms\/([A-Z2-9]{6})\/(join|events|actions)$/.exec(pathname);
      if (route) {
        const [, code, endpoint] = route;
        if (method === 'POST' && endpoint === 'join') {
          requireSameOrigin(request);
          const { name } = await readBody(request);
          return json(response, 201, rooms.join(code, name));
        }
        if (method === 'POST' && endpoint === 'actions') {
          requireSameOrigin(request);
          const token = tokenFrom(request);
          rooms.action(code, token, await readBody(request));
          return json(response, 200, { ok: true });
        }
        if (method === 'GET' && endpoint === 'events') {
          return rooms.connect(code, tokenFrom(request), response);
        }
      }

      if (method === 'GET' || method === 'HEAD') {
        if (pathname === '/multiplayer') {
          const url = new URL(request.url, 'http://localhost');
          response.writeHead(308, { Location: '/multiplayer/' + url.search });
          return response.end();
        }
        const file = PUBLIC_FILES.get(pathname);
        if (file) {
          const content = await readFile(path.join(ROOT, file));
          response.writeHead(200, {
            'Content-Type': MIME[path.extname(file)],
            'Content-Length': content.length,
            'Cache-Control': 'no-cache'
          });
          return response.end(method === 'HEAD' ? undefined : content);
        }
      }
      return json(response, 404, { error: 'That page or action could not be found.' });
    } catch (error) {
      if (response.destroyed) return;
      if (response.headersSent) return response.destroy();
      if (error instanceof RoomError) {
        if (error.status === 413) response.setHeader('Connection', 'close');
        return json(response, error.status, { error: error.message });
      }
      console.error('Fun Apps request failed:', error.message);
      return json(response, 500, { error: 'Something went wrong. Try again in a moment.' });
    }
  });

  server.on('close', rooms.close);
  return {
    server,
    close(callback) {
      rooms.close();
      server.close(callback);
    }
  };
}

if (require.main === module) {
  const app = createApp();
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  app.server.listen(port, host, () => console.log(`Fun Apps is listening on http://${host}:${port}`));
  process.once('SIGINT', () => app.close());
  process.once('SIGTERM', () => app.close());
}

module.exports = { createApp };
