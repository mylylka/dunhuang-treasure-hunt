import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { fromTerrainPoint, LAKE_ORIGIN, TERRAIN_REGIONS, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';

const muralModel = '/pattern-interactives/v003/mural-station.glb';
const compactSaveKey = 'dunhuang:first-gallery-caisson:v1';
const emptyFirstGallery = {
  version: 1, muralParts: [], caissonCompleted: false, coloringCompleted: false,
  ceremonySeen: false, introductionsSeen: [], firstSuccessSeen: false, artworks: {}, displayedArtworkId: null,
};
const restoredMuralParts = ['lotus', 'grapes', 'bird'];

function isUnavailableWorldAsset(url: string) {
  const path = new URL(url).pathname;
  return path.includes('/assets/world/') && /music-|mogao|flying-history|pattern-interactives/.test(path)
    && !path.endsWith('/mogao-upper/v003/mountain-distant-v001.glb') && !path.endsWith(muralModel);
}

async function finishCeremony(page: Page, skipWalk: boolean) {
  const question = page.getByTestId('gallery-portal-question');
  const guide = page.getByTestId('gallery-portal-guide');
  const notice = page.getByTestId('gallery-portal-notice');
  await expect(question).toBeVisible({ timeout: 20_000 });
  await question.getByText('发生了什么？').click();
  await expect(guide).toBeVisible({ timeout: 15_000 });
  if (skipWalk) await guide.getByRole('button', { name: '跳过带路' }).click();
  await expect(notice.getByRole('heading', { name: '第一馆通关！游戏世界已开启。' })).toBeVisible({ timeout: 35_000 });
  await expect(notice.getByText(/院子西侧的画卷已亮起/)).toHaveCount(skipWalk ? 1 : 0);
  expect(await page.evaluate(() => Reflect.get(window, '__terrain').inspect().galleryDisplay.portalLight))
    .toMatchObject({ visible: true, reveal: 1 });
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).ceremonySeen, compactSaveKey)).toBe(true);
  await notice.getByRole('heading').click();
  await expect(notice).toHaveCount(0);
}

test('精简首页在原有活动范围内显示新版近景和远景', async ({ page }) => {
  test.setTimeout(90_000);
  const position = toTerrainPoint('courtyard', { x: 0, z: 7.5 });
  const heading = Math.atan2(position.x - LAKE_ORIGIN.x, position.z - LAKE_ORIGIN.z);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ key, position, heading }) => {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, position, heading, cameraYaw: heading, visitedEvents: [] }));
  }, { key: 'dunhuang:first-gallery-caisson-world:v1', position, heading });
  await page.goto('/');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click({ timeout: 30_000 });
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  const scenery = await page.waitForFunction(() => {
    const state = Reflect.get(window, '__terrain')?.inspect();
    const oasis = state?.desertOasis;
    if (!oasis?.models.length || !oasis?.route.ridgeDraws || !oasis?.route.corridorVolumeInstances) return;
    return { version: oasis.version, music: state.terrain.scene.streaming.musicBuildingVisible,
      cliff: state.terrain.scene.streaming.cliffTowerVisible, landmarks: oasis.landmarks.map((item: { id: string }) => item.id) };
  }, undefined, { timeout: 30_000 });
  const rendered = await scenery.jsonValue();
  expect(rendered).toMatchObject({ version: 'v013', music: false, cliff: false });
  expect(rendered?.landmarks).not.toContain('大树9');
  await expect(page.getByTestId('world-mini-map-toggle')).toHaveCount(0);

  await page.keyboard.down('ArrowUp');
  try {
    await page.waitForFunction(({ x }) => Reflect.get(window, '__terrain').inspect().checkpoint.position.x > x + .5, position);
    await page.waitForTimeout(700);
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  const checkpoint = await page.evaluate(() => Reflect.get(window, '__terrain').inspect().checkpoint.position);
  expect(fromTerrainPoint('courtyard', checkpoint).x).toBeLessThanOrEqual(1);
});

