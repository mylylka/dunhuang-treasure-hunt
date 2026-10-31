import { chromium, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Isolated preview only. Does not rebuild or write the production game.
const base = process.env.ENVIRONMENT_PREVIEW_URL || 'http://localhost:4189/';
const prefix = 'work/world/environment-sample-v002';
const report = { stage: 'independent-environment-sample-v002', technicalChecksPassed: false, artApproval: 'pending-user-review', errors: [], views: [], comparisons: [] };
const browser = await chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : undefined, args: ['--enable-unsafe-swiftshader'] });
try {
  const previousReport = JSON.parse(await readFile('work/world/environment-sample-v001-verification.json', 'utf8'));
  const context = await browser.newContext({ viewport: { width: 1279, height: 925 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base);
  await page.waitForFunction(() => window.__environmentPreview?.ready, undefined, { timeout: 45000 });
  async function settle() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
  for (const view of ['road', 'road-tree', 'tree-front', 'tree-side', 'tree-diagonal', 'tree-near', 'tree-far', 'shrub-near', 'shrub-road', 'dunes', 'dunes-oblique', 'dunes-model', 'dunes-side', 'dunes-diagonal']) {
    await page.evaluate(view => { window.__environmentPreview.setVersion('new'); window.__environmentPreview.setView(view); }, view);
    await settle();
    await page.screenshot({ path: `${prefix}-web-${view}.png` });
    const snapshot = await page.evaluate(() => window.__environmentPreview.snapshot());
    const stats = await page.evaluate(() => window.__environmentPreview.stats());
    expect(snapshot.ready).toBe(true);
    expect(snapshot.error).toBeFalsy();
    expect(stats.triangles).toBeGreaterThan(0);
    expect(stats.referenceNatureVisible, `No legacy tree canopy or terrain mixed into ${view}`).toBe(0);
    report.views.push({ view, snapshot, stats });
    {
      await page.evaluate(() => window.__environmentPreview.setVersion('old'));
      await settle();
      const oldSnapshot = await page.evaluate(() => window.__environmentPreview.snapshot());
      expect(oldSnapshot.camera, `Matched camera for ${view}`).toEqual(snapshot.camera);
      expect(oldSnapshot.lighting, `Matched lighting for ${view}`).toEqual(snapshot.lighting);
      expect(oldSnapshot.fog, `Matched fog for ${view}`).toEqual(snapshot.fog);
      expect(oldSnapshot.activeModels.every(model => model.path.includes('/v001/'))).toBe(true);
      expect(snapshot.activeModels.every(model => model.path.includes('/v002/'))).toBe(true);
      const transforms = state => state.activeModels.map(({ id, position, rotation, scale }) => ({ id, position, rotation, scale }));
      expect(transforms(oldSnapshot), `Matched model placement for ${view}`).toEqual(transforms(snapshot));
      expect(await page.evaluate(() => window.__environmentPreview.stats().referenceNatureVisible)).toBe(0);
      const prior = previousReport.views.find(item => item.view === view);
      expect(snapshot.camera, `Camera unchanged from delivered v001 for ${view}`).toEqual(prior.snapshot.camera);
      await page.screenshot({ path: `${prefix}-before-${view}.png` });
      report.comparisons.push({ view, sameCamera: true, sameLighting: true, sameFog: true, priorCameraPreserved: true, camera: snapshot.camera, lighting: snapshot.lighting });
    }
  }
  await page.evaluate(() => { window.__environmentPreview.setVersion('new'); window.__environmentPreview.setView('road'); });
  const initial = await page.evaluate(() => window.__environmentPreview.snapshot().player);
  await page.locator('canvas').focus();
  await page.keyboard.down('w'); await page.waitForTimeout(450); await page.keyboard.up('w');
  const moved = await page.evaluate(() => window.__environmentPreview.snapshot().player);
  expect(Math.hypot(moved.x - initial.x, moved.z - initial.z)).toBeGreaterThan(.3);
  await page.waitForTimeout(120);
  const stopped = await page.evaluate(() => window.__environmentPreview.snapshot().player);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.__environmentPreview.snapshot().player)).toEqual(stopped);
  report.movement = { initial, moved, releaseStops: true };
  report.metrics = await page.evaluate(async () => {
    const intervals = []; let last = performance.now();
    await new Promise(resolve => {
      const tick = now => { intervals.push(now - last); last = now; if (intervals.length < 121) requestAnimationFrame(tick); else resolve(); };
      requestAnimationFrame(tick);
    });
    const sorted = intervals.slice(1).sort((a, b) => a - b);
    return { frameMedianMs: sorted[Math.floor(sorted.length / 2)], frameP95Ms: sorted[Math.floor(sorted.length * .95)], samples: sorted.length,
      firstTransferBytes: performance.getEntriesByType('resource').reduce((n, resource) => n + resource.transferSize, 0) };
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.__environmentPreview.setView('road'));
  await settle();
  expect(await page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth + 1, y: document.documentElement.scrollHeight > innerHeight + 1 }))).toEqual({ x: false, y: false });
  await page.screenshot({ path: `${prefix}-web-landscape.png` });
  expect(report.errors).toEqual([]);
  await context.close();

  const failureContext = await browser.newContext({ viewport: { width: 1279, height: 925 } });
  await failureContext.route('**/environment-sample/v002/tree-a.glb', route => route.abort('failed'));
  const failurePage = await failureContext.newPage();
  await failurePage.goto(base);
  await expect(failurePage.getByTestId('environment-error')).toBeVisible({ timeout: 45000 });
  await failureContext.unroute('**/environment-sample/v002/tree-a.glb');
  await failurePage.getByTestId('environment-retry').click();
  await failurePage.waitForFunction(() => window.__environmentPreview?.ready, undefined, { timeout: 45000 });
  report.failureRecovery = true;
  await failureContext.close();

  report.servedAssets = [];
  for (const assetVersion of ['v001', 'v002']) for (const asset of ['tree-a', 'shrub-a', 'dunes']) {
    const path = `assets/world/environment-sample/${assetVersion}/${asset}.glb`;
    const response = await fetch(new URL(path, base));
    expect(response.ok).toBe(true);
    const bytes = Buffer.from(await response.arrayBuffer());
    const localBytes = await readFile(`public/${path}`);
    expect(bytes.equals(localBytes), `Served GLB matches source ${path}`).toBe(true);
    expect(bytes.toString('utf8', 0, 4)).toBe('glTF');
    report.servedAssets.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const protectedHashes = JSON.parse(await readFile(`${prefix}-protected-hashes.json`, 'utf8'));
  for (const [file, expected] of Object.entries(protectedHashes)) {
    const actual = createHash('sha256').update(await readFile(file)).digest('hex');
    expect(actual, `Protected file unchanged: ${file}`).toBe(expected);
  }
  report.protectedFilesUnchanged = Object.keys(protectedHashes).length;
  report.technicalChecksPassed = true;
  await writeFile(`${prefix}-verification.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, views: report.views.length, matchedCameraComparisons: report.comparisons.length, protectedFilesUnchanged: report.protectedFilesUnchanged, metrics: report.metrics, artApproval: report.artApproval }));
} catch (error) {
  report.failure = String(error);
  await writeFile(`${prefix}-verification.json`, JSON.stringify(report, null, 2) + '\n');
  throw error;
} finally { await browser.close(); }
