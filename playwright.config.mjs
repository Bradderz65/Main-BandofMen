import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests', testMatch: '*.spec.mjs', timeout: 45_000, workers: 1,
    reporter: 'list', use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure' },
    webServer: { command: 'node scripts/dev.mjs', url: 'http://127.0.0.1:4174', env: { PORT: '4174' }, reuseExistingServer: !process.env.CI },
});
