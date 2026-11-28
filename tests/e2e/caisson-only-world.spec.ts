import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { fromTerrainPoint, LAKE_ORIGIN, TERRAIN_REGIONS, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import type { ColoringLevel } from '../../src/types';

const muralModel = '/pattern-interactives/v003/mural-station.glb';
const easelModel = '/pattern-interactives/v002/coloring-station.glb';
const scrollRewardArt = '/mogao-exhibit/v001/reward-scroll.webp';
const coloringLevel = JSON.parse(readFileSync('src/content/levels/coloring-feitian-lotus.json', 'utf8')) as ColoringLevel;
const compactSaveKey = 'dunhuang:first-gallery-caisson:v1';
const emptyFirstGallery = {
  version: 1, muralParts: [], caissonCompleted: false, coloringCompleted: false,
  ceremonySeen: false, introductionsSeen: [], firstSuccessSeen: false, artworks: {}, displayedArtworkId: null,
};
const restoredMuralParts = ['lotus', 'grapes', 'bird'];
const finishedEaselId = 'finished-easel-fixture';
const finishedEasel = {
  coloringCompleted: true,
  displayedArtworkId: finishedEaselId,
  firstSuccessSeen: true,
  artworks: { [finishedEaselId]: {
    artworkId: finishedEaselId, levelId: coloringLevel.id, artworkVersion: coloringLevel.artworkVersion,
    colors: { '36': '#a85030' }, materials: {}, submittedAt: '2026-11-03T00:00:00.000Z',
  } },
};

function isUnavailableWorldAsset(url: string) {
  const path = new URL(url).pathname;
  return path.includes('/assets/world/') && /music-|mogao|flying-history|pattern-interactives/.test(path)
    && !path.endsWith('/mogao-upper/v003/mountain-distant-v001.glb') && !path.endsWith(muralModel) && !path.endsWith(easelModel)
    && !path.endsWith(scrollRewardArt);
}

async function finishCeremony(page: Page, action: 'skip' | 'open') {
  const skipWalk = action === 'skip';
  const guide = page.getByTestId('gallery-portal-guide');
  const notice = page.getByTestId('gallery-portal-notice');
  if (skipWalk) await guide.getByRole('button', { name: '跳过带路' }).click({ timeout: 30_000 });
  const heading = notice.getByRole('heading', { name: skipWalk ? '第一馆通关！游戏世界已开启。' : '获得《敦煌纹样观艺卷》' });
  await expect(heading).toBeVisible({ timeout: 35_000 });
  await expect(notice.getByText(/院子西侧的画卷已亮起/)).toHaveCount(skipWalk ? 1 : 0);
  if (!skipWalk) {
    await expect(notice.getByText('第一馆通关！游戏世界已开启。')).toBeVisible();
    const art = notice.locator('img');
    await expect.poll(() => art.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(notice.getByRole('button', { name: '收下画卷' })).toBeInViewport();
    await expect(notice.getByRole('button', { name: '打开画卷' })).toBeInViewport();
  }
  expect(await page.evaluate(() => Reflect.get(window, '__terrain').inspect().galleryDisplay.portalLight))
    .toMatchObject({ visible: true, reveal: 1 });
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).ceremonySeen, compactSaveKey)).toBe(true);
  if (skipWalk) await heading.click();
  else await notice.getByRole('button', { name: '打开画卷' }).click();
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

test('精简版已补画和设色，完成三兔共耳并在讲解结束后触发仪式', async ({ page }) => {
  // Software-rendered 3D can take longer to accumulate the required gaze dwell.
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ key, record }) => localStorage.setItem(key, JSON.stringify(record)), {
    key: compactSaveKey, record: { ...emptyFirstGallery, ...finishedEasel, muralParts: restoredMuralParts },
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
  await finishCeremony(page, 'skip');
  expect(otherGalleryAssets).toEqual([]);
  expect(missingWorldAssets).toEqual([]);
});

