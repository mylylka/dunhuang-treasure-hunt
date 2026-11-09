import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const simulated = !process.argv.includes('--native-lan');
const coldOnly = process.argv.includes('--cold-only');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const records = [];
try {
  for (const [chapter, id] of [[1, 'music-hidden-objects-intro'], [2, 'music-hidden-objects-ch2-02'], [3, 'music-hidden-objects-ch3-01']]) {
    const context = await browser.newContext({ viewport: { width: 852, height: 330 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    if (simulated) {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 35, downloadThroughput: 1024 * 1024, uploadThroughput: 256 * 1024 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    const transfers = [], pending = new Set();
    page.on('response', response => {
      // Blob images are decoded from bytes already fetched by Phaser, not new
      // network transfers. Chromium may also report negative sizes for cache hits.
      if (!/^https?:/.test(response.url())) return;
      const task = response.finished().then(async () => {
        const sizes = await response.request().sizes();
        transfers.push({ url: response.url(), bytes: Math.max(0, sizes.responseBodySize), encoding: response.headers()['content-encoding'] ?? 'raw', status: response.status() });
      }).catch(() => {}).finally(() => pending.delete(task));
      pending.add(task);
    });
    async function visit(levelId, mode, navigate) {
      const start = Date.now(), transferStart = transfers.length;
      await navigate();
      await expect(page.locator('.hidden-object-screen')).toHaveAttribute('data-level-id', levelId);
      const preview = page.getByTestId('hidden-object-ready-target');
      await expect(preview.first()).toBeVisible({ timeout: 20000 });
      const targetFrameMs = Date.now() - start;
      await page.locator('.hidden-object-ready img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const targetImagesMs = Date.now() - start;
      await expect(page.getByRole('button', { name: '开始寻找', exact: true })).toBeEnabled({ timeout: 20000 });
      const readyMs = Date.now() - start;
      await Promise.all([...pending]);
      const current = transfers.slice(transferStart);
      const paints = await page.evaluate(() => performance.getEntriesByType('paint').map(p => ({ name: p.name, startTime: p.startTime })));
      const raw = await page.getByTestId('phaser-player').getAttribute('data-layout');
      records.push({ chapter, levelId, mode, networkMbps: simulated ? 8 : null, cpuSlowdown: simulated ? 4 : 1, targetFrameMs, targetImagesMs, readyMs,
        ...(mode === 'cold' ? { paints } : {}), bytes: current.reduce((sum, item) => sum + item.bytes, 0),
        requests: current.length, failures: current.filter(item => item.status >= 400), seed: JSON.parse(raw).seed,
        threeRequested: current.some(item => /three|terrain-preview/.test(item.url)),
        largest: [...current].sort((a, b) => b.bytes - a.bytes).slice(0, 4) });
    }
    await visit(id, 'cold', () => page.goto(`${base}#/play/${id}`, { waitUntil: 'domcontentloaded' }));
    if (!coldOnly) {
    // Reload has a fresh JS context and GPU scene but reuses the real HTTP image cache.
    await visit(id, 'cached-reload', () => page.reload({ waitUntil: 'domcontentloaded' }));
    const nextId = chapter === 1 ? 'music-hidden-objects-ch1-02' : chapter === 2 ? 'music-hidden-objects-ch2-03' : 'music-hidden-objects-ch3-02';
    await visit(nextId, 'next-level', () => page.evaluate(next => { location.hash = `/play/${next}`; }, nextId));
    }
    await context.close();
  }
  const result = { base, measuredAt: new Date().toISOString(), note: `${simulated ? 'Chrome controlled simulation' : 'Unthrottled local Chrome over LAN address'}; not physical iPhone measurements. Bytes use browser transfer accounting.`, records };
  await writeFile(`work/hidden-object-load-${simulated ? 'after' : 'native'}${coldOnly ? '-final' : ''}.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
