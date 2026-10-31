import { chromium, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.ENVIRONMENT_PREVIEW_URL || 'http://localhost:4191/';
const prefix = 'work/world/environment-sample-v003';
const report = { stage: 'independent-vegetation-variants-v003', technicalChecksPassed: false,
  artApproval: { a: 'user-approved-v002', b: 'pending-user-review', c: 'pending-user-review' }, errors: [], views: [], comparisons: [] };
const browser = await chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : undefined, args: ['--enable-unsafe-swiftshader'] });
try {
  const prior = JSON.parse(await readFile('work/world/environment-sample-v002-verification.json', 'utf8'));
  const context = await browser.newContext({ viewport: { width: 1279, height: 925 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base);
  await page.waitForFunction(() => window.__environmentPreview?.ready, undefined, { timeout: 45000 });
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  async function capture(view, variant, family) {
    await page.evaluate(({ view, variant, family }) => {
      const api = window.__environmentPreview;
      api.setTreeVariant(family === 'tree' ? variant : 'a'); api.setShrubVariant(family === 'shrub' ? variant : 'a'); api.setView(view);
    }, { view, variant, family });
    await settle();
    const snapshot = await page.evaluate(() => window.__environmentPreview.snapshot());
    const stats = await page.evaluate(() => window.__environmentPreview.stats());
    expect(snapshot.ready).toBe(true); expect(snapshot.error).toBeFalsy(); expect(stats.triangles).toBeGreaterThan(0);
    expect(stats.referenceNatureVisible).toBe(0);
    const path = `${prefix}-web-${family}-${variant}-${view}.png`;
    await page.screenshot({ path });
    report.views.push({ view, family, variant, path, snapshot, stats });
    const previous = prior.views.find(item => item.view === view);
    if (previous) {
      expect(snapshot.camera, `Preserved v002 camera ${view}`).toEqual(previous.snapshot.camera);
      expect(snapshot.lighting, `Preserved v002 light ${view}`).toEqual(previous.snapshot.lighting);
      expect(snapshot.fog, `Preserved v002 fog ${view}`).toEqual(previous.snapshot.fog);
    }
    return snapshot;
  }
  for (const [family, views] of Object.entries({
    tree: ['road', 'road-tree', 'tree-front', 'tree-side', 'tree-diagonal', 'tree-near', 'tree-far'],
    shrub: ['shrub-road', 'shrub-near', 'shrub-front', 'shrub-side', 'shrub-diagonal'],
  })) for (const view of views) {
    let approved;
    for (const variant of ['a', 'b', 'c']) {
      const snapshot = await capture(view, variant, family);
      if (variant === 'a') approved = snapshot;
      else {
        expect(snapshot.camera).toEqual(approved.camera); expect(snapshot.lighting).toEqual(approved.lighting); expect(snapshot.fog).toEqual(approved.fog);
        const transform = state => state.activeModels.map(({ id, role, position, rotation, scale }) => ({ family: id.split('-')[0], role, position, rotation, scale }))
          .sort((a, b) => `${a.family}/${a.role}`.localeCompare(`${b.family}/${b.role}`));
        expect(transform(snapshot), `Same placement ${view}/${variant}`).toEqual(transform(approved));
        expect(snapshot.activeModels.some(asset => asset.path?.includes(`v003/${family}-${variant}.glb`))).toBe(true);
        report.comparisons.push({ view, family, variant, sameCamera: true, sameLighting: true, samePlacement: true });
      }
    }
  }
  for (const view of ['tree-lineup', 'shrub-lineup', 'dunes', 'dunes-oblique', 'dunes-model', 'dunes-side', 'dunes-diagonal']) {
    const state = await capture(view, 'a', view.startsWith('shrub') ? 'shrub' : view.startsWith('tree') ? 'tree' : 'dunes');
    if (view.endsWith('lineup')) {
      expect(state.activeModels).toHaveLength(3);
      for (const model of state.activeModels) expect(model.scale).toEqual([1, 1, 1]);
    }
  }
  await page.evaluate(() => { window.__environmentPreview.setTreeVariant('b'); window.__environmentPreview.setView('road'); });
  const start = await page.evaluate(() => window.__environmentPreview.snapshot().player);
  await page.locator('canvas').focus(); await page.keyboard.down('w'); await page.waitForTimeout(450); await page.keyboard.up('w');
  const moved = await page.evaluate(() => window.__environmentPreview.snapshot().player);
  expect(Math.hypot(moved.x - start.x, moved.z - start.z)).toBeGreaterThan(.3);
  await page.waitForTimeout(100); const stopped = await page.evaluate(() => window.__environmentPreview.snapshot().player);
  await page.waitForTimeout(150); expect(await page.evaluate(() => window.__environmentPreview.snapshot().player)).toEqual(stopped);
  report.movement = { start, moved, releaseStops: true };
  report.metrics = await page.evaluate(async () => {
    const times = []; let last = performance.now();
    await new Promise(resolve => { const frame = now => { times.push(now - last); last = now; if (times.length < 121) requestAnimationFrame(frame); else resolve(); }; requestAnimationFrame(frame); });
    const sorted = times.slice(1).sort((a, b) => a - b);
    return { samples: sorted.length, frameMedianMs: sorted[60], frameP95Ms: sorted[114], firstTransferBytes: performance.getEntriesByType('resource').reduce((n, item) => n + item.transferSize, 0) };
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await settle();
  expect(await page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth + 1, y: document.documentElement.scrollHeight > innerHeight + 1 }))).toEqual({ x: false, y: false });
  await expect(page.getByTestId('environment-view')).toBeVisible();
  const clippedControls = () => page.evaluate(() => [...document.querySelectorAll('.preview-controls select, .preview-controls button')].filter(element => {
    const r = element.getBoundingClientRect(); return r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.width < 1 || r.height < 1;
  }).map(element => element.getAttribute('aria-label') || element.textContent));
  expect(await clippedControls(), 'Landscape controls fully visible').toEqual([]);
  await page.screenshot({ path: `${prefix}-web-landscape.png` });
  await page.setViewportSize({ width: 390, height: 844 }); await settle();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await clippedControls(), 'Portrait controls fully visible').toEqual([]);
  await page.screenshot({ path: `${prefix}-web-portrait.png` });
  expect(report.errors).toEqual([]); await context.close();

  const failureContext = await browser.newContext({ viewport: { width: 1279, height: 925 } });
  await failureContext.route('**/environment-sample/v003/tree-b.glb', route => route.abort('failed'));
  const failurePage = await failureContext.newPage(); await failurePage.goto(base);
  await expect(failurePage.getByTestId('environment-error')).toBeVisible({ timeout: 45000 });
  await failureContext.unroute('**/environment-sample/v003/tree-b.glb'); await failurePage.getByTestId('environment-retry').click();
  await failurePage.waitForFunction(() => window.__environmentPreview?.ready, undefined, { timeout: 45000 });
  report.failureRecovery = true; await failureContext.close();

  report.servedAssets = [];
  for (const suffix of ['v002/tree-a', 'v002/shrub-a', 'v002/dunes', 'v003/tree-b', 'v003/tree-c', 'v003/shrub-b', 'v003/shrub-c']) {
    const path = `assets/world/environment-sample/${suffix}.glb`, response = await fetch(new URL(path, base)); expect(response.ok).toBe(true);
    const bytes = Buffer.from(await response.arrayBuffer()); expect(bytes.equals(await readFile(`public/${path}`))).toBe(true); expect(bytes.toString('utf8', 0, 4)).toBe('glTF');
    report.servedAssets.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const protectedHashes = JSON.parse(await readFile(`${prefix}-protected-hashes.json`, 'utf8'));
  for (const [file, expected] of Object.entries(protectedHashes)) expect(createHash('sha256').update(await readFile(file)).digest('hex'), `Protected file ${file}`).toBe(expected);
  report.protectedFilesUnchanged = Object.keys(protectedHashes).length; report.technicalChecksPassed = true;
  await writeFile(`${prefix}-verification.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, captures: report.views.length, comparisons: report.comparisons.length, protectedFiles: report.protectedFilesUnchanged, metrics: report.metrics }));
} catch (error) { report.failure = String(error); await writeFile(`${prefix}-verification.json`, JSON.stringify(report, null, 2) + '\n'); throw error; }
finally { await browser.close(); }