test('精简版补齐壁画后从庆祝页打开观艺卷，再进入纹样小游戏', async ({ page, isMobile }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const originalRecord = {
    ...emptyFirstGallery, muralParts: ['bird'],
  };
  const position = toTerrainPoint('courtyard', { x: -12, z: -17.1 });
  const heading = TERRAIN_REGIONS.courtyard.yaw;
  await page.addInitScript(({ record, completedEasel, position, heading }) => {
    localStorage.setItem('dunhuang:first-gallery:v1', JSON.stringify(record));
    localStorage.setItem('dunhuang:first-gallery-caisson:v1', JSON.stringify({ ...record, ...completedEasel, muralParts: [], caissonCompleted: true }));
    sessionStorage.setItem('dunhuang:first-gallery-caisson-world:v1', JSON.stringify({
      version: 1, position, heading, cameraYaw: heading, visitedEvents: [],
    }));
  }, { record: originalRecord, completedEasel: finishedEasel, position, heading });
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
  await finishCeremony(page, 'open');
  const collection = page.getByTestId('mogao-reward-guide');
  const folio = page.getByTestId('first-gallery-scroll');
  const currentPosition = () => page.getByTestId('world-position').evaluate(element => [
    element.getAttribute('data-x'), element.getAttribute('data-z'),
  ]);
  const scrollPosition = await currentPosition();
  await expect(folio.getByRole('heading', { name: '敦煌纹样观艺卷' })).toBeVisible();
  await expect(folio.getByRole('heading', { name: '从一朵花看懂敦煌图案' })).toBeVisible();
  const articleImage = folio.getByTestId('first-gallery-scroll-body').locator('[data-exhibit-thumb]').first();
  await articleImage.scrollIntoViewIfNeeded();
  await expect.poll(() => articleImage.locator('img').evaluateAll(images =>
    images.some(image => image instanceof HTMLImageElement && image.naturalWidth > 0))).toBe(true);
  const download = folio.getByTestId('mogao-folio-download');
  await expect(download).toHaveAttribute('href', /\/folio-downloads\/v001\/first-gallery\.pdf$/);
  const pdf = await page.request.get(new URL((await download.getAttribute('href'))!, page.url()).toString());
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  await folio.getByRole('button', { name: '合上观艺卷' }).click();
  await expect(folio).toHaveCount(0);
  await expect(collection).toHaveCount(0);
  expect(await currentPosition()).toEqual(scrollPosition);
  await page.getByTestId('mogao-reward-guide-button').click();
  await collection.getByTestId('mogao-reward-card-first-gallery').click();
  await expect(folio.getByRole('heading', { name: '敦煌纹样观艺卷' })).toBeVisible();
  await folio.getByRole('button', { name: '合上观艺卷' }).click();
  await collection.getByRole('button', { name: '关闭图鉴' }).click();
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
    coloringCompleted: true, ceremonySeen: true });
  expect(records.full).toEqual(originalRecord);
  expect(records.scene).toMatchObject({ music: 'idle', musicBuildingVisible: false, cliffTowerVisible: false });
  expect(unavailableAssets).toEqual([]);
  await page.getByTestId('world-task-toggle').click();
  const enter = page.getByTestId('gallery-interact');
  await expect(enter).toHaveText('进入游戏世界');
  await enter.click();
  await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
});

test('精简两项旧档已看过仪式时仍可使用画卷并保持原存档', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const position = toTerrainPoint('courtyard', { x: -16.8, z: -1.2 });
  await page.addInitScript(({ key, record, position }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(record));
    sessionStorage.setItem('dunhuang:first-gallery-caisson-world:v1', JSON.stringify({
      version: 1, position, heading: 0, cameraYaw: 0, visitedEvents: [],
    }));
  }, { key: compactSaveKey, record: { ...emptyFirstGallery, muralParts: restoredMuralParts, caissonCompleted: true, ceremonySeen: true }, position });
  await page.goto('/');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('gallery-interact')).toHaveText('进入游戏世界');
  await expect(page.getByTestId('gallery-portal-notice')).toHaveCount(0);

  await page.reload();
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('gallery-interact')).toHaveText('进入游戏世界');
  await expect(page.getByTestId('world-screen')).not.toHaveAttribute('data-portal-tour', 'true');
  await expect(page.getByTestId('gallery-portal-notice')).toHaveCount(0);
  await page.getByTestId('mogao-reward-guide-button').click();
  await expect(page.getByTestId('mogao-reward-card-first-gallery')).toContainText('敦煌纹样观艺卷');
});

test('精简两项旧档尚未看过仪式时须完成画架才解锁', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const position = toTerrainPoint('courtyard', { x: -16.8, z: -1.2 });
  await page.addInitScript(({ key, record, position }) => {
    localStorage.setItem(key, JSON.stringify(record));
    sessionStorage.setItem('dunhuang:first-gallery-caisson-world:v1', JSON.stringify({
      version: 1, position, heading: 0, cameraYaw: 0, visitedEvents: [],
    }));
  }, { key: compactSaveKey, record: { ...emptyFirstGallery, muralParts: restoredMuralParts, caissonCompleted: true }, position });
  await page.goto('/');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('gallery-portal-question')).toHaveCount(0);
  await expect(page.getByTestId('gallery-portal-notice')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '进入游戏世界' })).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), compactSaveKey))
    .toMatchObject({ caissonCompleted: true, coloringCompleted: false, ceremonySeen: false });
});

test('已有 2D 作品导入精简作品库但不算完成画架', async ({ page }) => {
  test.setTimeout(90_000);
  const artworkKey = 'dunhuang:artworks:v2';
  const timestamp = '2026-11-03T00:00:00.000Z';
  const prior = JSON.stringify({ version: 2, artworks: { [coloringLevel.id]: { [coloringLevel.artworkVersion]: {
    colors: { '36': '#a85030' }, materials: {}, updatedAt: timestamp, submittedAt: timestamp,
  } } } });
  await page.addInitScript(({ artworkKey, prior }) => localStorage.setItem(artworkKey, prior), { artworkKey, prior });
  await page.goto('/');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect.poll(async () => page.evaluate(key => {
    const data = JSON.parse(localStorage.getItem(key) ?? '{}');
    return Object.keys(data.artworks ?? {}).length;
  }, compactSaveKey)).toBe(1);
  const data = await page.evaluate(({ artworkKey, compactSaveKey }) => ({
    original: localStorage.getItem(artworkKey),
    compact: JSON.parse(localStorage.getItem(compactSaveKey)!),
    full: localStorage.getItem('dunhuang:first-gallery:v1'),
  }), { artworkKey, compactSaveKey });
  expect(data.original).toBe(prior);
  expect(data.full).toBeNull();
  expect(data.compact).toMatchObject({ coloringCompleted: false, displayedArtworkId: null, ceremonySeen: false });
  expect(Object.values(data.compact.artworks)).toContainEqual(expect.objectContaining({
    levelId: coloringLevel.id, artworkVersion: coloringLevel.artworkVersion, colors: { '36': '#a85030' }, submittedAt: timestamp,
  }));
});

