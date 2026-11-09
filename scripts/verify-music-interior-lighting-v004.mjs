import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'work/world/music-interior-review-v004', errors = [];
await mkdir(directory, { recursive: true });
const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 4407, strictPort: true }, plugins: [{
  name: 'music-interior-lighting-check', configureServer(vite) { vite.middlewares.use((request, response, next) => {
    if (request.url !== '/__music-interior-lighting-v004-check') return next();
    response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html><head><link rel="icon" href="data:,"></head><body style="margin:0"><script type="module" src="/tests/world/music-interior-lighting-v004.fixture.ts"></script></body></html>');
  }); },
}] });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1050, height: 800 } });
  page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4407/__music-interior-lighting-v004-check');
  await page.waitForFunction(() => !!window.musicInteriorLightingCheckV004);
  const report = await page.evaluate(() => window.musicInteriorLightingCheckV004);
  await writeFile(`${directory}/validation-gpu.json`, JSON.stringify({ ...report, errors }, null, 2));
  await page.screenshot({ path: `${directory}/validation-gpu.png`, fullPage: true });
  expect(errors).toEqual([]); expect(report.renderer.glError).toBe(0);
  expect(report.renderer.exposure).toBe(1.08); expect(report.lighting.lanterns).toBe(4); expect(report.lighting.extraShadowMaps).toBe(0);
  for (const patch of report.patches) {
    expect(patch.pixels, patch.id).toBeGreaterThan(1000);
    if (patch.exterior) {
      expect(patch.exteriorLinearDifference, patch.id).toBeLessThan(1e-5);
      expect(patch.exteriorDisplayDifference, patch.id).toBeLessThanOrEqual(1);
      expect(patch.exteriorAdaptationDifference, patch.id).toBeLessThan(1e-5);
    } else {
      expect(patch.baseMedianLift, patch.id).toBeGreaterThan(1.3);
      expect(patch.maximumGainRatioError, patch.id).toBeLessThan(.01);
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
  for (const [id, referenceId] of [
    ['corner-west-rear', 'west-wall'], ['corner-right-rear', 'right-wall'], ['rear-wall-top', 'rear-wall'],
    ['right-wall-top', 'right-wall'], ['floor-rear-corner', 'floor-one'], ['ceiling-rear-corner', 'ceiling-main'],
    ['rear-wall-lower-skirt', 'rear-wall'], ['right-wall-lower-skirt', 'right-wall'], ['gallery-upper-skirt', 'rear-wall'],
  ]) {
    const patch = report.patches.find(value => value.id === id), reference = report.patches.find(value => value.id === referenceId);
    expect(patch.baseMedianLift / reference.baseMedianLift, id).toBeGreaterThan(.98);
  }
  expect(report.adaptation.inside.gain).toBeGreaterThan(.9); expect(report.adaptation.outside.gain).toBeLessThan(.4);
  for (let i = 1; i < report.adaptation.transition.length; i++) {
    expect(report.adaptation.transition[i].mean).toBeGreaterThanOrEqual(report.adaptation.transition[i - 1].mean - 1e-5);
  }
  expect(report.adaptation.transition.at(-1).mean).toBeGreaterThan(report.adaptation.transition[0].mean * 1.3);
  const rigid = report.patches.find(value => value.id === 'rigid-receiver');
  for (const id of ['skinned-receiver', 'instanced-receiver']) {
    const patch = report.patches.find(value => value.id === id);
    expect(Math.abs(patch.mean - rigid.mean) / rigid.mean, id).toBeLessThan(.001);
  }
  console.log(JSON.stringify({ passed: true, renderer: report.renderer, patches: report.patches.map(({ id, p95ToP05, cv, quarterMetreGradient, pointPeakFraction, exteriorDisplayDifference }) => ({ id, p95ToP05, cv, quarterMetreGradient, pointPeakFraction, exteriorDisplayDifference })) }, null, 2));
} finally { await browser.close(); await server.close(); }
