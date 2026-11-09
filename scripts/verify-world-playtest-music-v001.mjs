import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { fromTerrainPoint, toTerrainPoint } from '../src/content/world/terrain-layout-v001.ts';

const output = 'work/world/mogao-exhibit-v001';
const url = process.env.DUNHUANG_MUSIC_PLAYTEST_URL ?? 'http://127.0.0.1:4230/music-companion-v002.html';
const viewport = { width: 844, height: 390 };
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
const report = { url, viewport, errors: [], requests: [], route: [] };
try {
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const state = () => page.evaluate(() => window.__terrain.inspect());
  const send = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
  const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
  const details = path => /music-balcony-ensemble|music-three-wall-mural|mural-original|ribbon-masks/.test(path);
  let stage = 'startup';
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (details(path)) report.requests.push({ stage, path });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__terrain?.inspect().loaded, undefined, { timeout: 30_000 });
  assert.deepEqual(report.requests, []);
  stage = 'route';

  async function face(yaw) {
    for (let i = 0; i < 12; i++) {
      const delta = angle(yaw - (await state()).checkpoint.cameraYaw);
      if (Math.abs(delta) < .035) return;
      const dx = Math.max(-218, Math.min(218, -delta / .004));
      const start = { x: viewport.width * (dx < 0 ? .86 : .56), y: viewport.height * .48 };
      assert(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.matches('[data-world-canvas]'), start));
      await send('touchStart', start);
      try { await send('touchMove', { ...start, x: start.x + dx }); }
      finally { await send('touchEnd'); }
    }
    throw new Error('Could not aim down the route');
  }
  async function walk(x, z) {
    const target = toTerrainPoint('music', { x, z });
    const origin = (await state()).checkpoint.position;
    const dx = target.x - origin.x, dz = target.z - origin.z, distance = Math.hypot(dx, dz);
    if (distance < .2) return;
    await face(Math.atan2(-dx, -dz));
    const box = await page.getByRole('group', { name: '拖动摇杆行走' }).boundingBox();
    assert(box);
    await send('touchStart', { x: box.x + box.width / 2, y: box.y + box.height * .18 });
    try {
      await page.waitForFunction(({ origin, dx, dz, distance }) => {
        const p = window.__terrain.inspect().checkpoint.position;
        return ((p.x - origin.x) * dx + (p.z - origin.z) * dz) / distance >= distance - .13;
      }, { origin, dx, dz, distance }, { timeout: 20_000 });
    } finally { await send('touchEnd'); }
    report.route.push(fromTerrainPoint('music', (await state()).checkpoint.position));
  }
  for (const [x, z] of [[39.5, -23.4], [46.5, -23.4], [46.5, -20.4], [56.8, -20.4], [56.8, -24.8], [56.8, -28.75]]) await walk(x, z);
  await page.getByRole('button', { name: '上楼', exact: true }).tap();
  await page.waitForFunction(() => {
    const state = window.__terrain.inspect();
    return state.checkpoint.walkSurface === 'music-floor-2' && state.companion?.surfaceId === 'music-floor-2'
      && state.flying?.details?.balcony === 'ready' && state.terrain?.scene?.musicThreeWallMural?.status === 'ready';
  }, undefined, { timeout: 35_000 });
  const finished = await state();
  report.details = finished.flying.details;
  report.performers = finished.flying.balconyEnsemble?.players;
  report.murals = finished.terrain.scene.musicThreeWallMural;
  assert.equal(report.performers?.length, 4);
  assert.equal(report.murals.panels?.length, 3);
  assert.deepEqual(report.errors, []);
  await page.screenshot({ path: `${output}/mobile-music-staged-details.png` });
  report.passed = true;
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  await writeFile(`${output}/music-staged-details.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
