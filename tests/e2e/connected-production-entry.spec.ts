import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dunhuang:traveler-selection:v1', 'classic'));
});

test('正式首页进入三馆并可触发第一馆互动', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?view=mural');
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('world-task-toggle')).toBeVisible();
  await page.getByTestId('world-task-toggle').click();
  await expect(page.getByTestId('world-task-panel')).toBeVisible();
  await expect(page.getByText('前面有一面壁画，要过去看看吗？')).toBeVisible();
});

test('从指南直接打开后仍可回到三馆漫游', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/#/help');
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
