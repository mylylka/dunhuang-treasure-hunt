import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import * as THREE from 'three';

// Observe the runtime's existing preview diagnostics to locate real canvas
// pixels. Every turn, walk, tap and scroll is sent as a player input.
const url = process.env.MOGAO_EXHIBIT_URL ?? 'http://127.0.0.1:4230/mogao-exhibit-v001.html';
const tapClosesDetail = (process.env.MOGAO_EXHIBIT_TAP_CLOSE ?? (new URL(url).port === '5173' ? '1' : '0')) === '1';
const selected = process.env.MOGAO_EXHIBIT_TARGET ?? 'both';
const hallADoor = selected === 'hall-a-door';
const hallA = selected === 'hall-a' || hallADoor;
const layoutRevision = process.env.MOGAO_EXHIBIT_LAYOUT ?? (hallA ? 'v004' : 'v001');
const revised = layoutRevision !== 'v001';
const arrivalMode = process.env.MOGAO_EXHIBIT_ARRIVAL ?? (layoutRevision === 'v004' ? 'doors' : 'legacy');
const ascentLoading = (process.env.MOGAO_EXHIBIT_WALL_LOADING ?? (arrivalMode === 'doors' ? 'ascent' : 'legacy')) === 'ascent';
const throttleArrival = process.env.MOGAO_EXHIBIT_THROTTLE === '1';
const lotusRevision = layoutRevision === 'v004';
const typographyRevision = layoutRevision === 'v003' || lotusRevision;
const artViewer = selected === 'art-viewer';
const wallThemes = selected === 'wall-themes';
assert(['v001', 'v005', 'v003', 'v004'].includes(layoutRevision), 'MOGAO_EXHIBIT_LAYOUT must be v001, v005, v003, or v004');
assert(['doors', 'legacy'].includes(arrivalMode), 'MOGAO_EXHIBIT_ARRIVAL must be doors or legacy');
const targets = ['all', 'both', 'desktop', 'mobile', 'arrival', 'plaque', 'details', 'art-viewer', 'wall-themes', 'hall-a', 'hall-a-door'];
assert(targets.includes(selected), `MOGAO_EXHIBIT_TARGET must be one of ${targets.join(', ')}`);
assert(selected !== 'plaque' || revised, 'Plaque close-up requires MOGAO_EXHIBIT_LAYOUT=v005, v003, or v004');
assert(selected !== 'details' || typographyRevision, 'Details mode requires MOGAO_EXHIBIT_LAYOUT=v003 or v004');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const evidencePrefix = wallThemes ? `wall-themes-${lotusRevision ? 'v002' : 'v001'}-` : artViewer ? 'art-viewer-v001-' :
  typographyRevision ? `title-layout-${layoutRevision}-` : revised ? 'wall-layout-v005-' : '';
const folder = resolve('work/world/mogao-exhibit-v001', hallA ? `mural-ending-v001/browser-${runId}`
  : selected === 'arrival' && ascentLoading ? `entrance-arrival-v001/wall-loading-${runId}`
  : selected === 'arrival' && arrivalMode === 'doors' ? `entrance-review-v001/arrival-browser-${runId}`
  : `${evidencePrefix}browser-${runId}`);
await mkdir(folder, { recursive: true });
const layout = JSON.parse(await readFile('src/content/world/mogao-upper-v002.json', 'utf8'));
const data = JSON.parse(await readFile('src/content/world/mogao-exhibit-v001.json', 'utf8'));
const hallAStories = hallA || selected === 'arrival' || selected === 'all'
  ? JSON.parse(await readFile('src/content/world/mogao-hall-a-v001.json', 'utf8')).stories : [];
const approved = revised ? JSON.parse(await readFile(typographyRevision
  ? `src/content/world/mogao-exhibit-layout-${layoutRevision}.json`
  : 'work/world/mogao-exhibit-v001/wall-layout-v005.json', 'utf8')) : null;
const expectedWallLabels = new Set((typographyRevision
  ? approved.walls.flatMap(wall => [wall.titlePath, wall.plaque?.path].filter(Boolean))
  : ['a', 'b', 'c', 'd'].map(wall => `mogao-exhibit/v002/title-${wall}.webp`).concat('mogao-exhibit/v002/plaque-d.webp'))
  .map(path => `/assets/world/${path}`));
const wallArtPaths = new Set(data.items.flatMap(item => [item.image?.path, ...(revised ? [item.detailImage?.path] : [])])
  .filter(Boolean).map(path => `/assets/world/${path}`));
if (!revised) {
  wallArtPaths.delete('/assets/world/mogao-exhibit/v002/c03.webp');
  wallArtPaths.add('/assets/world/mogao-exhibit/v001/c03.webp');
}
const thumbs = data.items.flatMap(item => item.thumb ? [item.thumb] : []);
const thumbBytes = (await Promise.all(thumbs.map(path => stat(resolve('public/assets/world', path))))).reduce((sum, file) => sum + file.size, 0);
assert(thumbBytes <= 150 * 1024, `Review images total ${thumbBytes} bytes`);

const report = { url, layout: layoutRevision, thumbBytes, devices: [], passed: false };
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
const progressKey = 'dunhuang:mogao-exhibit:progress:v1';
const walkKey = 'dunhuang:mogao-exhibit:walk:v1';
const hallAProgress = 'dunhuang:mogao-hall-a:progress:v1';
const yaw = -160 * Math.PI / 180;
const region = { x: 330, z: 90 };
const cos = Math.cos(yaw), sin = Math.sin(yaw);
const localToWorld = ({ x, z }) => ({
  x: region.x + cos * (x + layout.origin[0] - 122) + sin * (z + layout.origin[2] + 68),
  z: region.z - sin * (x + layout.origin[0] - 122) + cos * (z + layout.origin[2] + 68),
});
const worldToLocal = ({ x, z }) => ({
  x: cos * (x - region.x) - sin * (z - region.z) - layout.origin[0] + 122,
  z: sin * (x - region.x) + cos * (z - region.z) - layout.origin[2] - 68,
});
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
const bearing = (from, to) => Math.atan2(from.x - to.x, from.z - to.z);
const floorOrigin = layout.origin[1] + 10;
const hallARoom = layout.rooms.find(room => room.id === 'hall-a');
const hallB = layout.rooms.find(room => room.id === 'hall-b');
const [hallMinX, hallY, hallMinZ] = hallB.min;
const [hallMaxX, , hallMaxZ] = hallB.max;

function wallPoint(wall, across, height) {
  const local = wall === 'A' ? { x: hallMaxX, z: hallMinZ + across } :
    wall === 'B' ? { x: hallMaxX - across, z: hallMaxZ } :
    wall === 'C' ? { x: hallMinX, z: hallMaxZ - across } : { x: hallMinX + across, z: hallMinZ };
  return { ...localToWorld(local), y: floorOrigin + hallY + height };
}

function wallCoordinates(wall, [x, y, z]) {
  const local = worldToLocal({ x, z });
  const across = wall === 'A' ? local.z - hallMinZ : wall === 'B' ? hallMaxX - local.x
    : wall === 'C' ? hallMaxZ - local.z : local.x - hallMinX;
  return { across, height: y - floorOrigin - hallY };
}

function adjacentArtwork(marker, panels) {
  const wall = marker.wall;
  const { across, height } = wallCoordinates(wall, marker.center);
  const nearby = panels.filter(panel => panel.wall === wall).map(panel => {
    const origin = wallCoordinates(wall, panel.center);
    const nearestAcross = THREE.MathUtils.clamp(across, origin.across - panel.width / 2 + .08, origin.across + panel.width / 2 - .08);
    const nearestHeight = THREE.MathUtils.clamp(height, origin.height - panel.height / 2 + .08, origin.height + panel.height / 2 - .08);
    const face = wallPoint(wall, nearestAcross, nearestHeight);
    const base = wallPoint(wall, origin.across, origin.height);
    return {
      id: panel.id,
      center: [panel.center[0] + face.x - base.x, panel.center[1] + face.y - base.y, panel.center[2] + face.z - base.z],
      distance: Math.hypot(nearestAcross - across, nearestHeight - height),
    };
  });
  return nearby.sort((left, right) => left.distance - right.distance)[0];
}

