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
