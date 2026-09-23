import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';

test('public build contains working asset paths and excludes source-only files', async () => {
    const html = await readFile('dist/index.html', 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, new Set(ids).size, 'IDs must be unique');
    for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (/^(https?:|mailto:|tel:)/.test(url)) continue;
        if (url.startsWith('#')) { assert.ok(ids.includes(url.slice(1)), `Missing anchor ${url}`); continue; }
        const path = decodeURIComponent(url.split('?')[0]);
        if (path === './') continue;
        await access(`dist/${path}`);
    }
    for (const path of ['archive', 'netlify', 'scripts', 'tests', 'package.json', 'account.html', '.env']) {
        await assert.rejects(access(`dist/${path}`));
    }
    assert.deepEqual(await readdir('netlify/functions'), ['contact.js']);
    assert.match(html, /js\/gallery\.js\?v=[0-9a-f]{12}/);
    assert.equal([...html.matchAll(/class="pricing-row"/g)].length, 37);
    assert.equal([...html.matchAll(/class="gallery-item"/g)].length, 42);
});
test('local-business data is valid and no stale review totals remain', async () => {
    const html = await readFile('dist/index.html', 'utf8');
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data.address.postalCode, 'WF3 3AE');
    assert.equal(data.telephone, '+447538740289');
    assert.equal(data.aggregateRating, undefined);
    assert.doesNotMatch(html, /243|preloading|onclick=/);
});