function verifyApprovedPanels(panels) {
  assert.equal(panels.length, 13, '13 physical surfaces should share 12 exhibit IDs');
  return approved.walls.flatMap(wall => wall.panels.map(panel => {
    const actual = panels.find(item => item.id === panel.id);
    const { x, y, w, h } = panel.rect;
    const expected = wallPoint(wall.id, x + w / 2, y + h / 2);
    assert(actual, `Missing accepted panel ${panel.id}`);
    const centerError = Math.hypot(actual.center[0] - expected.x, actual.center[1] - expected.y, actual.center[2] - expected.z);
    assert(centerError < .09, `${panel.id} moved ${centerError.toFixed(3)}m away from its accepted center`);
    assert(Math.abs(actual.width - w) < .025 && Math.abs(actual.height - h) < .025,
      `${panel.id} dimensions ${actual.width}×${actual.height} do not match accepted ${w}×${h}`);
    return { id: panel.id, centerError, width: actual.width, height: actual.height };
  }));
}

function verifyCaveFinish(state, interiorRequired = false) {
  const finish = state.interiorLighting?.finish;
  assert.equal(finish?.version, 'v005', 'the exhibit build must use the approved cave finish');
  assert(finish.surfaces.upper.wall > 0 && finish.surfaces.upper.ceiling > 0 && finish.surfaces.upper.floor > 0,
    'upper halls and shaft must expose their prepared stone surfaces');
  if (interiorRequired) {
    assert(finish.surfaces.interior.wall > 0 && finish.surfaces.interior.ceiling > 0,
      'the lower cave must expose its prepared wall and ceiling surfaces');
  }
  return finish;
}

