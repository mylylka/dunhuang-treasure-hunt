import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ColoringLevel } from '../../src/types';

const level = JSON.parse(readFileSync('src/content/levels/coloring-feitian-lotus.json', 'utf8')) as ColoringLevel;

async function expectInsideViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
}

test('2D 填色完成后显示原有画架提示，结果页在视口内', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/play/coloring-feitian-lotus');
  const swatch = page.getByRole('button', { name: '选择赭红', exact: true });
  await expect(swatch).toBeEnabled({ timeout: 45_000 });
  await swatch.click();
  const host = page.getByTestId('phaser-player');
  const { image } = JSON.parse((await host.getAttribute('data-layout'))!);
  const { point } = level.regions.find(region => region.id === 36)!;
  const at = { x: image.x + point.x * image.width, y: image.y + point.y * image.height };
  if (isMobile) await host.locator('canvas').tap({ position: at });
  else await host.locator('canvas').click({ position: at });
  const finish = page.getByRole('button', { name: '完成作品', exact: true });
  await expect(finish).toBeEnabled();
  await finish.click();
  await expect(page).toHaveURL(/#\/result\/coloring-feitian-lotus$/);

  const result = page.getByTestId('coloring-result-page');
  const notice = result.locator('.coloring-gallery-note');
  await expect(notice).toHaveText('可以到 3D 世界的画架，从作品库选择这幅画来展示。');
  await expectInsideViewport(page, notice);
  await expectInsideViewport(page, result.getByTestId('coloring-result-canvas'));
  await expectInsideViewport(page, result.getByRole('button', { name: '导出PNG' }));
  await expectInsideViewport(page, result.getByTestId('result-primary-action'));
  await expectInsideViewport(page, result.getByRole('button', { name: '继续创作' }));
  for (const action of await result.locator('.result-actions').locator('a, button').all()) {
    await expectInsideViewport(page, action);
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dunhuang:first-gallery-caisson:v1') ?? '{}'));
  expect(Object.values(saved.artworks ?? {})).toEqual(expect.arrayContaining([
    expect.objectContaining({ levelId: 'coloring-feitian-lotus', colors: { 36: '#a85030' } }),
  ]));
  expect(saved.coloringCompleted).toBe(false);
});
