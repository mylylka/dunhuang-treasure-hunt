import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ProgressData, SpotDifferenceLevel } from '../../src/types';

const level = JSON.parse(readFileSync('src/content/levels/patterns-geometry.json', 'utf8')) as SpotDifferenceLevel;
const progressKey = 'dunhuang:progress:v1';
const oldCompletion = '2026-10-29T00:00:00.000Z';
const imageLoadTimeout = 45_000;
test.setTimeout(60_000);

interface Point { x: number; y: number }
interface Rect extends Point { width: number; height: number }
interface Layout { reference: Rect; edited: Rect }
const repeatedMotifs = [
  { id: 'diamond-inlay', point: { x: 426, y: 992 }, another: { x: 992, y: 620 } },
  { id: 'orange-pearl', point: { x: 552, y: 1045 }, another: { x: 1047, y: 483 } },
  { id: 'pale-leaf-border', point: { x: 851, y: 570 }, another: { x: 624, y: 851 } },
  { id: 'red-ground-flower', point: { x: 901, y: 617 }, another: { x: 625, y: 899 } },
] as const;
const progressLabel = (found: number) => `已找到 ${found} 处，共 4 处`;

async function completedLevels(page: Page): Promise<ProgressData['completed']> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey);
}

async function clickSourcePoint(page: Page, point: Point, side: 'reference' | 'edited', touch: boolean) {
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!) as Layout;
  const image = layout[side];
  const position = { x: image.x + point.x / 1254 * image.width, y: image.y + point.y / 1254 * image.height };
  if (touch) await host.locator('canvas').tap({ position });
  else await host.locator('canvas').click({ position });
}

async function expectGameFits(page: Page) {
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) <= innerHeight + 1
    && Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth + 1
    && scrollX === 0 && scrollY === 0)).toBe(true);
  await expect(page.getByTestId('phaser-player').locator('canvas')).toBeInViewport({ ratio: 0.999 });
  for (const name of ['给我提示', '重新开始']) await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 0.999 });
  const layout = JSON.parse((await page.getByTestId('phaser-player').getAttribute('data-layout'))!) as Layout;
  for (const image of [layout.reference, layout.edited]) expect(image.width / image.height).toBeCloseTo(1, 3);
}

