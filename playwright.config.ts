import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const chromeChannel = process.platform === 'darwin' && existsSync('/Applications/Google Chrome.app') ? 'chrome' : undefined;
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './work/test-results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: process.env.DUNHUANG_TEST_TRACE === '1' ? 'retain-on-failure' : 'off',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], channel: chromeChannel, viewport: { width: 1440, height: 1000 }, launchOptions: { args: ['--enable-unsafe-swiftshader'] } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], channel: chromeChannel, viewport: { width: 844, height: 390 }, launchOptions: { args: ['--enable-unsafe-swiftshader'] } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } }
  ],
  webServer: { command: 'npm run dev -- --port 5174 --configLoader runner', url: 'http://127.0.0.1:5174', reuseExistingServer: false, timeout: 45000 },
});
