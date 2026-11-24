// DEVELOPMENT/TEST ONLY: an in-memory implementation of docs/sync-api.md.
//
//   npm run dev:sync-server            (port 4180)
//   node tools/mock-sync-server.mjs --port 5000
//
// Accepts tokens of the form "dev:<name>" (what the development sign-in
// sends). Data is lost when it stops. Do not deploy this.

import http from 'node:http';

const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || Number(process.env.PORT) || 4180;
const MAX_BYTES = 5 * 1024 * 1024;

/** accountId -> { revision, updatedAt, data } */
const accounts = new Map();

function send(res, status, body) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type'
    });
    res.end(body === undefined ? '' : JSON.stringify(body));
}

function accountFor(req) {
    const match = /^Bearer dev:(.{1,64})$/.exec(req.headers.authorization ?? '');
    if (!match) return null;
    const name = match[1].trim();
    return name ? { id: name.toLowerCase(), displayName: name } : null;
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BYTES) reject(Object.assign(new Error('too large'), { status: 413 }));
            else chunks.push(chunk);
        });
        req.on('end', () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
            catch { reject(Object.assign(new Error('invalid JSON'), { status: 400 })); }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    try {
        if (req.method === 'OPTIONS') return send(res, 204);
        if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true });
        if (req.method === 'POST' && path === '/__reset') { accounts.clear(); return send(res, 200, { ok: true }); }

        const account = accountFor(req);
        if (!account) return send(res, 401, { error: 'unauthorized' });

        if (req.method === 'GET' && path === '/v1/me') return send(res, 200, account);

        if (req.method === 'GET' && path === '/v1/data') {
            const stored = accounts.get(account.id);
            return send(res, 200, stored ?? { revision: 0, updatedAt: null, data: null });
        }

        if (req.method === 'PUT' && path === '/v1/data') {
            const body = await readJson(req);
            if (!body || typeof body.baseRevision !== 'number' || !body.data || typeof body.data !== 'object') {
                return send(res, 400, { error: 'expected {baseRevision: number, data: object}' });
            }
            const stored = accounts.get(account.id);
            const current = stored?.revision ?? 0;
            if (body.baseRevision !== current) return send(res, 409, stored);
            const next = { revision: current + 1, updatedAt: new Date().toISOString(), data: body.data };
            accounts.set(account.id, next);
            return send(res, 200, { revision: next.revision, updatedAt: next.updatedAt });
        }

        send(res, 404, { error: 'not found' });
    } catch (err) {
        send(res, err.status ?? 500, { error: err.message });
    }
});

server.listen(port, '127.0.0.1', () => console.log(`Mock sync server on http://127.0.0.1:${port}`));
