import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { fromTerrainPoint, LAKE_ORIGIN, TERRAIN_REGIONS, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import type { ColoringLevel } from '../../src/types';

const muralModel = '/pattern-interactives/v003/mural-station.glb';
const easelModel = '/pattern-interactives/v002/coloring-station.glb';
const coloringLevel = JSON.parse(readFileSync('src/content/levels/coloring-feitian-lotus.json', 'utf8')) as ColoringLevel;

function isUnavailableWorldAsset(url: string) {
  const path = new URL(url).pathname;
  return path.includes('/assets/world/') && /music-|mogao|flying-history|pattern-interactives/.test(path)
    && !path.endsWith('/mogao-upper/v003/mountain-distant-v001.glb') && !path.endsWith(muralModel) && !path.endsWith(easelModel);
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

test('精简版保留三兔共耳互动并写入独立记录', async ({ page }) => {
  // Software-rendered 3D can take longer to accumulate the required gaze dwell.
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  await dialog.click({ position: { x: 10, y: 10 } });
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  expect(otherGalleryAssets).toEqual([]);
  expect(missingWorldAssets).toEqual([]);
});

test('精简版从院门走到壁画，补齐三件实物后返回漫游', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const originalRecord = {
    version: 1, muralParts: ['bird'], caissonCompleted: false, coloringCompleted: false,
    ceremonySeen: false, introductionsSeen: [], firstSuccessSeen: false, artworks: {}, displayedArtworkId: null,
  };
  await page.addInitScript(record => {
    localStorage.setItem('dunhuang:first-gallery:v1', JSON.stringify(record));
    localStorage.setItem('dunhuang:first-gallery-caisson:v1', JSON.stringify({ ...record, muralParts: [], caissonCompleted: true }));
  }, originalRecord);
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
  await page.keyboard.down('Shift');
  await page.keyboard.down('ArrowUp');
  try {
    await expect(invitation).toBeVisible({ timeout: 20_000 });
  } finally {
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('Shift');
  }
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
  await skipLine('summary');
  await expect(guide).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: '重看壁画' })).toBeVisible();
  await expect(page.getByTestId('gallery-portal-notice')).toHaveCount(0);
  await page.getByTestId('world-task-toggle').click();
  const tasks = page.getByTestId('world-task-panel');
  await expect(tasks.getByRole('listitem').filter({ hasText: '借物补画' })).toHaveText(/借物补画\s*3 \/ 3/);
  await expect(tasks.getByText('三兔共耳')).toBeVisible();
  await expect(tasks.getByText('画架设色')).toBeVisible();
  const records = await page.evaluate(() => ({
    compact: JSON.parse(localStorage.getItem('dunhuang:first-gallery-caisson:v1')!),
    full: JSON.parse(localStorage.getItem('dunhuang:first-gallery:v1')!),
    scene: Reflect.get(window, '__terrain').inspect().terrain.scene.streaming,
  }));
  expect(records.compact).toMatchObject({ muralParts: ['lotus', 'grapes', 'bird'], caissonCompleted: true,
    coloringCompleted: false, ceremonySeen: false });
  expect(records.full).toEqual(originalRecord);
  expect(records.scene).toMatchObject({ music: 'idle', musicBuildingVisible: false, cliffTowerVisible: false });
  expect(unavailableAssets).toEqual([]);
});

test('精简版同一线稿从游戏世界保存，从画架完成后直接返回并挂画', async ({ page, isMobile }) => {
  test.setTimeout(150_000);
  const galleryKey = 'dunhuang:first-gallery-caisson:v1';
  const worldKey = 'dunhuang:first-gallery-caisson-world:v1';
  const position = toTerrainPoint('courtyard', { x: -6.5, z: -3.9 });
  const yaw = TERRAIN_REGIONS.courtyard.yaw;
  await page.emulateMedia({ reducedMotion: isMobile ? 'reduce' : 'no-preference' });
  await page.addInitScript(({ worldKey, position, yaw }) => {
    if (!sessionStorage.getItem(worldKey)) sessionStorage.setItem(worldKey, JSON.stringify({
      version: 1, position, heading: yaw, cameraYaw: yaw, visitedEvents: [],
    }));
  }, { worldKey, position, yaw });
  const texture = () => page.waitForFunction(() => Reflect.get(window, '__terrain')?.inspect().galleryDisplay?.easelVisible);
  const finish = page.getByRole('button', { name: '完成作品', exact: true });
  async function colorArea(name: string) {
    const swatch = page.getByRole('button', { name: `选择${name}`, exact: true });
    await expect(swatch).toBeEnabled({ timeout: 45_000 });
    await swatch.click();
    const host = page.getByTestId('phaser-player');
    const { image } = JSON.parse((await host.getAttribute('data-layout'))!);
    const { point } = coloringLevel.regions.find(region => region.id === 36)!;
    const at = { x: image.x + point.x * image.width, y: image.y + point.y * image.height };
    if (isMobile) await host.locator('canvas').tap({ position: at });
    else await host.locator('canvas').click({ position: at });
    await expect(finish).toBeEnabled();
  }

  await page.goto('/#/play/coloring-feitian-lotus');
  await colorArea('赭红');
  await finish.click();
  await expect(page).toHaveURL(/#\/result\/coloring-feitian-lotus$/);
  await expect(page.getByTestId('coloring-result-canvas')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), galleryKey)).toBeNull();

  await page.goto('/#/');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  const world = page.getByTestId('world-host');
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await texture();
  await page.getByTestId('world-task-toggle').click();
  await page.getByRole('button', { name: '去看看' }).click();
  const enter = page.getByRole('button', { name: '开始涂色', exact: true });
  await expect(enter).toBeVisible();
  await expect(page.getByText('涂好的画，会挂在这里。')).toBeVisible();
  const checkpoint = await page.evaluate(() => Reflect.get(window, '__terrain').inspect().checkpoint);
  await enter.click();
  await expect(page).toHaveURL(/#\/play\/coloring-feitian-lotus$/, { timeout: 20_000 });
  await expect(world).toBeHidden();
  expect(await page.evaluate(() => history.state?.dunhuangFirstGalleryEasel)).toMatch(/^[a-f0-9]{32}$/);
  await colorArea('翠绿');
  await finish.click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByText('作品已保存，正在返回院内画架…')).toHaveCount(0, { timeout: 45_000 });
  const saved = await page.evaluate(key => {
    const progress = JSON.parse(localStorage.getItem(key)!);
    const world = Reflect.get(window, '__terrain').inspect();
    return { artwork: progress.artworks[progress.displayedArtworkId], completed: progress.coloringCompleted,
      checkpoint: world.checkpoint, mounted: world.galleryDisplay?.easelVisible,
      claim: history.state?.dunhuangFirstGalleryEasel, session: sessionStorage.getItem('dunhuang:first-gallery-easel:v1') };
  }, galleryKey);
  expect(saved).toMatchObject({ artwork: { colors: { 36: '#4c775e' } }, completed: true, mounted: true, session: '' });
  expect(saved.checkpoint).toEqual(checkpoint);
  expect(saved.claim).toBeUndefined();
  await expect(page.getByRole('button', { name: '欣赏作品', exact: true })).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await texture();
  await expect(page.getByRole('button', { name: '欣赏作品', exact: true })).toBeVisible();
});
