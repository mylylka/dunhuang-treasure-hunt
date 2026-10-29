import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const chromeChannel = process.platform === 'darwin' && existsSync('/Applications/Google Chrome.app') ? 'chrome' : undefined;
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './work/test-results',
  fullyParallel: false,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], channel: chromeChannel, viewport: { width: 1440, height: 1000 }, launchOptions: { args: ['--enable-unsafe-swiftshader'] } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], channel: chromeChannel, viewport: { width: 390, height: 844 }, launchOptions: { args: ['--enable-unsafe-swiftshader'] } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } }
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 45000 },
});
