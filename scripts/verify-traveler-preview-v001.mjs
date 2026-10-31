/** Run against the independently built preview; this script does not start a server. */
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.TRAVELER_PREVIEW_URL || 'http://localhost:4192/';
const prefix = 'work/world/traveler-tripo-v001';
const viewport = { width: 1279, height: 925 };
const tripoPath = 'traveler-tripo/v001/traveler.glb';
const originalPath = 'shared/v001/traveler.glb';
const report = {
  stage: 'independent-user-supplied-traveler-v001', technicalChecksPassed: false,
  visualApproval: 'pending-user-review', errors: [], views: [], comparisons: [],
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir('work/world', { recursive: true });
let browser;

function previewUrl(variant = 'tripo', view = 'road') {
  const url = new URL(base);
  url.searchParams.set('view', view);
  if (variant === 'original') url.searchParams.set('traveler', 'original');
  else url.searchParams.delete('traveler'); // The default entry must actually select Tripo.
  return url.href;
}

function assertTraveler(snapshot, variant) {
  expect(snapshot.ready).toBe(true);
  expect(snapshot.error).toBeFalsy();
  expect(snapshot.travelerVariant).toBe(variant);
  const suffix = variant === 'tripo' ? tripoPath : originalPath;
  expect(snapshot.travelerPath.replace(/^\/+/, '').endsWith(suffix), `Actual loaded traveler: ${snapshot.travelerPath}`).toBe(true);
  expect(snapshot.bones.length, 'Actual skeleton exposed by the loaded model').toBeGreaterThan(3);
  expect(snapshot.bones.every(bone => typeof bone.name === 'string'
    && bone.position.length === 3 && bone.quaternion.length === 4
    && [...bone.position, ...bone.quaternion].every(Number.isFinite))).toBe(true);
}

// Compare bone-local transforms, never world position or the animation label alone.
function changedBoneLocals(samples) {
  const moved = new Set();
  for (let i = 1; i < samples.length; i++) {
    const prior = new Map(samples[i - 1].bones.map(bone => [bone.name, bone]));
    for (const bone of samples[i].bones) {
      const previous = prior.get(bone.name);
      if (!previous) continue;
      const positionDelta = Math.hypot(...bone.position.map((v, axis) => v - previous.position[axis]));
      // q and -q encode the same orientation; compare their normalized dot product.
      const dot = bone.quaternion.reduce((n, value, axis) => n + value * previous.quaternion[axis], 0);
      const length = Math.hypot(...bone.quaternion) * Math.hypot(...previous.quaternion);
      const rotationDelta = length > 0 ? 1 - Math.min(1, Math.abs(dot / length)) : 0;
      if (positionDelta > 1e-4 || rotationDelta > 1e-5) moved.add(bone.name);
    }
  }
  return [...moved].sort();
}

function displacement(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

async function protectedAssetCheck() {
  const checks = [];
  for (const document of ['docs/environment-sample-v002-acceptance.md', 'docs/environment-sample-v003-acceptance.md']) {
    const text = await readFile(document, 'utf8');
    const rows = [...text.matchAll(/^\|\s*`([^`]+)`\s*\|\s*`([a-f0-9]{64})`\s*\|\s*$/gm)];
    expect(rows.length, `Approval hashes in ${document}`).toBeGreaterThan(0);
    for (const [, file, expected] of rows) {
      const actual = hash(await readFile(file));
      expect(actual, `Approved asset remains unchanged: ${file}`).toBe(expected);
      checks.push({ document, file, sha256: actual });
    }
  }
  const oldManifest = JSON.parse(await readFile('art-source/world/models/traveler/v001/export-manifest.json', 'utf8'));
  const oldFile = `public/assets/world/${originalPath}`;
  expect(hash(await readFile(oldFile)), 'Original traveler remains unchanged').toBe(oldManifest.sha256);
  checks.push({ document: 'art-source/world/models/traveler/v001/export-manifest.json', file: oldFile, sha256: oldManifest.sha256 });
  // Store the verified original baseline in the versioned conversion record so
  // this validation also works without an earlier session's temporary work files.
  const manifestPath = 'art-source/world/models/traveler-tripo/v001/export-manifest.json';
  const conversion = JSON.parse(await readFile(manifestPath, 'utf8'));
  const baseline = conversion.protectedSourceHashes;
  for (const file of ['art-source/world/models/traveler/v001/traveler.blend', oldFile]) {
    expect(baseline[file], `Existing protected hash for ${file}`).toMatch(/^[a-f0-9]{64}$/);
    const actual = hash(await readFile(file));
    expect(actual, `Protected original source: ${file}`).toBe(baseline[file]);
    checks.push({ document: manifestPath, file, sha256: actual });
  }
  for (const source of conversion.sourceFiles) {
    expect(hash(await readFile(source.archive)), `Archived user source: ${source.archive}`).toBe(source.sha256);
    checks.push({ document: manifestPath, file: source.archive, sha256: source.sha256 });
  }
  return checks;
}

async function inspectDeliveredGlb() {
  const bytes = await readFile(`public/assets/world/${tripoPath}`);
  expect(bytes.toString('ascii', 0, 4)).toBe('glTF');
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const manifest = JSON.parse(await readFile('art-source/world/models/traveler-tripo/v001/export-manifest.json', 'utf8'));
  expect(hash(bytes), 'Delivered GLB is the recorded final export').toBe(manifest.sha256);
  const animations = (gltf.animations || []).map(clip => clip.name);
  for (const name of ['Idle', 'Walk', 'Run', 'LookAround']) expect(animations, `Original motion preserved: ${name}`).toContain(name);
  const skins = (gltf.skins || []).map(skin => skin.joints.length);
  expect(skins, 'The supplied 65-joint skin is retained').toContain(65);
  expect(gltf.images?.length || 0, 'Original character texture is embedded or referenced').toBeGreaterThan(0);
  expect(gltf.textures?.length || 0).toBeGreaterThan(0);
  const binary = bytes.subarray(28 + jsonLength);
  for (const [index, image] of gltf.images.entries()) {
    const view = gltf.bufferViews[image.bufferView], start = view.byteOffset || 0;
    expect(hash(binary.subarray(start, start + view.byteLength)), 'Embedded texture retains original JPEG bytes').toBe(manifest.textures[index].sha256);
  }
  const clipTiming = Object.fromEntries(gltf.animations.map(clip => [clip.name, {
    start: Math.min(...clip.samplers.map(sampler => gltf.accessors[sampler.input].min[0])),
    end: Math.max(...clip.samplers.map(sampler => gltf.accessors[sampler.input].max[0])),
  }]));
  for (const [name, timing] of Object.entries(clipTiming)) {
    expect(timing.start, `${name} has no leading empty loop interval`).toBeCloseTo(0, 6);
    expect(timing.end).toBeGreaterThan(1);
  }
  return { path: tripoPath, bytes: bytes.length, sha256: hash(bytes), animations, skinJointCounts: skins,
    clipTiming,
    images: gltf.images.length, textures: gltf.textures.length,
    imageStorage: gltf.images.map(image => ({ mimeType: image.mimeType, embedded: image.bufferView !== undefined, uri: image.uri })) };
}

try {
  report.protectedBefore = await protectedAssetCheck();
  report.deliveredGlb = await inspectDeliveredGlb();
  browser = await chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : undefined, args: ['--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.errors.push({ type: 'console', message: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) report.errors.push({ type: 'http', status: response.status(), url: response.url() }); });
  page.on('requestfailed', request => report.errors.push({ type: 'requestfailed', url: request.url(), error: request.failure()?.errorText }));
  await page.goto(previewUrl());
  await page.waitForFunction(() => window.__environmentPreview?.ready, undefined, { timeout: 45000 });
  const snapshot = () => page.evaluate(() => window.__environmentPreview.snapshot());
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const waitAnimation = name => page.waitForFunction(name => window.__environmentPreview.snapshot().actualAnimation === name, name, { timeout: 10000 });
  async function sampleBones(count = 4, interval = 130) {
    const samples = [];
    for (let i = 0; i < count; i++) { if (i) await page.waitForTimeout(interval); samples.push(await snapshot()); }
    return samples;
  }
  async function capture(view) {
    await page.evaluate(view => window.__environmentPreview.setView(view), view);
    const expectedAnimation = view === 'traveler-walk' ? 'Walk' : view === 'traveler-run' ? 'Run' : 'Idle';
    await waitAnimation(expectedAnimation);
    await page.waitForTimeout(250); // Let the actual action transition finish before photographing it.
    await settle();
    const state = await snapshot(), stats = await page.evaluate(() => window.__environmentPreview.stats());
    assertTraveler(state, 'tripo');
    expect(state.view).toBe(view); expect(stats.triangles).toBeGreaterThan(0);
    const path = `${prefix}-web-${view}.png`;
    await page.screenshot({ path });
    const entry = { view, path, snapshot: state, stats };
    if (view === 'traveler-walk' || view === 'traveler-run') {
      const samples = await sampleBones();
      expect(samples.every(sample => sample.actualAnimation === expectedAnimation)).toBe(true);
      const changedBones = changedBoneLocals(samples);
      expect(changedBones.length, `${expectedAnimation} moves multiple bone-local joints`).toBeGreaterThanOrEqual(2);
      entry.motion = { changedBones, samples };
    }
    report.views.push(entry);
    return state;
  }
  for (const view of ['traveler-front', 'traveler-back', 'traveler-side', 'traveler-diagonal', 'traveler-walk', 'traveler-run', 'road', 'dunes', 'dunes-oblique']) await capture(view);
  const tripoRoad = report.views.find(entry => entry.view === 'road').snapshot;

  async function exerciseMovement(run) {
    await page.evaluate(() => window.__environmentPreview.setView('road'));
    await waitAnimation('Idle'); await settle(); await page.locator('canvas').focus();
    const before = await snapshot();
    try {
      if (run) await page.keyboard.down('Shift');
      await page.keyboard.down('w');
      await waitAnimation(run ? 'Run' : 'Walk');
      await page.waitForTimeout(250); // Exclude the Idle-to-locomotion crossfade from joint-motion evidence.
      const samples = await sampleBones(5, 130);
      const distance = displacement(samples[0].player, samples.at(-1).player);
      const changedBones = changedBoneLocals(samples);
      expect(distance, `${run ? 'Run' : 'Walk'} advances through the scene`).toBeGreaterThan(.2);
      expect(samples.every(sample => sample.actualAnimation === (run ? 'Run' : 'Walk'))).toBe(true);
      expect(changedBones.length, 'Locally articulated movement, not whole-object translation').toBeGreaterThanOrEqual(2);
      const path = `${prefix}-web-keyboard-${run ? 'run' : 'walk'}.png`;
      await page.screenshot({ path });
      return { action: run ? 'Run' : 'Walk', path, before, distance, changedBones, samples };
    } finally { await page.keyboard.up('w'); await page.keyboard.up('Shift'); }
  }
  const walk = await exerciseMovement(false);
  await waitAnimation('Idle');
  const run = await exerciseMovement(true);
  expect(run.distance, 'Run is visibly faster than Walk over the same observation window').toBeGreaterThan(walk.distance * 1.2);
  await waitAnimation('Idle'); await page.waitForTimeout(200);
  const stopped = await snapshot(); await page.waitForTimeout(260); const still = await snapshot();
  expect(still.actualAnimation).toBe('Idle'); expect(displacement(stopped.player, still.player), 'Key release stops movement').toBeLessThan(1e-6);
  report.movement = { walk, run, stopped, still, releaseReturnsIdle: true, releaseStopsMovement: true };
  // Drive the actual input controller toward the roadside tree, then into its trunk envelope.
  await page.evaluate(() => window.__environmentPreview.setView('road'));
  await page.locator('canvas').focus();
  try {
    await page.keyboard.down('Shift'); await page.keyboard.down('w');
    await page.waitForFunction(() => window.__environmentPreview.snapshot().player.z <= 13.2, undefined, { timeout: 15000 });
    await page.keyboard.up('w'); await page.keyboard.down('d');
    await page.waitForFunction(() => window.__environmentPreview.snapshot().player.x > 1.6, undefined, { timeout: 15000 });
    await page.waitForTimeout(1000);
    const contact = await snapshot(); await page.waitForTimeout(300); const held = await snapshot();
    expect(contact.playerCollisionRadius).toBe(.9);
    expect(contact.player.x + contact.playerCollisionRadius).toBeLessThanOrEqual(contact.walkingCollider.minX + .002);
    expect(displacement(contact.player, held.player), 'Held running input cannot move through the tree').toBeLessThan(.002);
    report.collision = { contact, held, sourceAnimationMaxRadius: .87636, previewRadius: .9 };
    await page.screenshot({ path: `${prefix}-web-tree-collision.png` });
  } finally { await page.keyboard.up('w'); await page.keyboard.up('d'); await page.keyboard.up('Shift'); }
  report.stats = await page.evaluate(() => window.__environmentPreview.stats());
  expect(report.errors, 'No model, texture, page or request errors during normal loading and movement').toEqual([]);
  await context.close();

  // Load the old actor in a clean page at exactly the same viewport and road view.
  const originalContext = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const originalPage = await originalContext.newPage();
  const originalErrors = [];
  originalPage.on('pageerror', error => originalErrors.push(error.message));
  await originalPage.goto(previewUrl('original'));
  await originalPage.waitForFunction(() => window.__environmentPreview?.ready, undefined, { timeout: 45000 });
  await originalPage.evaluate(() => window.__environmentPreview.setView('road'));
  await originalPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const original = await originalPage.evaluate(() => window.__environmentPreview.snapshot());
  assertTraveler(original, 'original'); expect(originalErrors).toEqual([]);
  for (const key of ['camera', 'lighting', 'fog']) expect(original[key], `Same ${key} for original and Tripo road comparison`).toEqual(tripoRoad[key]);
  expect(original.player).toEqual(tripoRoad.player);
  const oldScreenshot = `${prefix}-web-original-road.png`;
  await originalPage.screenshot({ path: oldScreenshot });
  report.comparisons.push({ view: 'road', originalScreenshot: oldScreenshot, tripoScreenshot: `${prefix}-web-road.png`, sameCamera: true, sameLighting: true, sameFog: true, samePlayerPlacement: true, original, tripo: tripoRoad });
  await originalContext.close();

  const failureContext = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const resourcePattern = '**/traveler-tripo/v001/traveler.glb*';
  let blockedRequests = 0, successfulReloads = 0;
  await failureContext.route(resourcePattern, route => { blockedRequests++; return route.abort('failed'); });
  const failurePage = await failureContext.newPage();
  failurePage.on('response', response => { if (new URL(response.url()).pathname.endsWith(`/${tripoPath}`) && response.ok()) successfulReloads++; });
  await failurePage.goto(previewUrl());
  await expect(failurePage.getByTestId('environment-error')).toBeVisible({ timeout: 45000 });
  expect(blockedRequests, 'The new traveler GLB, specifically, was blocked').toBeGreaterThan(0);
  const failed = await failurePage.evaluate(() => window.__environmentPreview.snapshot());
  expect(failed.ready).toBe(false); expect(failed.error).toBeTruthy();
  await failurePage.screenshot({ path: `${prefix}-web-load-failure.png` });
  await failureContext.unroute(resourcePattern);
  await failurePage.getByTestId('environment-retry').click();
  await failurePage.waitForFunction(() => window.__environmentPreview?.ready, undefined, { timeout: 45000 });
  const recovered = await failurePage.evaluate(() => window.__environmentPreview.snapshot());
  assertTraveler(recovered, 'tripo'); expect(successfulReloads).toBeGreaterThan(0);
  await expect(failurePage.getByTestId('environment-error')).toBeHidden();
  await failurePage.screenshot({ path: `${prefix}-web-load-recovered.png` });
  report.failureRecovery = { blockedRequests, successfulReloads, failed, recovered };
  await failureContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobilePage = await mobileContext.newPage(); const mobileErrors = [];
  mobilePage.on('pageerror', error => mobileErrors.push(error.message));
  await mobilePage.goto(previewUrl());
  await mobilePage.waitForFunction(() => window.__environmentPreview?.ready, undefined, { timeout: 45000 });
  const mobileBefore = await mobilePage.evaluate(() => window.__environmentPreview.snapshot());
  assertTraveler(mobileBefore, 'tripo');
  const forward = await mobilePage.getByRole('button', { name: '前进', exact: true }).boundingBox();
  expect(forward).toBeTruthy();
  const cdp = await mobileContext.newCDPSession(mobilePage);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: forward.x + forward.width / 2, y: forward.y + forward.height / 2 }] });
  await mobilePage.waitForFunction(() => window.__environmentPreview.snapshot().player.z < 17.6, undefined, { timeout: 15000 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobilePage.waitForFunction(() => window.__environmentPreview.snapshot().actualAnimation === 'Idle');
  const mobileStopped = await mobilePage.evaluate(() => window.__environmentPreview.snapshot());
  await mobilePage.waitForTimeout(250);
  const mobileStill = await mobilePage.evaluate(() => window.__environmentPreview.snapshot());
  expect(displacement(mobileBefore.player, mobileStopped.player)).toBeGreaterThan(.35);
  expect(displacement(mobileStopped.player, mobileStill.player)).toBeLessThan(1e-6);
  const mobileLayout = await mobilePage.evaluate(() => ({ width: innerWidth, height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
  expect(mobileLayout.scrollWidth).toBeLessThanOrEqual(mobileLayout.width);
  expect(mobileLayout.scrollHeight).toBeLessThanOrEqual(mobileLayout.height);
  const mobileControls = await mobilePage.locator('.preview-controls').boundingBox();
  const mobileFooter = await mobilePage.locator('.preview-footer').boundingBox();
  expect(mobileControls.y + mobileControls.height, 'Selectors stay above movement controls and help').toBeLessThan(mobileFooter.y);
  for (const control of await mobilePage.locator('.preview-controls select:visible, .preview-controls button:visible').all()) {
    const bounds = await control.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(844);
    expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(390);
  }
  expect(mobileErrors).toEqual([]);
  await mobilePage.screenshot({ path: `${prefix}-web-mobile.png` });
  report.mobile = { viewport: { width: 844, height: 390 }, before: mobileBefore, stopped: mobileStopped, still: mobileStill, layout: mobileLayout, controls: mobileControls, footer: mobileFooter, errors: mobileErrors };
  await mobileContext.close();

  report.servedAssets = [];
  for (const suffix of [tripoPath, originalPath, 'environment-sample/v002/tree-a.glb', 'environment-sample/v002/shrub-a.glb', 'environment-sample/v002/dunes.glb', 'environment-sample/v003/shrub-b.glb', 'environment-sample/v003/shrub-c.glb']) {
    const path = `assets/world/${suffix}`;
    const response = await fetch(new URL(path, base)); expect(response.ok, `Served ${path}`).toBe(true);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.equals(await readFile(`public/${path}`)), `Served bytes match the actual asset: ${path}`).toBe(true);
    expect(bytes.toString('ascii', 0, 4)).toBe('glTF');
    report.servedAssets.push({ path, bytes: bytes.length, sha256: hash(bytes) });
  }
  report.protectedAfter = await protectedAssetCheck();
  expect(report.protectedAfter).toEqual(report.protectedBefore);
  report.technicalChecksPassed = true;
  await writeFile(`${prefix}-verification.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, views: report.views.length, jointChanges: { Walk: walk.changedBones.length, Run: run.changedBones.length }, movementDistances: { Walk: walk.distance, Run: run.distance }, protectedChecks: report.protectedAfter.length, servedAssets: report.servedAssets.length }));
} catch (error) {
  report.failure = error instanceof Error ? { message: error.message, stack: error.stack } : String(error);
  await writeFile(`${prefix}-verification.json`, JSON.stringify(report, null, 2) + '\n');
  throw error;
} finally { await browser?.close(); }
