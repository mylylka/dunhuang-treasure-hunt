import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, expect } from '@playwright/test';

// A real subdirectory server catches root-relative asset mistakes before Pages deployment.
const root = resolve('outputs/web');
const prefix = '/dunhuang-preview/';
const output = resolve('work/world');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.wav': 'audio/wav' };
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith(prefix)) throw new Error('Outside test prefix');
    const file = resolve(root, path.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + sep)) throw new Error('Outside output');
    res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
let browser;
const report = { stage: 'art-sample-v002', environment: 'local automated Chromium, not a real-phone performance acceptance', checks: [], metrics: {} };
try {
  browser = await chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : undefined, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.addInitScript(() => {
    window.__worldDraws = 0;
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      if (this.canvas.dataset?.worldCanvas === 'true') window.__worldDraws++;
      return original.apply(this, args);
    };
  });
  await page.goto(`${base}#/`);
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true');
  report.metrics.navigationToReadyMs = Math.round(await page.evaluate(() => performance.now()));
  report.metrics.firstTransferBytes = await page.evaluate(() => performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0));
  await expect(page.locator('canvas[data-world-canvas]')).toHaveCount(1);
  const avatarCanvas = page.locator('canvas[data-world-canvas]');
  await expect(avatarCanvas).toHaveAttribute('data-animation', 'Idle');
  await page.keyboard.down('w');
  await expect(avatarCanvas).toHaveAttribute('data-animation', 'Walk');
  await page.keyboard.down('Shift');
  await expect(avatarCanvas).toHaveAttribute('data-animation', 'Run');
  await page.keyboard.up('w'); await page.keyboard.up('Shift');
  await expect(avatarCanvas).toHaveAttribute('data-animation', 'Idle');
  const modelResources = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.endsWith('.glb')).map(entry => entry.name));
  expect(modelResources.some(url => url.includes('/dunhuang-preview/assets/world/courtyard/v002/courtyard.glb'))).toBe(true);
  expect(modelResources.some(url => url.includes('/dunhuang-preview/assets/world/shared/v001/traveler.glb'))).toBe(true);
  report.checks.push('Both real GLB assets load under subdirectory; Idle/Walk/Run switch with player input');
  await page.screenshot({ path: `${output}/art-sample-v002-world-spawn.png` });
  report.metrics.frameIntervals = await page.evaluate(async () => {
    const samples = []; let last = performance.now();
    await new Promise(resolve => {
      const tick = now => { samples.push(now - last); last = now; if (samples.length < 180) requestAnimationFrame(tick); else resolve(); };
      requestAnimationFrame(tick);
    });
    const ordered = samples.slice(1).sort((a, b) => a - b);
    return { medianMs: ordered[Math.floor(ordered.length / 2)], p95Ms: ordered[Math.floor(ordered.length * .95)], sampleCount: ordered.length };
  });
  for (let i = 0; i < 3; i++) {
    await page.getByRole('link', { name: '直接选主题', exact: true }).click();
    await expect(page.getByTestId('theme-choice-grid')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    const draws = await page.evaluate(() => window.__worldDraws);
    await page.waitForTimeout(180);
    expect(await page.evaluate(() => window.__worldDraws)).toBe(draws);
    await page.getByTestId('world-return').click();
    await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('canvas[data-world-canvas]')).toHaveCount(1);
  }
  report.checks.push('Three rendering stops after leaving world; three repeated returns have one canvas');
  await page.goto(`${base}#/play/patterns-intro`);
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: 45_000 });
  await expect(page.locator('canvas[data-world-canvas]')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(1);
  report.checks.push('Phaser game and 3D canvas do not coexist');
  await page.close();

  // New tab has an independent session, seeded before application code runs.
  const touch = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const mobile = await touch.newPage();
  await mobile.goto(`${base}#/`);
  await expect(mobile.getByTestId('world-host')).toHaveAttribute('data-ready', 'true');
  const stick = await mobile.getByRole('group', { name: '拖动摇杆行走' }).boundingBox();
  const initialZ = Number(await mobile.getByTestId('world-position').getAttribute('data-z'));
  const cdp = await touch.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: stick.x + stick.width / 2, y: stick.y + stick.height / 2, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: stick.x + stick.width / 2, y: stick.y + 12, id: 1 }] });
  await mobile.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => Number(await mobile.getByTestId('world-position').getAttribute('data-z'))).toBeLessThan(initialZ - .5);
  await mobile.waitForTimeout(180);
  const stoppedZ = Number(await mobile.getByTestId('world-position').getAttribute('data-z'));
  await mobile.waitForTimeout(250);
  expect(Number(await mobile.getByTestId('world-position').getAttribute('data-z'))).toBe(stoppedZ);
  await mobile.screenshot({ path: `${output}/art-sample-v002-world-mobile.png` });
  report.checks.push('Real dispatched touch drag moves joystick; release stops movement');
  await touch.close();

  for (const [name, position] of [['courtyard', { x: -12, z: -6 }], ['caisson', { x: -12, z: -17 }], ['story', { x: -5.3, z: -5.8 }]]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(position => sessionStorage.setItem('dunhuang:world-session:v1', JSON.stringify({ version: 1, position, heading: 0, cameraYaw: 0, visitedEvents: [] })), position);
    const screen = await context.newPage();
    screen.on('pageerror', e => errors.push(e.message));
    screen.on('response', res => { if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`); });
    await screen.goto(`${base}#/`);
    await expect(screen.getByTestId('world-host')).toHaveAttribute('data-ready', 'true');
    if (name !== 'courtyard') await screen.getByTestId('world-interact').click();
    if (name === 'story') {
      await screen.getByTestId('world-story-start').click();
      await screen.locator('.world-story-art img').evaluate(img => img.decode());
      expect(await screen.locator('.world-story-art img').getAttribute('src')).toContain('assets/world/story/v001/');
    }
    await screen.waitForTimeout(100);
    await screen.screenshot({ path: `${output}/art-sample-v002-world-${name}.png` });
    expect(await screen.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }))).toEqual({ w: 1440, h: 900 });
    await context.close();
  }
  report.checks.push('Caisson and story fit viewport; story assets load under a real URL subdirectory');

  const blocked = await browser.newPage();
  await blocked.route('**/WorldScreen-*.js', route => route.abort());
  await blocked.goto(`${base}#/`);
  await expect(blocked.getByRole('heading', { name: '探索世界暂未加载' })).toBeVisible();
  await blocked.getByRole('link', { name: '直接选择文化主题', exact: true }).click();
  await expect(blocked.getByTestId('theme-choice-grid')).toBeVisible();
  report.checks.push('Outer lazy chunk failure retains a working theme fallback');
  await blocked.close();
  expect(errors).toEqual([]);
  report.checks.push('No unexpected page errors or failed production asset responses');
  report.passed = true;
  await writeFile(`${output}/art-sample-v002-production-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