test('精简版已补画后，完成三兔共耳并在讲解结束后触发仪式', async ({ page }) => {
  // Software-rendered 3D can take longer to accumulate the required gaze dwell.
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ key, record }) => localStorage.setItem(key, JSON.stringify(record)), {
    key: compactSaveKey, record: { ...emptyFirstGallery, muralParts: restoredMuralParts },
  });
  const otherGalleryAssets: string[] = [];
  const missingWorldAssets: string[] = [];
  page.on('request', request => {
    if (isUnavailableWorldAsset(request.url())) otherGalleryAssets.push(request.url());
  });
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).pathname.includes('/assets/world/')) missingWorldAssets.push(response.url());
  });
  await page.goto('/?view=caisson');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click({ timeout: 30_000 });
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('world-mini-map-toggle')).toHaveCount(0);
  await page.getByRole('button', { name: '抬头看看' }).click({ timeout: 90_000 });
  const magnify = page.getByRole('button', { name: '放大看看' });
  await expect.poll(async () => {
    const cue = page.locator('.gallery-subtitle');
    if (await cue.isVisible().catch(() => false)) await cue.click({ timeout: 2_000 }).catch(() => {});
    return magnify.isVisible();
  }, { timeout: 90_000, intervals: [500] }).toBe(true);
  await magnify.click();
  const dialog = page.getByTestId('first-gallery-caisson-float');
  await expect(dialog).toHaveAttribute('data-stage', 'rabbit', { timeout: 30_000 });
  const selections = [
    '上方的兔子', '上方横向的耳朵', '斜向左上方的耳朵',
    '右侧的兔子', '上方横向的耳朵', '斜向右上方的耳朵', '左下的兔子',
  ];
  for (const label of selections) {
    if (await dialog.getAttribute('data-stage') === 'reveal') {
      await dialog.click({ position: { x: 10, y: 10 } });
      await expect(dialog).toHaveAttribute('data-interactive', 'true', { timeout: 30_000 });
    }
    const target = dialog.locator(`polygon[aria-label="${label}"]`);
    await expect(target).toBeAttached();
    await target.focus();
    await page.keyboard.press('Enter');
  }
  await expect(dialog).toHaveAttribute('data-stage', 'complete');
  const records = await page.evaluate(() => ({
    isolated: JSON.parse(localStorage.getItem('dunhuang:first-gallery-caisson:v1') ?? 'null'),
    original: localStorage.getItem('dunhuang:first-gallery:v1'),
  }));
  expect(records.isolated.caissonCompleted).toBe(true);
  expect(records.original).toBeNull();
  await expect(page.getByTestId('world-screen')).not.toHaveAttribute('data-portal-tour', 'true');
  await expect(page.getByTestId('gallery-portal-notice')).toHaveCount(0);
  await dialog.click({ position: { x: 10, y: 10 } });
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await finishCeremony(page, true);
  expect(otherGalleryAssets).toEqual([]);
  expect(missingWorldAssets).toEqual([]);
});

