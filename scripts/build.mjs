import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
// Explicit public files: never copy functions, environment files, archives or tooling.
const assets = [
    'index.html', '404.html', 'robots.txt', 'sitemap.xml', 'sw.js',
    'favicon.ico', 'favicon', 'Photos', '.well-known',
    'css/site.css', 'js/navigation.js', 'js/tabs.js', 'js/gallery.js',
    'js/open-status.js', 'js/contact-mailto.js', 'js/main.js', 'js/sw-register.js'
];
for (const asset of assets) await cp(asset, `dist/${asset}`, { recursive: true });
// New content URLs also bypass the old service worker on a visitor's first return.
for (const page of ['index.html', '404.html']) {
    let html = await readFile(`dist/${page}`, 'utf8');
    for (const match of [...html.matchAll(/(?:src|href)="((?:css|js)\/[^"?]+)(?:\?[^\"]*)?"/g)]) {
        const hash = createHash('sha256').update(await readFile(match[1])).digest('hex').slice(0, 12);
        html = html.replace(match[0], match[0].replace(/=".*"$/, `="${match[1]}?v=${hash}"`));
    }
    await writeFile(`dist/${page}`, html);
}
try { await cp('CNAME', 'dist/CNAME'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log('Built public site in dist/');
