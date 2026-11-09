import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { toTerrainPoint } from '../src/content/world/terrain-layout-v001.ts';

// Local visual regression only: two cliff views and the unchanged stair approach.
const before = process.argv.includes('--before');
const out = 'work/world/mogao-strata-v001';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
const errors = [], shots = [], mountainRequests = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  if (r.url().endsWith('/mountain.glb')) mountainRequests.push(r.url());
});
await page.addInitScript(() => {
  const next = sessionStorage.getItem('strata-next');
  if (next) {
    sessionStorage.setItem('dunhuang:terrain-preview:v3', next);
    sessionStorage.removeItem('strata-next');
  }
});
async function ready() {
  await page.waitForFunction(() => window.__terrain?.inspect().loaded, null, { timeout: 90000 });
  if (await page.getByTestId('world-resume').isVisible()) await page.getByTestId('world-resume').click();
  await page.evaluate(() => window.__characterCinematics?.skip());
}
async function view(id, p, target, tilt) {
  const yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
  await page.evaluate(cp => sessionStorage.setItem('strata-next', JSON.stringify(cp)), {
    version: 1, position: p, heading: yaw, cameraYaw: yaw, visitedEvents: [],
  });
  await page.reload(); await ready();
  for (let i = 0; i < tilt; i++) await page.getByRole('button', { name: '向上看', exact: true }).click();
  await page.waitForTimeout(500);
  await page.addStyleTag({ content: '.world-hud{visibility:hidden!important}' });
  await page.screenshot({ path: `${out}/${before ? 'before' : 'after'}-${id}.png` });
  const state = await page.evaluate(() => window.__terrain.inspect());
  shots.push({ id, checkpoint: state.checkpoint, lighting: state.terrain.scene.lighting });
  console.log(`Captured ${id}`);
}
try {
  await page.goto(`http://localhost:${before ? 4225 : 4226}/?view=start#/`); await ready();
  await view('rock-comparison', { x: 220, z: -10 }, { x: 335, z: 85 }, 2);
  if (!before) {
    const p = toTerrainPoint('cliff', { x: 164, z: -14 });
    const aim = toTerrainPoint('cliff', { x: 149, z: -80 });
    await view('right-shoulder', { x: p.x, z: p.z }, aim, 2);
    const steps = toTerrainPoint('cliff', { x: 122, z: -37 });
    const door = toTerrainPoint('cliff', { x: 122, z: -65 });
    await view('stairs', { x: steps.x, z: steps.z }, door, 1);
    const pre = await page.evaluate(() => window.__terrain.inspect());
    await page.keyboard.down('w'); await page.waitForTimeout(900); await page.keyboard.up('w');
    const post = await page.evaluate(() => window.__terrain.inspect());
    if (Math.hypot(post.checkpoint.position.x - pre.checkpoint.position.x, post.checkpoint.position.z - pre.checkpoint.position.z) < .4) errors.push('Stair approach is blocked');
    if (pre.terrain.scene.lighting.staticPasses !== post.terrain.scene.lighting.staticPasses) errors.push('Unexpected shadow rebake');
    if (!mountainRequests.some(url => url.includes('/mogao-strata/v001/'))) errors.push('New mountain asset was not loaded');
  }
  if (shots.some(s => s.lighting.sunAzimuthDegrees !== 250 || s.lighting.sunElevationDegrees !== 30)) errors.push('Fixed sun changed');
} catch (e) { errors.push(String(e)); }
finally {
  await writeFile(`${out}/${before ? 'before' : 'after'}-report.json`, JSON.stringify({ errors, shots, mountainRequests }, null, 2));
  await browser.close();
}
if (errors.length) { console.error(errors); process.exitCode = 1; }
