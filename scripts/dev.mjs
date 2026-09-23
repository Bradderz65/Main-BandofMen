import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import contact from '../netlify/functions/contact.js';
import './build.mjs';

const root = resolve('dist');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        if (url.pathname === '/.netlify/functions/contact') {
            const request = new Request(url, { method: req.method, headers: req.headers, ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: req, duplex: 'half' } : {}) });
            const response = await contact(request);
            res.writeHead(response.status, Object.fromEntries(response.headers));
            res.end(await response.text());
            return;
        }
        if (['/account', '/account.html'].includes(url.pathname)) {
            res.writeHead(301, { Location: '/' }); res.end(); return;
        }
        if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
        let path = resolve(root, '.' + decodeURIComponent(url.pathname));
        if (path !== root && !path.startsWith(root + sep)) { res.writeHead(404); res.end(); return; }
        if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
        const body = await readFile(path);
        res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(await readFile(resolve(root, '404.html')));
    }
}).listen(port, '127.0.0.1', () => console.log(`Band of Men: http://127.0.0.1:${port}`));
