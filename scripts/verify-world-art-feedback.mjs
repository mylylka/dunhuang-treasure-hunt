import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { readPng } from './read-png.ts';
import { WORLD_PROP_COLLIDERS, PLAYER_RADIUS, isWalkable, surfaceHeight } from '../src/world/movement.ts';
import { followCameraPose } from '../src/world/camera.ts';

// Real production frames reproduce the user's continuous doorway/hall complaint.
// Run after build, with the normal 4186 preview: node --import tsx scripts/verify-world-art-feedback.mjs.
const browser = await chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : undefined });
const errors = [], frames = [];
const base = 'http://localhost:4186/?stage=art-sample-v002#/';
const out = 'work/world';
async function openAt(x, z, cameraYaw = 0) {
  const context = await browser.newContext({ viewport: { width: 1279, height: 925 }, reducedMotion: 'no-preference' });
  await context.addInitScript(checkpoint => sessionStorage.setItem('dunhuang:world-session:v1', JSON.stringify(checkpoint)), {
    version: 1, position: { x, z }, heading: 0, cameraYaw, visitedEvents: [],
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 45000 });
  return { context, page };
}
async function point(page) {
  const p = page.getByTestId('world-position');
  return { x: Number(await p.getAttribute('data-x')), z: Number(await p.getAttribute('data-z')) };
}
async function shot(page, name) {
  const buffer = await page.screenshot({ path: `${out}/feedback-v002-${name}.png` });
  const png = readPng(buffer), counts = new Map(); let total = 0;
  // A lens embedded in a lintel produces one nearly uniform colour across this region.
  for (let y = Math.round(png.height * .30); y < png.height * .82; y += 3) {
    for (let x = Math.round(png.width * .25); x < png.width * .75; x += 3) {
      const i = (y * png.width + x) * png.channels;
      const key = [png.pixels[i], png.pixels[i + 1], png.pixels[i + 2]].map(v => v >> 4).join(',');
      counts.set(key, (counts.get(key) || 0) + 1); total++;
    }
  }
  const dominantFraction = Math.max(...counts.values()) / total;
  frames.push({ name, position: await point(page), dominantFraction });
  expect(dominantFraction, `one opaque surface fills gameplay view: ${name}`).toBeLessThan(.92);
}
try {
  const route = await openAt(-12, 9);
  await route.page.keyboard.down('w');
  try {
    for (const z of [7, 5, 3, 1, -1, -3, -6, -9, -11, -13, -15, -17, -20]) {
      await expect.poll(async () => (await point(route.page)).z, { timeout: 8000 }).toBeLessThanOrEqual(z);
      await shot(route.page, `walk-z${z}`);
    }
  } finally { await route.page.keyboard.up('w'); }
  await expect(route.page.getByTestId('world-location')).toHaveText('藻井观赏厅');
  await route.context.close();

  for (const item of [
    { name: 'tree', start: [-8.1, -2], stopX: -6.9 },
    { name: 'pot', start: [-4.1, -10.8], stopX: -3.65 },
    { name: 'rock', start: [6.2, 7.1], stopX: 6.81 },
  ]) {
    const { page, context } = await openAt(...item.start);
    await page.keyboard.down('d'); await page.waitForTimeout(1600); await page.keyboard.up('d');
    expect((await point(page)).x, item.name).toBeLessThanOrEqual(item.stopX + .03);
    await shot(page, `${item.name}-blocked`);
    await page.keyboard.down('q'); await page.waitForTimeout(1800); await page.keyboard.up('q');
    await shot(page, `${item.name}-turn-left`);
    await context.close();
  }
  // Find a valid tight diagonal contact: circle movement must not collapse the camera
  // because an enclosing square happens to include the same valid player anchor.
  let nearest;
  for (const obstacle of WORLD_PROP_COLLIDERS.filter(p => p.id.startsWith('rock-'))) {
    const c = obstacle.circle;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, distance = c.radius + PLAYER_RADIUS + .02;
      const p = { x: c.x + Math.cos(angle) * distance, z: c.z + Math.sin(angle) * distance };
      if (!isWalkable(p)) continue;
      for (const yaw of [-1, -.5, 0, .5, 1]) {
        const pose = followCameraPose(p.x, surfaceHeight(p), p.z, yaw);
        const arm = pose.position.distanceTo(pose.target);
        if (!nearest || arm < nearest.arm) nearest = { ...p, yaw, arm };
      }
    }
  }
  expect(nearest.arm).toBeGreaterThan(3);
  const diagonal = await openAt(nearest.x, nearest.z, nearest.yaw);
  await shot(diagonal.page, 'rock-diagonal-camera');
  await diagonal.context.close();
  expect(errors).toEqual([]);
  await writeFile(`${out}/feedback-v002-report.json`, JSON.stringify({ passed: true, frames, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, frames: frames.length, maxDominantFraction: Math.max(...frames.map(f => f.dominantFraction)), errors }));
} finally { await browser.close(); }
