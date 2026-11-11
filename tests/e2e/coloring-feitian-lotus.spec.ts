import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ColoringLevel } from '../../src/types';
const level = JSON.parse(readFileSync('src/content/levels/coloring-feitian-lotus.json', 'utf8')) as ColoringLevel;

test('飞天持莲可为莲花、莲梗、手、云、衣物和背景分别着色并保存', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/play/coloring-feitian-lotus');
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: 45000 });
  const host = page.getByTestId('phaser-player');
  for (const id of [36, 47, 55, 13, 52, 6]) {
    const region = level.regions.find(item => item.id === id)!;
    const layout = JSON.parse((await host.getAttribute('data-layout'))!);
    await host.locator('canvas').click({ position: { x: layout.image.x + region.point.x * layout.image.width, y: layout.image.y + region.point.y * layout.image.height } });
    await expect.poll(async () => page.evaluate(({ version }) => Object.keys(JSON.parse(localStorage.getItem('dunhuang:artworks:v2') ?? '{"artworks":{}}').artworks['coloring-feitian-lotus']?.[version]?.colors ?? {}).length, { version: level.artworkVersion })).toBeGreaterThanOrEqual([36, 47, 55, 13, 52, 6].indexOf(id) + 1);
  }
  await page.screenshot({ path: `work/coloring-feitian-lotus-${testInfo.project.name}-1x.png` });
  await page.getByRole('button', { name: '3×', exact: true }).click();
  await page.screenshot({ path: `work/coloring-feitian-lotus-${testInfo.project.name}-3x.png` });
  await page.reload();
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: '完成作品', exact: true }).click();
  await expect(page.getByTestId('coloring-result-canvas')).toBeVisible();
});
