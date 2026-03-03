import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,         // ekranlar sıralı — login state kullanılacak
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',           // her test için screenshot
    video: 'off',
    headless: true,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',  // system Chrome kullan (indirme gerekmez)
      },
    },
  ],
  outputDir: 'test-results',
});
