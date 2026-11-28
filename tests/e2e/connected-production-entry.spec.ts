import { expect, test } from '@playwright/test';
import { TERRAIN_REGIONS, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import { CAISSON_ONLY_GALLERY_STORAGE_KEY } from '../../src/services/first-gallery';
import { CAISSON_ONLY_WORLD_SESSION_KEY } from '../../src/services/first-gallery-entry';
import { unlockPatternsForTest } from './gallery-unlock-fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dunhuang:traveler-selection:v1', 'classic'));
});

test('独立三馆入口仍可触发第一馆互动', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/first-gallery-v001.html?view=mural');
  await page.getByRole('button', { name: '开启敦煌之旅' }).click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('world-task-toggle')).toBeVisible();
  await page.getByTestId('world-task-toggle').click();
  await expect(page.getByTestId('world-task-panel')).toBeVisible();
  await expect(page.getByText('前面有一面壁画，要过去看看吗？')).toBeVisible();
});

for (const edition of ['精简首页', '独立三馆入口'] as const) {
  test(`${edition}同次确认旅人后，从游戏关卡返回画卷台继续漫游`, async ({ page }) => {
    test.setTimeout(120_000);
    const compact = edition === '精简首页';
    await unlockPatternsForTest(page, compact ? CAISSON_ONLY_GALLERY_STORAGE_KEY : undefined);
    if (compact) {
      const { x, z } = toTerrainPoint('courtyard', { x: -19, z: -1.7 });
      const yaw = 2.45 + TERRAIN_REGIONS.courtyard.yaw;
      await page.addInitScript(({ key, x, z, yaw }) => {
        sessionStorage.setItem(key, JSON.stringify({
          version: 1, position: { x, z }, heading: yaw, cameraYaw: yaw, visitedEvents: [],
        }));
      }, { key: CAISSON_ONLY_WORLD_SESSION_KEY, x, z, yaw });
    }
    await page.goto(compact ? '/' : '/first-gallery-v001.html?view=scroll');
    const world = page.getByTestId('world-host');
    await expect(world).toHaveCount(0);
    await page.getByRole('button', { name: '开启敦煌之旅' }).click();
    await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
    const position = () => page.getByTestId('world-position').evaluate(element => [
      element.getAttribute('data-x'), element.getAttribute('data-z'),
    ]);
    const checkpoint = await position();
    const enterGames = page.getByTestId('gallery-interact');
    await expect(enterGames).toHaveText('进入游戏世界');
    await enterGames.click();
    await page.getByRole('link', { name: '找不同' }).click();
    await page.getByRole('link', { name: '开始观察' }).and(page.locator('a[href="#/play/patterns-intro"]')).click();
    await expect(page.getByTestId('phaser-player')).toBeVisible();
    await page.getByRole('button', { name: /^返回(找不同)?关卡$/ }).click();
    await page.getByRole('button', { name: '返回游戏选择' }).click();
    await page.getByRole('button', { name: '返回上一级' }).click();
    await expect(page.locator('.traveler-selection')).toHaveCount(0);
    await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
    expect(await position()).toEqual(checkpoint);
  });
}

test('从指南直接打开后仍可回到三馆漫游', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/first-gallery-v001.html#/help');
  await page.getByTestId('world-return').click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('world-task-toggle')).toBeVisible();
});

test('试玩解锁只开放本次地图和路线，并可恢复原门禁和站位', async ({ page }) => {
  test.setTimeout(120_000);
  const checkpointKey = 'dunhuang:first-gallery-world:v1';
  const checkpoint = { version: 1, position: { x: 113, z: 19 }, heading: Math.PI, cameraYaw: Math.PI, visitedEvents: [] };
  await page.addInitScript(({ key, checkpoint }) => {
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(checkpoint));
  }, { key: checkpointKey, checkpoint });
  // Exercise the imported developer feature on an explicitly opted-in entry.
  await page.route('**/first-gallery-v001.html', async route => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({ response, body: html.replace('id="root"', 'id="root" data-preview-all-galleries="v001"') });
  });
  await page.goto('/first-gallery-v001.html#/settings');
  await page.getByRole('button', { name: '一键解锁所有场馆' }).click();
  await expect(page.getByRole('button', { name: '恢复正常门禁' })).toBeVisible();
  await page.getByTestId('world-return').click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 50_000 });
  await page.getByTestId('world-mini-map-toggle').click();
  await expect(page.getByTestId('world-mini-map-panel')).toHaveAttribute('data-unlocked-galleries', '3');
  await page.getByTestId('world-mini-map-close').click();
  await expect(page.getByTestId('world-position')).toHaveAttribute('data-z', '19.000');
  await page.keyboard.down('ArrowUp');
  try {
    await expect.poll(async () => Number(await page.getByTestId('world-position').getAttribute('data-z'))).toBeGreaterThan(19.2);
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  if (await page.evaluate(() => document.pointerLockElement !== null)) {
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await page.waitForFunction(() => document.pointerLockElement === null);
  }
  await page.getByRole('navigation', { name: '世界导航' }).getByRole('link', { name: '设置' }).click();
  const stored = await page.evaluate(key => ({
    checkpoint: JSON.parse(sessionStorage.getItem(key) ?? 'null'),
    completion: localStorage.getItem('dunhuang:first-gallery:v1'),
    otherCompletions: Object.keys(localStorage).filter(key => key.startsWith('dunhuang:music-gallery:progress:v1:')
      || key.startsWith('dunhuang:mogao-game-access')),
  }), checkpointKey);
  expect(stored).toEqual({ checkpoint, completion: null, otherCompletions: [] });
  await page.getByRole('button', { name: '恢复正常门禁' }).click();
  await page.getByTestId('world-return').click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 50_000 });
  await expect(page.getByTestId('world-position')).toHaveAttribute('data-z', '19.000');
  await page.getByTestId('world-mini-map-toggle').click();
  await expect(page.getByTestId('world-mini-map-panel')).toHaveAttribute('data-unlocked-galleries', '1');
});

test('co-work 现有入口的设置不提供试玩解锁', async ({ page }) => {
  for (const entry of ['/', '/first-gallery-v001.html']) {
    await page.goto(`${entry}#/settings`);
    await expect(page.getByRole('heading', { name: '设置', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '一键解锁所有场馆' })).toHaveCount(0);
  }
});