test('精简版完成前两项后使用完整画架，挂画讲解结束再解锁画卷', async ({ page, isMobile, browserName }) => {
  test.setTimeout(150_000);
  const galleryKey = 'dunhuang:first-gallery-caisson:v1';
  const worldKey = 'dunhuang:first-gallery-caisson-world:v1';
  const position = toTerrainPoint('courtyard', { x: -6.5, z: -3.9 });
  const yaw = TERRAIN_REGIONS.courtyard.yaw;
  await page.emulateMedia({ reducedMotion: isMobile ? 'reduce' : 'no-preference' });
  await page.addInitScript(({ worldKey, galleryKey, position, yaw, record }) => {
    if (!localStorage.getItem(galleryKey)) localStorage.setItem(galleryKey, JSON.stringify(record));
    if (!sessionStorage.getItem(worldKey)) sessionStorage.setItem(worldKey, JSON.stringify({
      version: 1, position, heading: yaw, cameraYaw: yaw, visitedEvents: [],
    }));
  }, { worldKey, galleryKey, position, yaw,
    record: { ...emptyFirstGallery, muralParts: restoredMuralParts, caissonCompleted: true } });
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

  await page.goto('/#/');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  const world = page.getByTestId('world-host');
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await texture();
  if (browserName === 'chromium' && !isMobile) {
    await world.locator('canvas').click({ button: 'right', position: { x: 200, y: 230 } });
    await page.waitForFunction(() => document.pointerLockElement instanceof HTMLCanvasElement);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await page.waitForFunction(() => document.pointerLockElement === null);
  }
  const interact = page.getByTestId('gallery-interact');
  const easelInvitation = page.getByTestId('gallery-easel-invite');
  await expect(easelInvitation).toBeInViewport({ ratio: 1 });
  await expect(easelInvitation.getByText('要看看这个画架吗？')).toBeVisible();
  await expect(easelInvitation.getByRole('button', { name: '自由探索' })).toBeVisible();
  await expect(page.locator('.gallery-subtitle')).toHaveCount(0);
  await expect(interact).toHaveCount(0);
  const lookAtEasel = easelInvitation.getByRole('button', { name: '看看画架' });
  if (isMobile) await lookAtEasel.tap();
  else await lookAtEasel.click();
  await expect(easelInvitation).toHaveCount(0);
  const introduction: string[] = [];
  await expect.poll(async () => {
    const cue = page.locator('.gallery-subtitle');
    if (await cue.isVisible().catch(() => false)) {
      introduction.push(await cue.innerText());
      await cue.click({ timeout: 2_000 }).catch(() => {});
    }
    return interact.isVisible();
  }, { timeout: 45_000, intervals: [500] }).toBe(true);
  expect(introduction.some(line => line.includes('一点颜色都没有'))).toBe(true);
  expect(introduction.some(line => line.includes('旁边还有颜料'))).toBe(true);
  await expect(interact).toHaveText('给画添点颜色');
  await expect(page.getByTestId('gallery-portal-question')).toHaveCount(0);
  await interact.click();
  await expect(page.getByRole('heading', { name: '画架设色' })).toBeVisible();
  await expect(page.getByRole('button', { name: '从作品库更换画作' })).toBeVisible();
  const enter = page.getByRole('button', { name: '开始设色', exact: true });
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
  await expect(page.locator('.gallery-subtitle')).toContainText('真的挂上去了', { timeout: 30_000 });
  await expect(page.getByTestId('gallery-portal-question')).toHaveCount(0);
  await page.locator('.gallery-subtitle').click();
  await expect(page.locator('.gallery-subtitle')).toContainText('敦煌纹样的色彩', { timeout: 20_000 });
  await expect(page.getByTestId('gallery-portal-question')).toHaveCount(0);
  await page.locator('.gallery-subtitle').click();
  await finishCeremony(page, 'skip');
  await expect(page.getByTestId('gallery-interact')).toHaveText('欣赏或更换画作', { timeout: 20_000 });
  await page.getByTestId('gallery-interact').click();
  await page.getByRole('button', { name: '从作品库更换画作' }).click();
  await expect(page.getByRole('heading', { name: '我的填色作品库' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await texture();
  await expect(page.getByTestId('gallery-interact')).toHaveText('欣赏或更换画作', { timeout: 20_000 });
  await expect(easelInvitation).toHaveCount(0);
});