test('联珠与几何：四类边框差异可从重复单元发现，提示重来不伪通关，完成记录独立保存', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const touch = testInfo.project.name === 'mobile-chromium';
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).pathname.startsWith('/assets/')) {
      errors.push(`素材请求失败：${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript(({ key, timestamp }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({
      version: 1, completed: { 'patterns-intro': timestamp }, settings: { reducedMotion: true },
    }));
  }, { key: progressKey, timestamp: oldCompletion });

  await page.goto('/#/theme/patterns/games/spot-difference');
  await expect(page.locator('.level-select-screen')).toHaveAttribute('data-page-size', touch ? '2' : '6');
  const card = page.locator('.level-choice-card[data-level-id="patterns-geometry"]');
  for (let pageIndex = 0; pageIndex < 3 && !await card.count(); pageIndex++) {
    const pager = page.locator('.selection-pagination > span');
    const previous = await pager.textContent();
    await page.getByRole('button', { name: '下一页', exact: true }).click();
    await expect(pager).not.toHaveText(previous!);
  }
  await expect(card).toHaveAttribute('data-status', 'available');
  await expect(card).toContainText('4处差异');
  await card.getByRole('link', { name: '联珠与几何', exact: true }).click();
  await expect(page.getByRole('heading', { name: level.title, exact: true })).toBeVisible();
  const hint = page.getByRole('button', { name: '给我提示', exact: true });
  const progress = page.getByTestId('game-progress');
  await expect(hint).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(progress).toHaveAttribute('aria-label', progressLabel(0));
  await expectGameFits(page);

  await hint.click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].hint);
  await hint.click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].detailHint);
  await expect(progress).toHaveAttribute('aria-label', progressLabel(0));
  await clickSourcePoint(page, repeatedMotifs[0].point, 'edited', touch);
  await expect(progress).toHaveAttribute('aria-label', progressLabel(1));
  await clickSourcePoint(page, repeatedMotifs[0].another, 'reference', touch);
  await expect(progress).toHaveAttribute('aria-label', progressLabel(1));
  await clickSourcePoint(page, { x: 627, y: 627 }, 'reference', touch);
  await clickSourcePoint(page, { x: 627, y: 627 }, 'edited', touch);
  await expect(progress).toHaveAttribute('aria-label', progressLabel(1));
  expect(await completedLevels(page)).toEqual({ 'patterns-intro': oldCompletion });
  await expect(page).toHaveURL(/#\/play\/patterns-geometry$/);

  if (touch) {
    await page.setViewportSize({ width: 844, height: 390 });
    await expectGameFits(page);
    await expect(progress).toHaveAttribute('aria-label', progressLabel(1));
    await page.setViewportSize({ width: 390, height: 844 });
    await expectGameFits(page);
  }
  await page.getByRole('button', { name: '重新开始', exact: true }).click();
  await expect(progress).toHaveAttribute('aria-label', progressLabel(0));
  await hint.click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].hint);
  expect(await completedLevels(page)).toEqual({ 'patterns-intro': oldCompletion });

  for (const [index, motif] of repeatedMotifs.entries()) {
    await clickSourcePoint(page, motif.point, index % 2 ? 'reference' : 'edited', touch);
    if (index < 3) {
      await expect(progress).toHaveAttribute('aria-label', progressLabel(index + 1));
      expect(await completedLevels(page)).toEqual({ 'patterns-intro': oldCompletion });
    }
  }
  await expect(page).toHaveURL(/#\/result\/patterns-geometry$/);
  await expect(page.getByRole('heading', { name: '观察完成', exact: true })).toBeVisible();
  await expect(page.locator('.result-count')).toHaveText('4处发现');
  const completed = await completedLevels(page);
  expect(Object.keys(completed).sort()).toEqual(['patterns-geometry', 'patterns-intro']);
  expect(completed['patterns-intro']).toBe(oldCompletion);
  expect(completed['patterns-geometry']).toMatch(/^\d{4}-\d\d-\d\dT/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '观察完成', exact: true })).toBeVisible();
  expect(await completedLevels(page)).toEqual(completed);
  await page.getByRole('button', { name: '再观察一次', exact: true }).click();
  await expect(hint).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(progress).toHaveAttribute('aria-label', progressLabel(0));
  expect(await completedLevels(page)).toEqual(completed);
  expect(errors).toEqual([]);
});

test('935×604紧凑窗口：与其他方图关卡同尺寸，重来图标和文字不重叠', async ({ page }) => {
  await page.setViewportSize({ width: 935, height: 604 });
  const imageWidths: number[] = [];
  for (const id of ['patterns-geometry', 'patterns-lotus', 'patterns-scrolls']) {
    await page.goto(`/#/play/${id}`);
    await expect(page.getByRole('button', { name: '给我提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
    await expectGameFits(page);
    const layout = JSON.parse((await page.getByTestId('phaser-player').getAttribute('data-layout'))!) as Layout;
    // Before the compact gameplay layout these square images were only ~170px.
    expect(layout.reference.width).toBeGreaterThanOrEqual(300);
    imageWidths.push(layout.reference.width);
    const restart = page.getByRole('button', { name: '重新开始', exact: true });
    const icon = (await restart.locator('img').boundingBox())!;
    const label = (await restart.locator('.button-label').boundingBox())!;
    expect(label.x - icon.x - icon.width).toBeGreaterThanOrEqual(5);
    await expect(restart).toBeInViewport({ ratio: 0.999 });
  }
  expect(Math.max(...imageWidths) - Math.min(...imageWidths)).toBeLessThanOrEqual(1);
});
