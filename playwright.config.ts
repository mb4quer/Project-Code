import { defineConfig } from '@playwright/test';
const baseURL = process.env.PROJECT_CODE_TEST_URL ?? 'http://127.0.0.1:5173';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  timeout: 35_000, expect: { timeout: 15_000 },
  use: { baseURL, browserName: 'chromium', channel: 'msedge', headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure' },
  webServer: { command: baseURL.endsWith(':4173') ? 'npm run preview' : 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 30_000 },
});