test('精简版已完成三兔共耳，补齐壁画后由画卷进入纹样小游戏', async ({ page, isMobile }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const originalRecord = {
    ...emptyFirstGallery, muralParts: ['bird'],
  };
  const position = toTerrainPoint('courtyard', { x: -12, z: -17.1 });
  const heading = TERRAIN_REGIONS.courtyard.yaw;
  await page.addInitScript(({ record, position, heading }) => {
    localStorage.setItem('dunhuang:first-gallery:v1', JSON.stringify(record));
    localStorage.setItem('dunhuang:first-gallery-caisson:v1', JSON.stringify({ ...record, muralParts: [], caissonCompleted: true }));
    sessionStorage.setItem('dunhuang:first-gallery-caisson-world:v1', JSON.stringify({
      version: 1, position, heading, cameraYaw: heading, visitedEvents: [],
    }));
  }, { record: originalRecord, position, heading });
  const unavailableAssets: string[] = [];
  page.on('request', request => {
    if (isUnavailableWorldAsset(request.url())) unavailableAssets.push(request.url());
  });
  const stationReady = page.waitForResponse(response => new URL(response.url()).pathname.endsWith(muralModel), { timeout: 60_000 });
  await page.goto('/');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  expect((await stationReady).ok()).toBe(true);

  const invitation = page.getByTestId('gallery-mural-invite');
  await invitation.getByRole('button', { name: '玩壁画' }).click();

  const guide = page.getByTestId('gallery-mural-guide');
  async function skipLine(phase: string) {
    await expect(guide).toHaveAttribute('data-phase', phase, { timeout: 20_000 });
    await guide.locator('.gallery-skippable').click({ timeout: 20_000 });
  }
  for (const phase of ['wall', 'table', 'bird', 'return-line']) await skipLine(phase);

  const canvas = page.locator('canvas[data-world-canvas]');
  const targets = await page.evaluate(async () => {
    const modulePath = '/src/content/world/first-gallery-v001.ts';
    const { GALLERY_TARGETS: { lotus, bird, grapes } } = await import(modulePath) as typeof import('../../src/content/world/first-gallery-v001');
    return { lotus, bird, grapes };
  });
  for (const part of ['lotus', 'grapes', 'bird'] as const) {
    await expect(guide).toHaveAttribute('data-phase', 'pick', { timeout: 20_000 });
    await expect(guide.locator('.gallery-skippable')).toHaveCount(0, { timeout: 20_000 });
    const bounds = (await canvas.boundingBox())!;
    const { position, target, fov } = await page.evaluate(() => Reflect.get(window, '__terrain').inspect().camera as {
      position: [number, number, number]; target: [number, number, number]; fov: number;
    });
    const camera = new PerspectiveCamera(fov, bounds.width / bounds.height, .1, 1000);
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.updateMatrixWorld();
    const point = new Vector3(targets[part].x, targets[part].y, targets[part].z).project(camera);
    const tap = { x: (point.x + 1) / 2 * bounds.width, y: (1 - point.y) / 2 * bounds.height };
    if (isMobile) await canvas.tap({ position: tap });
    else await canvas.click({ position: tap });
    await skipLine('education');
  }
  await expect(guide).toHaveAttribute('data-phase', 'summary', { timeout: 20_000 });
  await expect(page.getByTestId('world-screen')).not.toHaveAttribute('data-portal-tour', 'true');
  await expect(page.getByTestId('gallery-portal-notice')).toHaveCount(0);
  await skipLine('summary');
  await expect(guide).toHaveCount(0, { timeout: 15_000 });
  await finishCeremony(page, false);
  await page.getByTestId('world-task-toggle').click();
  const tasks = page.getByTestId('world-task-panel');
  await expect(tasks.getByRole('listitem').filter({ hasText: '借物补画' })).toHaveText(/借物补画\s*3 \/ 3/);
  await expect(tasks.getByText('三兔共耳')).toBeVisible();
  await expect(tasks.getByText('画架设色')).toHaveCount(0);
  const records = await page.evaluate(() => ({
    compact: JSON.parse(localStorage.getItem('dunhuang:first-gallery-caisson:v1')!),
    full: JSON.parse(localStorage.getItem('dunhuang:first-gallery:v1')!),
    scene: Reflect.get(window, '__terrain').inspect().terrain.scene.streaming,
  }));
  expect(records.compact).toMatchObject({ muralParts: ['lotus', 'grapes', 'bird'], caissonCompleted: true,
    coloringCompleted: false, ceremonySeen: true });
  expect(records.full).toEqual(originalRecord);
  expect(records.scene).toMatchObject({ music: 'idle', musicBuildingVisible: false, cliffTowerVisible: false });
  expect(unavailableAssets).toEqual([]);
  await page.getByTestId('world-task-toggle').click();
  const enter = page.getByTestId('gallery-interact');
  await expect(enter).toHaveText('进入游戏世界');
  await enter.click();
  await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
});

test('精简旧档补播一次解锁仪式，刷新后仍可使用画卷', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const position = toTerrainPoint('courtyard', { x: -16.8, z: -1.2 });
  await page.addInitScript(({ key, record, position }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(record));
    sessionStorage.setItem('dunhuang:first-gallery-caisson-world:v1', JSON.stringify({
      version: 1, position, heading: 0, cameraYaw: 0, visitedEvents: [],
    }));
  }, { key: compactSaveKey, record: { ...emptyFirstGallery, muralParts: restoredMuralParts, caissonCompleted: true }, position });
  await page.goto('/');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await finishCeremony(page, true);

  await page.reload();
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('gallery-interact')).toHaveText('进入游戏世界');
  await expect(page.getByTestId('world-screen')).not.toHaveAttribute('data-portal-tour', 'true');
  await expect(page.getByTestId('gallery-portal-notice')).toHaveCount(0);
});
