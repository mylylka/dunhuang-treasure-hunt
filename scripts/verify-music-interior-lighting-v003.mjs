import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'work/world/music-interior-lighting-v003', errors = [];
await mkdir(directory, { recursive: true });
const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 4406, strictPort: true }, plugins: [{
  name: 'music-interior-lighting-check', configureServer(vite) { vite.middlewares.use((request, response, next) => {
    if (request.url !== '/__music-interior-lighting-check') return next();
    response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html><head><link rel="icon" href="data:,"></head><body style="margin:0"><script type="module" src="/tests/world/music-interior-lighting.fixture.ts"></script></body></html>');
  }); },
}] });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1050, height: 800 } });
  page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4406/__music-interior-lighting-check');
  await page.waitForFunction(() => !!window.musicInteriorLightingCheck);
  const report = await page.evaluate(() => window.musicInteriorLightingCheck);
  await writeFile(`${directory}/validation-gpu.json`, JSON.stringify({ ...report, errors }, null, 2));
  await page.screenshot({ path: `${directory}/validation-gpu.png`, fullPage: true });
  expect(errors).toEqual([]); expect(report.renderer.glError).toBe(0);
  expect(report.renderer.exposure).toBe(1.08); expect(report.lighting.lanterns).toBe(6); expect(report.lighting.extraShadowMaps).toBe(0);
  for (const patch of report.patches) {
    expect(patch.pixels, patch.id).toBeGreaterThan(1000);
    if (patch.exterior) {
      expect(patch.exteriorLinearDifference, patch.id).toBeLessThan(1e-5);
      expect(patch.exteriorDisplayDifference, patch.id).toBeLessThanOrEqual(1);
    } else {
      expect(patch.baseMedianLift, patch.id).toBeGreaterThan(1.3);
      if (patch.kind === 'plane') {
        expect(patch.p95ToP05, patch.id).toBeLessThan(2);
        expect(patch.quarterMetreGradient, patch.id).toBeLessThan(.2);
        expect(patch.clippedFraction, patch.id).toBeLessThan(.005);
        expect(patch.pointPeakFraction, patch.id).toBeLessThan(.25);
      }
    }
  }
  for (const id of ['floor-one', 'floor-two', 'stair-plane']) {
    const patch = report.patches.find(value => value.id === id);
    expect(patch.cv, id).toBeLessThan(patch.legacy.cv * .65);
  }
  const rigid = report.patches.find(value => value.id === 'rigid-receiver');
  for (const id of ['skinned-receiver', 'instanced-receiver']) {
    const patch = report.patches.find(value => value.id === id);
    expect(Math.abs(patch.mean - rigid.mean) / rigid.mean, id).toBeLessThan(.001);
  }
  console.log(JSON.stringify({ passed: true, renderer: report.renderer, patches: report.patches.map(({ id, p95ToP05, cv, quarterMetreGradient, pointPeakFraction, exteriorDisplayDifference }) => ({ id, p95ToP05, cv, quarterMetreGradient, pointPeakFraction, exteriorDisplayDifference })) }, null, 2));
} finally { await browser.close(); await server.close(); }
