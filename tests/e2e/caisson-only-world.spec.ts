import { expect, test } from '@playwright/test';
import { fromTerrainPoint, LAKE_ORIGIN, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';

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
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/mogao-upper/v003/mountain-distant-v001.glb')) return;
    if (path.includes('/assets/world/') && /music-|mogao|flying-history|pattern-interactives/.test(path)) otherGalleryAssets.push(path);
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
