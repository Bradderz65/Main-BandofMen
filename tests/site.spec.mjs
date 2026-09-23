import { test as base, expect, chromium } from '@playwright/test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const test = base.extend({
    browser: [async ({}, use) => {
        const browser = process.env.CDP_ENDPOINT ? await chromium.connectOverCDP(process.env.CDP_ENDPOINT) : await chromium.launch();
        await use(browser);
        await browser.close();
    }, { scope: 'worker' }]
});

test('responsive layout, image loading, links and console', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 375, 390, 600, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.locator('h1')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    for (const img of await page.locator('img:visible').all()) {
        await img.scrollIntoViewIfNeeded();
        await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    for (const link of await page.locator('a[href*="booksy.com"]').all()) {
        expect(await link.getAttribute('href')).toContain('122744_band-of-men-barber-salon');
        expect(await link.getAttribute('rel')).toContain('noopener');
    }
    expect(errors).toEqual([]);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
    await page.screenshot({ path: 'test-results/desktop-viewport.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
    await page.screenshot({ path: 'test-results/mobile-viewport.png' });
});

test('mobile menu, native anchors, resize and keyboard service tabs', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const toggle = page.locator('#menuToggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(page.locator('#mobileMenu')).toBeHidden();
    await toggle.click();
    await page.locator('#mobileMenu').getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveURL(/#pricing$/);
    await expect(page.locator('#mobileMenu')).toBeHidden();
    const hair = page.getByRole('tab', { name: 'Hair & beard' });
    await hair.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Face & body waxing' })).toBeFocused();
    await expect(page.locator('#wax')).toBeVisible();
    await expect(page.locator('#hair')).toBeHidden();
    await page.keyboard.press('End');
    await expect(page.locator('#intimate')).toBeVisible();
    await page.keyboard.press('Home');
    await expect(hair).toBeFocused();
    await toggle.click();
    await page.setViewportSize({ width: 1200, height: 900 });
    await expect(page.locator('#mobileMenu')).toBeHidden();
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('gallery paging, modal focus, arrows, Escape and FAQ', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.gallery-item:visible')).toHaveCount(6);
    const first = page.locator('.gallery-item').first();
    await first.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.lightbox-counter')).toHaveText('1 / 42');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.lightbox-counter')).toHaveText('2 / 42');
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(first).toBeFocused();
    await expect(page.getByRole('dialog')).toBeHidden();
    for (let i = 0; i < 6; i++) await page.locator('#gallery-btn').click();
    await expect(page.locator('.gallery-item:visible')).toHaveCount(42);
    await page.locator('#gallery-btn').click();
    await expect(page.locator('.gallery-item:visible')).toHaveCount(6);
    await page.getByText('Do you take walk-ins?', { exact: true }).click();
    await expect(page.getByText('The salon is appointment-only.', { exact: false })).toBeVisible();
});

async function fillEnquiry(page) {
    await page.getByLabel('Your name', { exact: true }).fill('Test Visitor');
    await page.getByLabel('Email address').fill('visitor@example.com');
    await page.getByLabel('Your message').fill('A test enquiry for browser verification.');
}

test('form validation, unavailable hosting, rate limiting, retry and success', async ({ page }) => {
    await page.goto('/');
    let calls = 0;
    await page.route('**/.netlify/functions/contact', (route) => { calls++; return route.fulfill({ status: 404, body: 'Not found' }); });
    await page.getByRole('button', { name: 'Send message' }).click();
    expect(calls).toBe(0);
    await fillEnquiry(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contactFallback')).toBeVisible();
    await expect(page.getByLabel('Your message')).not.toBeEmpty();
    expect(await page.locator('#contactFallback').getAttribute('href')).toContain('visitor%40example.com');
    await page.unroute('**/.netlify/functions/contact');
    await page.route('**/.netlify/functions/contact', (route) => route.fulfill({ status: 429, body: 'Too many requests' }));
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contactStatus')).toContainText('wait');
    await page.unroute('**/.netlify/functions/contact');
    await page.route('**/.netlify/functions/contact', (route) => route.fulfill({ json: { success: true } }));
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contactStatus')).toContainText('Message sent.');
    await expect(page.getByLabel('Your message')).toBeEmpty();
    await expect(page.locator('#contactFallback')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
});

test('content and links still work with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4174/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.pricing-row:visible')).toHaveCount(37);
    await expect(page.locator('.gallery-item:visible')).toHaveCount(42);
    await expect(page.locator('#menuToggle')).toBeHidden();
    await expect(page.locator('.hero-actions a').first()).toBeVisible();
    await context.close();
});

test('automated accessibility checks at desktop and phone sizes', async ({ page }) => {
    for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations);
        expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
    }
});

test('returning visitors bypass old scripts and retire only the salon cache', async ({ browser }) => {
    const { createServer } = await import('node:http');
    const { readFile } = await import('node:fs/promises');
    let cleanup = false;
    const legacy = `self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', e => e.waitUntil(self.clients.claim())); self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));`;
    const server = createServer(async (req, res) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (pathname === '/seed') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Cache migration test</title>'); return; }
        try {
            const path = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
            const content = path === '/sw.js' && !cleanup ? legacy : await readFile(`dist${path}`);
            const type = path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.webp') ? 'image/webp' : path.endsWith('.html') ? 'text/html' : 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(content);
        } catch { res.writeHead(404); res.end(); }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await page.goto(origin + '/seed');
        await page.evaluate(async () => {
            await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            const cache = await caches.open('bom-static-v4');
            await cache.put('/js/tabs.js', new Response('window.legacyTabs = true;', { headers: { 'Content-Type': 'text/javascript' } }));
            await caches.open('unrelated-cache');
        });
        cleanup = true;
        await page.goto(origin + '/');
        await expect(page.getByRole('tab', { name: 'Hair & beard' })).toBeVisible();
        expect(await page.evaluate(() => window.legacyTabs)).toBeUndefined();
        await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
        const keys = await page.evaluate(() => caches.keys());
        expect(keys).toContain('unrelated-cache');
        expect(keys).not.toContain('bom-static-v4');
    } finally {
        await context.close();
        await new Promise((resolve) => server.close(resolve));
    }
});