async function verify(mode) {
  const shortMobile = mode === 'mobile-short';
  const bIsolation = mode === 'mobile-b-isolation';
  const mobile = shortMobile || bIsolation || mode === 'mobile';
  const viewport = shortMobile ? { width: 640, height: 255 }
    : mobile ? { width: 844, height: 390 } : { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const seenRequests = [];
  const hallRequests = [];
  const successfulWallLabels = new Set();
  const evidence = { mode, viewport, clicked: [], requests: seenRequests, screenshots: [], errors: [], checks: [] };
  if (hallA) evidence.hallARequests = hallRequests;
  report.devices.push(evidence);
  const canvas = page.locator('[data-world-canvas]');
  const intro = page.getByTestId('mogao-exhibit-intro');
  const detail = page.getByTestId('mogao-exhibit-detail');
  const wallTheme = page.getByTestId('mogao-exhibit-wall-theme');
  const storyPlayer = page.getByTestId('world-story');
  const art = page.getByTestId('mogao-exhibit-art');
  const reward = page.getByTestId('mogao-reward-award');
  const rewardPaper = page.getByTestId('mogao-reward-paper');
  const guide = page.getByTestId('mogao-reward-guide');
  const guideButton = page.getByTestId('mogao-reward-guide-button');
  const resume = page.getByTestId('world-resume');
  let phase = 'starting';
  page.on('pageerror', error => evidence.errors.push(error.message));
  if (hallA && mobile && !bIsolation) await page.route(/\/assets\/MogaoHallAStory-[^/]+\.js$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (/\/mogao-exhibit\/v\d{3}\//.test(path)) seenRequests.push({ phase, path });
    if (hallA && path.includes('/mogao-hall-a/')) hallRequests.push({ phase, path });
  });
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (response.ok() && expectedWallLabels.has(path)) {
      successfulWallLabels.add(path);
    }
  });
  if (mobile) await page.route(`**/${data.items.find(item => item.id === 'D01').image.path}`, route => {
    if (revised && route.request().resourceType() !== 'image') return route.continue();
    return route.fulfill({ status: 403, body: 'Simulated unavailable exhibit' });
  });

  const state = () => page.evaluate(() => window.__terrain.inspect());
  const progress = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), progressKey);
  const thumbRequests = () => [...new Set(seenRequests.filter(request => /-thumb\.webp$/.test(request.path)).map(request => request.path))];
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const clickControl = locator => mobile ? locator.tap() : locator.click();

  async function shot(name) {
    const file = `${mode}-${name}.png`;
    await page.screenshot({ path: resolve(folder, file) });
    evidence.screenshots.push(file);
  }

  async function ready() {
    await page.waitForFunction(() => window.__terrain?.inspect().loaded, null, { timeout: 90_000 });
    await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true');
    if (await resume.isVisible()) await clickControl(resume);
    await page.waitForFunction(() => window.__terrain.inspect().paused === false);
  }

  async function dragTouch(x, y, dx, dy, steps = 6) {
    const send = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
    await send('touchStart', { x, y });
    for (let index = 1; index <= steps; index++) await send('touchMove', { x: x + dx * index / steps, y: y + dy * index / steps });
    await send('touchEnd');
  }

  async function turnBy(dx, dy = 0) {
    const rect = await canvas.boundingBox();
    assert(rect, 'canvas has no bounds');
    const x = rect.x + rect.width * (dx >= 0 ? .56 : .93);
    const y = await page.evaluate(({ x, rect, dy }) => [.38, .28, .5, .61, .72, .43, .82]
      .map(ratio => rect.y + rect.height * ratio)
      .find(y => y + dy > rect.y + 5 && y + dy < rect.y + rect.height - 5 &&
        document.elementFromPoint(x, y)?.matches('[data-world-canvas]')), { x, rect, dy });
    assert(y !== undefined, 'No uncovered canvas point to start turning');
    if (mobile) {
      const send = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
      await send('touchStart', { x, y });
      if (Math.hypot(dx, dy) <= 10) {
        if (dx) await send('touchMove', { x: x + 14 * Math.sign(dx), y });
        else if (dy) await send('touchMove', { x, y: y + 14 * Math.sign(dy) });
      }
      await send('touchMove', { x: x + dx, y: y + dy });
      await send('touchEnd');
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down({ button: 'right' });
      try { await page.mouse.move(x + dx, y + dy, { steps: 6 }); }
      finally { await page.mouse.up({ button: 'right' }); }
    }
  }

  async function aim(target) {
    for (let attempt = 0; attempt < 9; attempt++) {
      const current = await state();
      const desired = bearing(current.checkpoint.position, target);
      const difference = angle(desired - current.checkpoint.cameraYaw);
      if (Math.abs(difference) <= .018) { await page.waitForTimeout(370); return; }
      await turnBy(THREE.MathUtils.clamp(-difference / .004, -246, 246));
    }
    const current = await state();
    throw new Error(`Camera turn did not reach ${bearing(current.checkpoint.position, target)} from ${current.checkpoint.cameraYaw}`);
  }

  async function aimHeight(point) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { camera } = await state();
      const [x, y, z] = camera.position;
      const current = Math.atan2(camera.target[1] - y, Math.hypot(camera.target[0] - x, camera.target[2] - z));
      const desired = Math.atan2(point.y - y, Math.hypot(point.x - x, point.z - z));
      const difference = desired - current;
      if (Math.abs(difference) <= .033) return;
      await turnBy(0, THREE.MathUtils.clamp(-difference / .004, -95, 95));
      await page.waitForTimeout(480);
    }
  }

  async function changeViewDistance(wide) {
    if (!revised) return;
    const rect = await canvas.boundingBox();
    assert(rect, 'canvas has no bounds');
    if (mobile) {
      const x = rect.x + rect.width * .72, y = rect.y + rect.height * .52;
      for (let attempt = 0; attempt < 2; attempt++) {
        const touches = span => [{ id: 1, x: x - span, y }, { id: 2, x: x + span, y }];
        const spans = wide ? [.16, .12, .08, .04, .018] : [.018, .04, .08, .12, .16];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches(rect.width * spans.shift()) });
        for (const span of spans) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touches(rect.width * span) });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
    } else {
      await page.mouse.move(rect.x + rect.width * .7, rect.y + rect.height * .52);
      for (let step = 0; step < 8; step++) await page.mouse.wheel(0, wide ? 230 : -230);
    }
    await page.waitForTimeout(450);
  }

  const widenView = () => changeViewDistance(true);

  async function aimWall(wall) {
    const panels = (await state()).exhibit.panels.filter(panel => panel.wall === wall);
    assert.equal(panels.length, revised && wall === 'C' ? 4 : 3);
    if (revised) {
      const fullWall = approved.walls.find(item => item.id === wall);
      const midpoint = wallPoint(wall, fullWall.width / 2, 3);
      await aim(midpoint);
      await aimHeight(midpoint);
    } else await aim({ x: panels[1].center[0], z: panels[1].center[2] });
  }

  async function canvasPoint(center, label, adjusted = false) {
    const current = await state();
    const rect = await canvas.boundingBox();
    assert(center && rect, `No projection source for ${label}`);
    const camera = new THREE.PerspectiveCamera(current.camera.fov, rect.width / rect.height, .1, 1400);
    camera.position.fromArray(current.camera.position);
    camera.lookAt(new THREE.Vector3().fromArray(current.camera.target));
    camera.updateMatrixWorld(true);
    const p = new THREE.Vector3().fromArray(center).project(camera);
    const x = rect.x + (p.x + 1) * rect.width / 2;
    const y = rect.y + (1 - p.y) * rect.height / 2;
    const inView = Math.abs(p.x) < .97 && Math.abs(p.y) < .97 && p.z < 1;
    const hit = inView && await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.matches('[data-world-canvas]'), { x, y });
    if (revised && !adjusted && !hit) {
      const [x, y, z] = center;
      await aim({ x, z });
      await aimHeight({ x, y, z });
      return canvasPoint(center, label, true);
    }
    assert(inView, `${label} is outside the camera: ${p.toArray()}`);
    assert(hit, `${label} target at (${Math.round(x)}, ${Math.round(y)}) is covered by the interface`);
    return { x, y };
  }

  async function openPanel(id, edgePoint) {
    const panel = (await state()).exhibit.panels.find(panel => panel.id === id);
    const point = await canvasPoint(edgePoint ?? panel?.center, id);
    await tap(point.x, point.y);
    await expect(detail, `Tap ${id} at ${point.x}, ${point.y}`).toBeVisible({ timeout: 5000 });
    await expect(detail).toHaveAttribute('data-exhibit-id', id.replace(/-detail$/, ''));
    if (id === 'C03-detail') {
      await expect(detail).toHaveAttribute('data-exhibit-image', 'detail');
      await expect(detail.locator('img')).toHaveAttribute('src', /\/v002\/c03-detail\.webp$/);
      await shot('c03-detail');
    }
    evidence.clicked.push({ id, x: Math.round(point.x), y: Math.round(point.y), ...(edgePoint && { nearLotus: true }) });
    if (mobile && id === 'D01') {
      await expect(page.getByTestId('mogao-exhibit-placeholder')).toBeVisible();
      await expect(detail.getByRole('link', { name: '查看出处' })).toHaveAttribute('href', /^https?:/);
      await shot('failed-image-detail');
    }
  }

  async function closePanel() {
    const close = detail.getByRole('button', { name: '关闭展品' });
    if (tapClosesDetail) await expect(close).toHaveCount(0);
    await clickControl(tapClosesDetail ? art : close);
    await expect(detail).toBeHidden();
    await page.waitForFunction(() => !window.__terrain.inspect().paused);
  }

  async function verifyWallTheme(wall, marker) {
    await aimWall(wall.id);
    const point = await canvasPoint(marker.center, marker.id);
    const checkpoint = (await state()).checkpoint;
    const viewed = (await progress()).viewed ?? [];
    await shot(`wall-${wall.id}-lotus`);
    await tap(point.x, point.y);
    await expect(wallTheme, `Tap ${marker.id} at ${point.x}, ${point.y}`).toBeVisible();
    await expect(wallTheme).toHaveAttribute('data-wall-id', wall.id);
    await expect(wallTheme.getByRole('heading', { name: wall.title, exact: true })).toBeVisible();
    await expect(wallTheme.getByText(wall.intro, { exact: true })).toBeVisible();
    await expect(detail).toBeHidden();
    await page.waitForFunction(() => window.__terrain.inspect().paused);
    await expect.poll(() => wallTheme.evaluate(node => !node.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'))).toBe(true);
    await shot(`wall-${wall.id}-theme`);
    await clickControl(wallTheme.getByRole('button', { name: '关闭墙面主题' }));
    await expect(wallTheme).toBeHidden();
    await page.waitForFunction(() => !window.__terrain.inspect().paused);
    const after = await state();
    assert.deepEqual(after.checkpoint.position, checkpoint.position);
    assert.equal(after.checkpoint.cameraYaw, checkpoint.cameraYaw);
    assert.equal(after.checkpoint.walkSurface, 'hall-b');
    assert.deepEqual((await progress()).viewed ?? [], viewed);
    evidence.checks.push({ wall: wall.id, marker, point, title: wall.title, position: after.checkpoint.position });
  }

  async function artwork() {
    const image = art.locator('img');
    await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0 && img.clientHeight > 10)).toBe(true);
    await expect.poll(() => art.evaluate(node => !node.closest('.mogao-exhibit-detail').getAnimations().some(animation => animation.playState === 'running'))).toBe(true);
    return image;
  }

  async function verifyInitialArtwork(id) {
    const item = data.items.find(item => item.id === id);
    const image = await artwork();
    await expect(art).toHaveAttribute('data-zoom', '1');
    await expect(detail.getByRole('group', { name: '图像放大倍率' })).toHaveCount(0);
    await expect(detail.getByRole('button', { name: /倍图像|^[123][×x]$/ })).toHaveCount(0);
    const caption = detail.getByRole('heading', { name: item.title });
    const copy = detail.getByText(item.voice, { exact: true });
    const source = detail.getByRole('link', { name: '查看出处' });
    const close = detail.getByRole('button', { name: '关闭展品' });
    await expect(caption).toBeVisible();
    await expect(copy).toBeVisible();
    await expect(source).toHaveAttribute('href', item.page);
    if (tapClosesDetail) await expect(close).toHaveCount(0);
    const [picture, stage, heading, text, link] = await Promise.all([image, art, caption, copy, source].map(node => node.boundingBox()));
    const closeButton = tapClosesDetail ? null : await close.boundingBox();
    const within = (inner, outer) => inner && outer && inner.x >= outer.x - 1 && inner.y >= outer.y - 1 &&
      inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1;
    const visible = { x: 0, y: 0, ...viewport };
    assert(within(picture, stage) && within(picture, visible), `${id} is clipped at the initial fit`);
    assert(within(heading, visible) && within(link, visible), `${id} title or source is outside the viewport`);
    assert(Math.abs(picture.width / picture.height - item.image.width / item.image.height) < .02, `${id} artwork is stretched`);
    if (shortMobile) {
      const sideContent = closeButton ? [heading, text, link, closeButton] : [heading, text, link];
      assert(sideContent.every(rect => within(rect, visible) && rect.x >= picture.x + picture.width),
        `${id} caption and controls must be visible beside the picture`);
      if (id === 'B02') assert(picture.height >= viewport.height * .85, `${id} uses only ${picture.height}px of ${viewport.height}px`);
    }
    evidence.checks.push({ id, fittedPicture: picture, stage, heading, text, source: link });
    await shot(`${id.toLowerCase()}-fitted`);

    if (shortMobile && id === 'C01') {
      const reading = detail.getByLabel('展品讲解');
      const maxScroll = await reading.evaluate(node => node.scrollHeight - node.clientHeight);
      if (maxScroll > 1) {
        const bounds = await reading.boundingBox();
        assert(bounds, 'caption scroll region has no bounds');
        await dragTouch(bounds.x + bounds.width / 2, bounds.y + bounds.height * .8, 0, -bounds.height * .62);
        await expect.poll(() => reading.evaluate(node => node.scrollTop)).toBeGreaterThanOrEqual(maxScroll - 1);
        assert.deepEqual(await image.boundingBox(), picture);
        assert.deepEqual(await source.boundingBox(), link);
        if (closeButton) assert.deepEqual(await close.boundingBox(), closeButton);
        evidence.checks.push({ id, captionScroll: maxScroll });
        await shot('c01-caption-scrolled');
      }
    }
  }

  async function verifyArtworkGestures() {
    const image = await artwork();
    const box = await art.boundingBox();
    const initial = await image.boundingBox();
    assert(box && initial, 'artwork or its gesture stage has no bounds');
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const zoom = async () => Number(await art.getAttribute('data-zoom'));
    const viewScale = () => page.evaluate(() => window.visualViewport.scale);
    const visualScale = await viewScale();
    const worldBefore = (await state()).checkpoint;
    let moved;
    const samples = [];
    const centerY = rect => rect.y + rect.height / 2;
    async function verifyDisplayedScale() {
      const value = await zoom();
      await expect.poll(async () => Math.abs((await image.boundingBox()).height / initial.height - value)).toBeLessThan(.02);
      samples.push(value);
    }
    async function checkPan(pan) {
      const before = centerY(await image.boundingBox());
      await pan();
      await expect.poll(async () => Math.abs(centerY(await image.boundingBox()) - before)).toBeGreaterThan(15);
      moved = centerY(await image.boundingBox()) - before;
    }

    if (mobile) {
      const span = Math.min(42, box.width / 8);
      const anchorY = center.y - 24;
      const anchoredImageY = (anchorY - initial.y) / initial.height;
      const touch = (type, scale) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: scale ? [
        { id: 1, x: center.x - span * scale, y: anchorY }, { id: 2, x: center.x + span * scale, y: anchorY },
      ] : [] });
      await touch('touchStart', 1);
      try {
        for (const factor of [1.28, 1.63, 2.3]) {
          await touch('touchMove', factor);
          const previous = samples.at(-1) ?? 1;
          await expect.poll(zoom).toBeGreaterThan(previous + .1);
          await verifyDisplayedScale();
          const displayed = await image.boundingBox();
          assert(Math.abs(displayed.y + displayed.height * anchoredImageY - anchorY) < 3, 'pinch moved the art away from the touch midpoint');
        }
      } finally { await touch('touchEnd'); }
      assert(samples.filter(scale => Math.abs(scale - Math.round(scale)) > .02).length >= 2, `pinch snapped to fixed steps: ${samples}`);
      await checkPan(() => dragTouch(center.x, center.y, 0, -Math.min(56, box.height / 4)));
      await shot('zoomed-detail');
      await touch('touchStart', 2.3);
      try {
        for (const factor of [1.7, 1.3, .95]) await touch('touchMove', factor);
      } finally { await touch('touchEnd'); }
    } else {
      await page.mouse.move(center.x, center.y);
      await page.mouse.wheel(0, -180);
      await expect.poll(zoom).toBeGreaterThan(1.05);
      await verifyDisplayedScale();
      await art.focus();
      await page.keyboard.press('+');
      await expect.poll(zoom).toBeGreaterThan(samples[0] + .05);
      await verifyDisplayedScale();
      await checkPan(() => page.keyboard.press('ArrowDown'));
      await shot('zoomed-detail');
      await page.keyboard.press('-');
      await expect.poll(zoom).toBeLessThan(samples.at(-1) - .05);
      await verifyDisplayedScale();
      await page.keyboard.press('0');
    }
    await expect.poll(zoom).toBe(1);
    const restored = await image.boundingBox();
    assert(Math.abs(restored.width - initial.width) <= 2 && Math.abs(restored.height - initial.height) <= 2 &&
      Math.abs(restored.x - initial.x) <= 2 && Math.abs(restored.y - initial.y) <= 2, 'zoom reset did not restore the centered image');
    assert(Math.abs(await viewScale() - visualScale) < .01, 'artwork gestures changed browser page zoom');
    const worldAfter = await state();
    assert(worldAfter.paused && worldAfter.checkpoint.cameraYaw === worldBefore.cameraYaw &&
      JSON.stringify(worldAfter.checkpoint.position) === JSON.stringify(worldBefore.position), 'artwork gestures also moved the 3D scene');
    evidence.checks.push({ zoomSamples: samples, verticalPan: moved, restored, pageScale: visualScale });
  }

  async function holdForward(check) {
    if (!mobile) {
      await page.keyboard.down('w');
      try { return await check(); } finally { await page.keyboard.up('w'); }
    }
    const rect = await page.getByRole('group', { name: '拖动摇杆行走' }).boundingBox();
    assert(rect, 'mobile joystick has no bounds');
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height * .23 }],
    });
    try { return await check(); }
    finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  }

  async function verifyWalkResumes() {
    const position = (await state()).checkpoint.position;
    await holdForward(async () => {
      await page.waitForFunction(from => {
        const { x, z } = window.__terrain.inspect().checkpoint.position;
        return Math.hypot(x - from.x, z - from.z) > .25;
      }, position, { timeout: 3500 });
    });
  }

  async function walkTo(local, tolerance = .36) {
    const target = localToWorld(local);
    const current = await state();
    if (Math.hypot(target.x - current.checkpoint.position.x, target.z - current.checkpoint.position.z) <= tolerance) return;
    await aim(target);
    await holdForward(async () => {
      await page.waitForFunction(({ target, tolerance }) => {
        const position = window.__terrain.inspect().checkpoint.position;
        return Math.hypot(target.x - position.x, target.z - position.z) <= tolerance;
      }, { target, tolerance }, { timeout: 13_000 });
    });
  }

  async function captureTitle(wall) {
    const title = approved.walls.find(item => item.id === wall).titleBox;
    const target = wallPoint(wall, title.x + title.w / 2, title.y + title.h / 2);
    const local = worldToLocal(target);
    const near = wall === 'B'
      ? { x: THREE.MathUtils.clamp(local.x, hallMinX + 1.2, hallMaxX - 1.2), z: hallMaxZ - 3.35 }
      : { x: hallMinX + 5, z: local.z };
    await walkTo(near, .26);
    await changeViewDistance(false);
    await aim(target);
    await aimHeight(target);
    await shot(`title-${wall}`);
  }

  async function capturePlaque(side) {
    const plaque = approved.walls.find(wall => wall.id === 'D').plaque.rect;
    const across = plaque.x + plaque.w / 2;
    await walkTo({ x: hallMinX + across + (side ? 2.6 : 0), z: hallMinZ + (side ? 2.6 : 3.1) }, .25);
    await changeViewDistance(false);
    const target = wallPoint('D', across, plaque.y + plaque.h / 2);
    await aim(target);
    await aimHeight(side ? { ...target, y: target.y - .55 } : target);
    await shot(side ? 'plaque-oblique' : 'plaque-close-up');
  }

  async function checkLockedDoor(surface = 'hall-b') {
    await walkTo({ x: 17, z: -12.8 }, .19);
    const approach = worldToLocal((await state()).checkpoint.position);
    await aim(localToWorld({ x: 13.5, z: approach.z }));
    await holdForward(async () => {
      await page.waitForFunction(() => window.__terrain.inspect().moving, null, { timeout: 3000 });
      await page.waitForTimeout(2600);
    });
    const locked = await state();
    evidence.lockedDoor = worldToLocal(locked.checkpoint.position);
    assert.equal(locked.checkpoint.walkSurface, surface);
    assert(evidence.lockedDoor.x >= 15.47 && evidence.lockedDoor.x < 15.95, 'player did not reach the locked threshold');
  }

  async function checkOpenDoor(surface = 'view-b') {
    await walkTo({ x: 17, z: -12.8 }, .19);
    await walkTo({ x: 14.4, z: -12.8 }, .16);
    await walkTo({ x: 13.5, z: -12.2 }, .18);
    await walkTo({ x: 11.2, z: -12.2 });
    const viewed = await state();
    assert.equal(viewed.checkpoint.walkSurface, surface);
    evidence.openDoor = worldToLocal(viewed.checkpoint.position);
    await shot('viewing-platform');
  }

  async function verifyAward(id) {
    await expect(reward).toHaveAttribute('data-reward-id', id);
    await expect(reward).toContainText(/观佛/);
    await expect(rewardPaper).toBeVisible();
    const box = await rewardPaper.boundingBox();
    assert(box && Math.abs(box.x + box.width / 2 - viewport.width / 2) < 22 &&
      Math.abs(box.y + box.height / 2 - viewport.height / 2) < viewport.height * .24, 'reward paper is not near the center');
    assert.equal(await reward.locator('.mogao-award-light').evaluate(element => getComputedStyle(element, '::before').animationName), 'mogao-award-ring');
    await page.waitForFunction(() => window.__terrain.inspect().paused);
    await shot(`${id}-reward`);
  }

  async function openGuideCard(id) {
    await clickControl(guideButton);
    await expect(guide).toBeVisible();
    await clickControl(guide.getByTestId(`mogao-reward-card-${id}`));
    await expect(guide).toBeHidden();
  }

  async function verifyInteriorFromHere() {
    const before = (await state()).checkpoint;
    await page.waitForFunction(() => window.__terrain.inspect().terrain?.scene?.streaming?.['cliff-interior'] === 'ready',
      null, { timeout: 30_000 });
    const after = (await state()).checkpoint;
    assert.deepEqual(after.position, before.position, 'viewing interior must load without movement');
    assert.equal(after.walkSurface, before.walkSurface);
    evidence.checks.push({ viewingInteriorReadyAt: before.position, surface: before.walkSurface });
  }

  async function verifyScroll() {
    assert.equal(thumbRequests().length, 0, 'scroll thumbnails requested before opening the scroll');
    phase = 'scroll-initial';
    await clickControl(rewardPaper);
    const scroll = page.getByTestId('mogao-exhibit-scroll'), body = page.getByTestId('mogao-exhibit-scroll-body');
    await expect(scroll).toBeVisible();
    await expect.poll(() => thumbRequests().length, { timeout: 8000 }).toBeGreaterThan(0);
    const initial = thumbRequests();
    assert(initial.length < thumbs.length, 'all thumbnails requested before scrolling');
    assert(!initial.some(path => path.endsWith('/d03-thumb.webp')), 'last chapter was fetched before scrolling');
    await shot('scroll-initial');
    phase = 'scroll-moving';
    const rect = await body.boundingBox();
    assert(rect, 'review scroll has no body bounds');
    const x = rect.x + rect.width * .6;
    for (let attempt = 0; attempt < 22 && !thumbRequests().some(path => path.endsWith('/d03-thumb.webp')); attempt++) {
      if (mobile) await dragTouch(x, rect.y + rect.height * .83, 0, -rect.height * .65, 7);
      else { await page.mouse.move(x, rect.y + rect.height / 2); await page.mouse.wheel(0, rect.height * .7); }
      await page.waitForTimeout(170);
    }
    await expect.poll(() => thumbRequests().some(path => path.endsWith('/d03-thumb.webp')), { timeout: 7000 }).toBe(true);
    assert(await body.evaluate(node => node.scrollTop) > 0);
    assert.equal(await body.locator('li[data-exhibit-id]').count(), 12);
    await shot('scroll-bottom');
    evidence.scroll = { initial: initial.length, afterScrolling: thumbRequests().length };
    await clickControl(scroll.getByRole('button', { name: '合上手卷' }));
    await expect(scroll).toBeHidden();
    await page.waitForFunction(() => !window.__terrain.inspect().paused);
  }

  async function aimAt([x, y, z]) {
    await aim({ x, z });
    await aimHeight({ x, y, z });
  }

  async function hallAImages() {
    await page.waitForFunction(() => {
      const hall = window.__terrain.inspect().hallA;
      return hall?.targets.length === 6 && Object.values(hall.images).every(image => image.status === 'ready');
    }, null, { timeout: 15_000 });
    return (await state()).hallA;
  }

  async function verifyStory(story, target) {
    const tier = mobile ? 'mobile' : 'desktop';
    const asset = path => `/assets/world/${path}`;
    const imagePath = (image, path) => expect.poll(() => image.evaluate(img => new URL(img.src).pathname)).toBe(asset(path));
    const full = storyPlayer.getByTestId('story-background');
    const subtitle = storyPlayer.getByTestId('story-subtitle');
    const highlight = storyPlayer.getByTestId('story-highlight');
    const detailImage = storyPlayer.getByTestId('story-detail');
    const step = storyPlayer.getByTestId('world-story-step');
    const phaseIs = async (name, index) => {
      for (let elapsed = 0; elapsed < 90_000; elapsed += 250) {
        if (await storyPlayer.getAttribute('data-phase') === name &&
            (index === undefined || await step.getAttribute('data-index') === String(index))) return;
        await page.clock.runFor(250);
      }
      throw new Error(`Expected ${story.id} to advance automatically to ${name}, part ${index}`);
    };
    const [x, y, z] = target.center;
    const clickPosition = target.kind === 'title' ? [x, y + target.rect.h * .21, z] : target.center;
    await aimAt(clickPosition);
    const point = await canvasPoint(clickPosition, target.key);
    const before = (await state()).checkpoint;
    phase = `story-${story.id}-intro`;
    await tap(point.x, point.y);
    await expect(storyPlayer).toBeVisible();
    await expect(storyPlayer).toHaveAttribute('data-story-id', story.id);
    await expect(storyPlayer).toHaveAttribute('data-story-mode', 'text');
    await expect(storyPlayer.getByTestId('story-audio')).toHaveCount(0);
    await expect(storyPlayer.getByRole('button', { name: /上一段|下一段/ })).toHaveCount(0);
    await imagePath(full, story.full[tier]);
    await expect(storyPlayer.getByText(story.source, { exact: true })).toBeVisible();
    await phaseIs('introduction');
    await expect(subtitle).toBeVisible();
    assert(!hallRequests.some(request => request.path.includes(`/${story.id}-detail-`)), 'local artwork was fetched during the introduction');
    await page.waitForFunction(() => window.__terrain.inspect().paused);
    await expect(storyPlayer.getByRole('button', { name: '暂停', exact: true })).toHaveCount(0);
    await shot(`${story.id}-full`);

    for (const [index, segment] of story.segments.entries()) {
      phase = `story-${story.id}-${segment.id}`;
      await phaseIs('highlight', index);
      await expect(highlight).toBeVisible();
      const [sourceBox, goldBox] = await Promise.all([full.boundingBox(), highlight.boundingBox()]);
      const [left, top, right, bottom] = segment.region;
      assert(sourceBox && goldBox && Math.abs(goldBox.x - (sourceBox.x + sourceBox.width * left)) < 2 &&
        Math.abs(goldBox.y - (sourceBox.y + sourceBox.height * top)) < 2 &&
        Math.abs(goldBox.width - sourceBox.width * (right - left)) < 2 &&
        Math.abs(goldBox.height - sourceBox.height * (bottom - top)) < 2, `${segment.id} gold outline does not follow the supplied narrative rectangle`);
      if (index === 0) await shot(`${story.id}-highlight`);
      await phaseIs('narration', index);
      await imagePath(detailImage, segment.image[tier]);
      await expect(subtitle).toBeVisible();
      const imageBox = await detailImage.boundingBox();
      assert(imageBox && imageBox.x >= -1 && imageBox.y >= -1 && imageBox.x + imageBox.width <= viewport.width + 1 &&
        imageBox.y + imageBox.height <= viewport.height + 1, `${segment.id} detail is outside the viewport`);
      const allowed = new Set(story.segments.slice(0, index + 1).map(s => asset(s.image[tier])));
      assert(hallRequests.filter(request => request.path.includes(`/${story.id}-detail-`)).every(request => allowed.has(request.path)),
        `${story.id} fetched a later segment early`);
      if (index === 0 || index === 4) await shot(`${story.id}-${segment.id}`);
      evidence.checks.push({ story: story.id, segment: segment.id, imageBox });
    }

    phase = `story-${story.id}-ending`;
    await phaseIs('invitation');
    await expect(subtitle).toHaveText(story.ending);
    await shot(`${story.id}-whole-ending`);
    const storyBox = await storyPlayer.boundingBox();
    assert(storyBox, 'story has no visible ending stage');
    await tap(storyBox.x + storyBox.width * .91, storyBox.y + storyBox.height * .5);
    await phaseIs('finished');
    await expect(detailImage).toHaveCount(0);
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), `${hallAProgress}:${story.id}`)).toBe('complete');
    assert.equal((await state()).exhibit.hallAGate.strength, 1, 'A must stay locked until the story closes');
    await shot(`${story.id}-ending`);
    await clickControl(storyPlayer.getByRole('button', { name: '继续漫游' }));
    await expect(storyPlayer).toBeHidden();
    const after = (await state()).checkpoint;
    assert.deepEqual(after.position, before.position);
    assert.equal(after.cameraYaw, before.cameraYaw);
    assert.equal(after.walkSurface, 'hall-a');
    evidence.clicked.push({ id: story.id, kind: target.kind, wall: target.wall, point });
  }

  async function verifyHallA() {
    phase = 'hall-a-loading';
    assert.equal((await state()).checkpoint.walkSurface, 'hall-a');
    await expect(intro).toBeHidden();
    const installed = await hallAImages();
    const tier = mobile ? 'mobile' : 'desktop';
    assert.equal(installed.tier, tier);
    assert(installed.targets.every(target => target.visible));
    assert.deepEqual(new Set(hallRequests.map(request => request.path)), new Set([
      ...hallAStories.map(story => `/assets/world/${story.full[tier]}`),
      ...['title-bandits', 'title-burning-house', 'plaque'].map(name => `/assets/world/mogao-hall-a/v001/${name}.webp`),
    ]), 'A should preload its two full images, both titles and the plaque only');
    assert(!seenRequests.some(request => wallArtPaths.has(request.path)), 'direct A requested B artwork');
    evidence.checks.push({ tier, targets: installed.targets, plaque: installed.plaque });
    if (hallADoor) {
      phase = 'hall-a-c-door-approach';
      await walkTo({ x: 17, z: -12.8 }, .24);
      await page.waitForFunction(() => window.__terrain.inspect().terrain?.scene?.streaming?.['cliff-interior'] === 'ready', null, { timeout: 15_000 });
      const before = (await state()).checkpoint;
      assert.equal(before.walkSurface, 'hall-a');
      const doorway = localToWorld({ x: 14.8, z: -13 });
      await aimAt([doorway.x, floorOrigin + hallARoom.floorY + 2.1, doorway.z]);
      await shot('hall-a-c-door-ready');
      phase = 'hall-a-c-door-walk';
      await walkTo({ x: 14.4, z: -12.8 }, .18);
      await walkTo({ x: 13.5, z: -12.2 }, .18);
      await walkTo({ x: 11.2, z: -12.2 });
      const after = (await state()).checkpoint;
      assert.equal(after.walkSurface, 'view-a');
      await shot('hall-a-c-viewing-platform');
      evidence.checks.push({ approach: worldToLocal(before.position), platform: worldToLocal(after.position) });
      assert.deepEqual(evidence.errors, []);
      evidence.passed = true;
      return;
    }
    assert.equal((await state()).exhibit.hallAGate.strength, 1);
    await widenView();
    const banditsTitle = installed.targets.find(target => target.id === 'bandits' && target.kind === 'title');
    const houseTitle = installed.targets.find(target => target.id === 'burning-house' && target.kind === 'title');
    const houseArt = installed.targets.find(target => target.id === 'burning-house' && target.kind === 'art');
    const [minX, y, minZ] = hallARoom.min;
    const [maxX, , maxZ] = hallARoom.max;
    const floor = floorOrigin + y;
    const aimLocal = async (x, z, height) => {
      const world = localToWorld({ x, z });
      await aimAt([world.x, floor + height, world.z]);
    };
    await aimLocal(minX + (maxX - minX) * .43, minZ, 3.22);
    await shot('hall-a-d-title-plaque');
    await aimLocal(maxX, minZ, 2.8);
    await shot('hall-a-d-a-corner');
    await aimLocal(maxX, maxZ, 2.8);
    await shot('hall-a-a-b-corner');
    await aimLocal(minX, (minZ + maxZ) / 2, 3.18);
    await shot('hall-a-c-title-art');
    await aimAt(houseTitle.center);
    await shot('hall-a-c-provenance');
    await verifyStory(hallAStories[0], banditsTitle);
    assert.equal((await state()).exhibit.hallAGate.strength, 1);
    assert(!hallRequests.some(request => request.path.includes('/burning-house-detail-')));
    await verifyStory(hallAStories[1], houseArt);
    phase = 'hall-a-reward';
    await verifyAward('hall-a');
    await clickControl(rewardPaper);
    const paper = page.getByTestId('mogao-hall-a-scroll');
    await expect(paper).toContainText('五百强盗成佛图');
    await expect(paper).toContainText('火宅喻');
    await shot('hall-a-scroll');
    await clickControl(paper.getByRole('button', { name: '合上观壁笺' }));
    await expect(paper).toBeHidden();
    await page.waitForFunction(() => window.__terrain.inspect().exhibit?.hallAGate.strength === 0 && !window.__terrain.inspect().paused);
    await verifyInteriorFromHere();
    await openGuideCard('hall-a');
    await expect(paper).toBeVisible();
    await clickControl(paper.getByRole('button', { name: '合上观壁笺' }));
    await expect(guide).toBeVisible();
    await clickControl(guide.getByRole('button', { name: '关闭图鉴' }));
    phase = 'hall-a-resume';
    await verifyWalkResumes();
    assert.deepEqual((await progress()).viewed ?? [], []);
    assert.deepEqual(evidence.errors, []);
    evidence.passed = true;
  }

  try {
    if (hallADoor) {
      await page.addInitScript(key => {
        localStorage.setItem(`${key}:bandits`, 'complete');
        localStorage.setItem(`${key}:burning-house`, 'complete');
        localStorage.setItem(`${key}:award`, 'received');
      }, hallAProgress);
    } else if (hallA && !bIsolation) await page.clock.install();
    await page.goto(`${url}?view=${hallA && !bIsolation ? 'hall-a' : 'hall-b'}`, { waitUntil: 'domcontentloaded' });
    await ready();
    if (hallA && !bIsolation) {
      await verifyHallA();
      return;
    }
    await expect(intro).toBeVisible();
    if (wallThemes) {
      const instruction = await intro.locator('p').last().innerText();
      assert.match(instruction, /[找点][^。！？]*莲花[\s\S]*点[^。！？]*展品/, 'the introduction must guide visitors to lotus markers before artwork');
      evidence.checks.push({ instruction });
      await shot('hall-intro');
    }
    await page.waitForFunction(() => window.__terrain.inspect().exhibit?.panels.every(item => !['waiting', 'loading'].includes(item.status)));
    if (wallThemes) await page.waitForFunction(() => {
      const markers = window.__terrain.inspect().exhibit?.wallMarkers;
      return markers?.length === 4 && markers.every(marker => marker.visible);
    }, null, { timeout: 12_000 });
    const initial = await state();
    assert.equal(initial.checkpoint.walkSurface, 'hall-b');
    assert.equal(initial.exhibit.gate.strength, 1);
    if (revised) {
      evidence.acceptedPanels = verifyApprovedPanels(initial.exhibit.panels);
      evidence.cave = verifyCaveFinish(initial);
      await expect.poll(() => successfulWallLabels.size, { timeout: 12_000 }).toBe(expectedWallLabels.size);
      evidence.wallLabels = [...successfulWallLabels].sort();
    }
    const center = worldToLocal(initial.checkpoint.position);
    if (!wallThemes) await shot('hall-intro');
    await widenView();

    if (bIsolation) {
      assert.equal(initial.hallA ?? null, null);
      await aimWall('B');
      await openPanel('B02');
      await expect(storyPlayer).toBeHidden();
      await closePanel();
      assert.deepEqual((await progress()).viewed, ['B02']);
      assert.deepEqual(hallRequests, [], 'direct B requested A-hall assets');
      assert.deepEqual(evidence.errors, []);
      evidence.passed = true;
      return;
    }

    if (artViewer) {
      for (const id of ['B02', 'C01']) {
        phase = `art-viewer-${id}`;
        await aimWall(id[0]);
        await openPanel(id);
        await verifyInitialArtwork(id);
        if (id === 'B02') await verifyArtworkGestures();
        await closePanel();
      }
      phase = 'art-viewer-resume';
      await verifyWalkResumes();
      evidence.checks.push('closing the image restores physical movement and viewing two works leaves the gate locked');
      assert.equal((await state()).exhibit.gate.strength, 1);
      assert.deepEqual((await progress()).viewed, ['B02', 'C01']);
      assert.deepEqual(evidence.errors, []);
      evidence.passed = true;
      return;
    }

    if (wallThemes) {
      const markers = initial.exhibit.wallMarkers;
      assert.deepEqual(markers.map(marker => marker.id).sort(), ['wall-A', 'wall-B', 'wall-C', 'wall-D']);
      for (const wall of data.walls) {
        phase = `wall-theme-${wall.id}`;
        const marker = markers.find(marker => marker.wall === wall.id);
        assert(marker?.visible && marker.width > 0 && marker.height > 0, `Wall ${wall.id} has no visible lotus`);
        if (lotusRevision) assert(marker.height >= .1 && marker.height <= .24 && marker.width < .4,
          `Wall ${wall.id} lotus did not shrink to subtitle scale: ${marker.width}×${marker.height}m`);
        await verifyWallTheme(wall, marker);
      }
      assert.deepEqual((await progress()).viewed ?? [], []);
      await expect(reward).toBeHidden();
      assert.equal((await state()).exhibit.gate.strength, 1);
      phase = 'wall-theme-resume';
      await verifyWalkResumes();
      const adjacentViewed = [];
      for (const marker of markers) {
        const adjacent = adjacentArtwork(marker, initial.exhibit.panels);
        phase = `wall-theme-adjacent-art-${adjacent.id}`;
        await aimWall(marker.wall);
        await openPanel(adjacent.id, adjacent.center);
        await expect(wallTheme).toBeHidden();
        await closePanel();
        adjacentViewed.push(adjacent.id.replace(/-detail$/, ''));
      }
      assert.deepEqual((await progress()).viewed, adjacentViewed);
      evidence.checks.push('four lotus readings leave the artwork count at zero; walking and the four nearby artwork edges still work');
      assert.deepEqual(evidence.errors, []);
      evidence.passed = true;
      return;
    }

    if (selected === 'plaque') {
      phase = 'plaque';
      await aimWall('D');
      await openPanel('D02');
      await closePanel();
      await capturePlaque(typographyRevision);
      assert.deepEqual(evidence.errors, []);
      evidence.passed = true;
      return;
    }
    if (selected === 'details') {
      for (const [wall, id] of [['B', 'B03'], ['C', 'C01'], ['D', 'D02']]) {
        phase = `details-${wall}`;
        await aimWall(wall);
        await openPanel(id);
        await closePanel();
        await shot(`wall-${wall}`);
        if (wall === 'D') await capturePlaque(true);
        else await captureTitle(wall);
        if (wall !== 'D') {
          await walkTo(center);
          await widenView();
        }
      }
      assert.deepEqual((await progress()).viewed, ['B03', 'C01', 'D02']);
      await expect(reward).toBeHidden();
      assert.equal((await state()).exhibit.gate.strength, 1);
      phase = 'locked-door-walk';
      await checkLockedDoor();
      evidence.checks.push('adjacent images open after the title changes, and the incomplete visit still meets the physical door');
      phase = 'restored-open-door-walk';
      await page.evaluate(({ key, ids }) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, viewed: ids, introSeen: true, noticeSeen: true }));
      }, { key: progressKey, ids: data.items.map(item => item.id) });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await ready();
      assert.equal((await state()).exhibit.gate.strength, 0);
      await checkOpenDoor();
      evidence.checks.push('the restored completed visit still walks through the changed doorway to view-b');
      assert.deepEqual(evidence.errors, []);
      evidence.passed = true;
      return;
    }

    phase = 'viewing';
    const order = ['B02', 'B01', 'B03', 'A01', 'A02', 'A03', 'D01', 'D02', 'D03', 'C02', revised ? 'C03-detail' : 'C03'];
    let wall;
    for (const [index, id] of order.entries()) {
      const changedWall = id[0] !== wall;
      if (changedWall) { wall = id[0]; await aimWall(wall); }
      if (changedWall && revised && index !== 0) await shot(`wall-${wall}`);
      await openPanel(id);
      assert.equal((await progress()).viewed.length, index + 1);
      if (index === 0) {
        await verifyInitialArtwork(id);
        await verifyArtworkGestures();
      }
      await closePanel();
      if (changedWall && (!revised || index === 0)) await shot(`wall-${wall}`);
      if (index === 0) {
        await openPanel(id);
        assert.equal((await progress()).viewed.length, 1);
        await closePanel();
      }
    }
    if (revised) {
      await openPanel('C03');
      await expect(detail.locator('img')).toHaveAttribute('src', /\/v002\/c03\.webp$/);
      assert.equal((await progress()).viewed.length, 11);
      assert.equal((await progress()).viewed.filter(id => id === 'C03').length, 1);
      await closePanel();
      evidence.checks.push('C03 hand detail and full view share one persistent ID');
    }
    assert.equal(thumbRequests().length, 0);
    await expect(reward).toBeHidden();
    assert.equal((await state()).exhibit.gate.strength, 1);

    phase = 'partial-refresh';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready();
    assert.equal((await progress()).viewed.length, 11);
    assert.equal((await state()).exhibit.gate.strength, 1);
    await expect(page.getByTestId('mogao-exhibit-intro')).toBeHidden();
    evidence.checks.push('duplicate ignored and eleven views survived reload with the barrier closed');

    phase = 'locked-door-walk';
    await checkLockedDoor();
    await shot('eleven-door-locked');
    await walkTo(center);

    phase = 'final-view';
    await aimWall('C');
    await openPanel('C01');
    assert.equal((await progress()).viewed.length, 12);
    assert.equal((await state()).exhibit.gate.strength, 1);
    await expect(reward).toBeHidden();
    await closePanel();
    await page.waitForFunction(() => window.__terrain.inspect().exhibit?.gate.strength === 0, null, { timeout: 12_000 });
    await verifyAward('hall-b');
    await shot('completion-and-reward');
    await verifyScroll();
    await verifyInteriorFromHere();

    phase = 'open-door-walk';
    await checkOpenDoor();
    if (revised) {
      const [x, y, z] = layout.viewpoints.find(point => point.id === 'view-b').target;
      const buddha = { ...localToWorld({ x, z }), y: floorOrigin + y };
      await aim(buddha);
      await aimHeight(buddha);
      await shot('viewing-platform-buddha');
    }
    await page.waitForFunction(key => JSON.parse(sessionStorage.getItem(key) ?? '{}').walkSurface === 'view-b', walkKey);

    phase = 'complete-refresh';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready();
    const restored = await state();
    assert.equal(restored.checkpoint.walkSurface, 'view-b');
    assert.equal(restored.exhibit.gate.strength, 0);
    assert.equal((await progress()).viewed.length, 12);
    await expect(reward).toBeHidden();
    await openGuideCard('hall-b');
    await expect(page.getByTestId('mogao-exhibit-scroll')).toBeVisible();
    await clickControl(page.getByRole('button', { name: '合上手卷' }));
    await expect(guide).toBeVisible();
    await clickControl(guide.getByRole('button', { name: '关闭图鉴' }));
    evidence.checks.push('last card, fade, real walk to the platform, refresh and reusable review scroll');
    assert.deepEqual(evidence.errors, []);
    evidence.passed = true;
    console.log(`${mode}: twelve exhibits, eleven-view gate, scroll and refresh verified`);
  } catch (error) {
    evidence.failure = { phase, message: String(error), stack: error instanceof Error ? error.stack : undefined };
    evidence.last = await state().catch(() => null);
    await shot('failure').catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

async function verifyArrival() {
  const viewport = throttleArrival ? { width: 667, height: 375 } : { width: 844, height: 390 };
  const context = await browser.newContext({ viewport, deviceScaleFactor: throttleArrival ? 1 : 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const evidence = { mode: 'arrival', arrivalMode, ascentLoading, throttleArrival, viewport, screenshots: [], errors: [], requests: [], checks: [] };
  report.devices.push(evidence);
  let stage = 'ground';
  const started = performance.now();
  const aWallPaths = new Set(hallAStories.map(story => `/assets/world/${story.full.mobile}`));
  const offScope = [];
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    const hall = aWallPaths.has(path) ? 'A' : wallArtPaths.has(path) ? 'B' : undefined;
    if (hall) evidence.requests.push({ hall, stage, path, ms: Math.round(performance.now() - started) });
    const oldWallMap = path.endsWith('/mogao-hall-a/v001/title-burning-house.webp') || path.endsWith('/mogao-exhibit/v001/c03.webp');
    if (ascentLoading && (oldWallMap || /\/mogao-hall-a\/.*(?:-detail-|-paper\.webp|-desktop\.webp)/.test(path)
      || /\/mogao-exhibit\/.*-thumb\.webp/.test(path))) offScope.push({ stage, path });
  });
  if (ascentLoading) await page.addInitScript(key => {
    localStorage.setItem('dunhuang:mogao-hall-a:progress:v1:opened', 'yes');
    localStorage.setItem('dunhuang:mogao-hall-a:intro:v1', 'seen');
    localStorage.setItem(key, JSON.stringify({ version: 1, viewed: ['B01'], introSeen: true, noticeSeen: false }));
  }, progressKey);
  if (throttleArrival) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 55, downloadThroughput: 1024 * 1024, uploadThroughput: 512 * 1024,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  async function shot(name) {
    const file = `mobile-${name}.png`;
    await page.screenshot({ path: resolve(folder, file) });
    evidence.screenshots.push(file);
    const state = await page.evaluate(() => window.__terrain.inspect());
    evidence.checks.push({ stage, file, surface: state.checkpoint.walkSurface,
      position: worldToLocal(state.checkpoint.position), cave: revised ? verifyCaveFinish(state, true) : undefined });
  }
  async function enterHallB() {
    const cdp = await context.newCDPSession(page);
    const joystick = await page.getByRole('group', { name: '拖动摇杆行走' }).boundingBox();
    assert(joystick, 'mobile joystick has no bounds');
    const { position, cameraYaw } = await page.evaluate(() => window.__terrain.inspect().checkpoint);
    const target = localToWorld({ x: 20.3, z: -20.6 });
    const length = Math.hypot(target.x - position.x, target.z - position.z);
    const dx = (target.x - position.x) / length, dz = (target.z - position.z) / length;
    const joystickX = dx * Math.cos(cameraYaw) - dz * Math.sin(cameraYaw);
    const joystickY = dx * Math.sin(cameraYaw) + dz * Math.cos(cameraYaw);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1,
      x: joystick.x + joystick.width * (.5 + joystickX * .32),
      y: joystick.y + joystick.height * (.5 + joystickY * .32),
    }] });
    try {
      await page.waitForFunction(() => window.__terrain.inspect().checkpoint.walkSurface === 'hall-b', null, { timeout: 12_000 });
    } finally {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  }
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__terrain?.inspect().loaded, null, { timeout: 90_000 });
    await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true');
    assert.equal(await page.evaluate(() => window.__terrain.inspect().checkpoint.walkSurface), 'ground');
    assert.equal(evidence.requests.length, 0);
    if (revised) await shot('ground-floor');
    const up = page.getByRole('navigation', { name: '楼梯辅助' }).getByRole('button', { name: '上楼' });
    const stops = arrivalMode === 'doors' ? ['landing-2', 'landing-4'] : ['hall-a', 'hall-b'];
    for (const [index, floor] of stops.entries()) {
      stage = index === 0 ? 'first-ascent' : 'second-ascent';
      await expect(up).toBeEnabled();
      const start = performance.now();
      await up.tap();
      if (revised) {
        await page.waitForFunction(() => window.__terrain.inspect().checkpoint.walkSurface?.startsWith('flight-'), null, { timeout: 18_000 });
        await shot(index === 0 ? 'stair-to-a' : 'stair-to-b');
      }
      await page.waitForFunction(floor => {
        const state = window.__terrain.inspect();
        return state.checkpoint.walkSurface === floor && !state.stairAssist?.active;
      }, floor, { timeout: throttleArrival ? 75_000 : 38_000 });
      evidence.checks.push({ floor, seconds: (performance.now() - start) / 1000 });
      if (arrivalMode === 'doors') {
        const point = worldToLocal(await page.evaluate(() => window.__terrain.inspect().checkpoint.position));
        assert(Math.hypot(point.x - 20.3, point.z + 23) < .02, `unexpected ${floor} stop ${JSON.stringify(point)}`);
        if (ascentLoading) {
          const gallery = index === 0 ? 'A' : 'B';
          const status = await page.evaluate(gallery => {
            const state = window.__terrain.inspect();
            return gallery === 'A'
              ? Object.fromEntries(Object.entries(state.hallA?.images ?? {}).map(([id, image]) => [id, image.status]))
              : Object.fromEntries(state.exhibit.panels.map(item => [item.id, item.status]));
          }, gallery);
          evidence.checks.push({ gallery, status, ms: Math.round(performance.now() - started) });
          assert.equal(Object.keys(status).length, index === 0 ? 5 : 13);
          assert(Object.values(status).every(value => value === 'ready'), `${gallery} wall maps pending at doorstep: ${JSON.stringify(status)}`);
          const requests = evidence.requests.filter(item => item.hall === gallery);
          assert.equal(new Set(requests.map(item => item.path)).size, index === 0 ? 2 : 13);
          assert(requests.every(item => item.stage === stage), `${gallery} art fetched outside ${stage}`);
          if (index === 0) assert(evidence.requests.every(item => item.hall === 'A'), 'first ascent requested B walls');
        } else assert.equal(evidence.requests.filter(item => item.hall === 'B').length, 0, `B art requested before entering from ${floor}`);
        await expect(page.getByTestId('mogao-exhibit-intro')).toHaveCount(0);
        await shot(index === 0 ? 'landing-a' : 'landing-b');
      } else if (index === 0) {
        assert.equal(evidence.requests.filter(item => item.hall === 'B').length, 0);
        if (revised) await shot('hall-a');
      }
    }
    if (arrivalMode === 'doors') {
      stage = 'manual-entry-b';
      await enterHallB();
      await expect(up).toHaveCount(0);
    }
    stage = 'hall-b';
    if (!ascentLoading) await expect(page.getByTestId('mogao-exhibit-intro')).toBeVisible();
    await page.waitForFunction(() => window.__terrain.inspect().exhibit?.panels.every(item => item.status === 'ready'));
    assert.equal(new Set(evidence.requests.filter(item => item.hall === 'B').map(request => request.path)).size, revised ? 13 : 12);
    evidence.offScope = offScope;
    assert.deepEqual(offScope, []);
    assert.deepEqual(evidence.errors, []);
    await shot('normal-arrival');
    evidence.passed = true;
    console.log(arrivalMode === 'doors' ? 'arrival: ground → A door → B door, then manual touch entry into B'
      : 'arrival: ground → A → B using two real touch activations');
  } catch (error) {
    evidence.failure = { phase: stage, message: String(error), stack: error instanceof Error ? error.stack : undefined };
    evidence.last = await page.evaluate(() => window.__terrain.inspect()).catch(() => null);
    await page.screenshot({ path: resolve(folder, 'mobile-normal-arrival-failure.png') }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

try {
  if (selected !== 'arrival') {
    const modes = hallADoor ? ['mobile'] : hallA ? ['mobile', 'desktop', 'mobile-b-isolation'] : artViewer ? ['mobile-short', 'desktop'] : wallThemes || selected === 'all' || selected === 'both' || selected === 'details'
      ? ['mobile', 'desktop'] : [selected === 'plaque' ? 'desktop' : selected];
    for (const mode of modes) await verify(mode);
  }
  if (selected === 'all' || selected === 'arrival') await verifyArrival();
  report.passed = true;
} finally {
  await writeFile(resolve(folder, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Evidence: ${folder}`);
  await browser.close();
}
