import { expect, test, type Page } from '@playwright/test';
import type { GameLayout } from '../../src/runtime/layout';

const levelId = 'patterns-rabbits';
const progressKey = 'dunhuang:progress:v1';
const sourceSize = { width: 665, height: 662 };
const targetPoints = [
  { x: 201, y: 202 },
  { x: 602, y: 511 },
  { x: 365, y: 325 },
  { x: 43, y: 56 },
  { x: 536, y: 77 },
];
const progressLabel = (found: number) => `已找到 ${found} 处，共 5 处`;
test.setTimeout(60_000);

async function currentLayout(page: Page): Promise<GameLayout> {
  return JSON.parse((await page.getByTestId('phaser-player').getAttribute('data-layout'))!);
}

async function clickSourcePoint(page: Page, point: { x: number; y: number }, side: 'reference' | 'edited', touch: boolean) {
  const rectangle = (await currentLayout(page))[side];
  const position = {
    x: rectangle.x + point.x / sourceSize.width * rectangle.width,
    y: rectangle.y + point.y / sourceSize.height * rectangle.height,
  };
  const canvas = page.getByTestId('phaser-player').locator('canvas');
  if (touch) await canvas.tap({ position });
  else await canvas.click({ position });
}

test('三兔与旋转按交付比例展示，找到五处指定变化后独立保存', async ({ page }, testInfo) => {
  const touch = testInfo.project.name === 'mobile-chromium';
  await page.goto('/#/theme/patterns/games/spot-difference');
  await expect(page.locator('.level-select-screen')).toHaveAttribute('data-page-size', touch ? '2' : '6');
  await expect(page.getByTestId('level-catalog-summary')).toHaveText('共 6 关5 关开放');
  const card = page.locator(`.level-choice-card[data-level-id="${levelId}"]`);
  for (let index = 0; index < 2 && !await card.count(); index++) {
    const pager = page.locator('.selection-pagination > span');
    const previous = await pager.textContent();
    await page.getByRole('button', { name: '下一页', exact: true }).click();
    await expect(pager).not.toHaveText(previous!);
  }
  await expect(card).toHaveAttribute('data-status', 'available');
  await expect(card).toContainText('5处差异');
  await card.getByRole('link', { name: '三兔与旋转', exact: true }).click();
  await expect(page.getByRole('heading', { name: /三兔与旋转/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '给我提示', exact: true })).toBeEnabled({ timeout: 45_000 });
  const progress = page.getByTestId('game-progress');
  await expect(progress).toHaveAttribute('aria-label', progressLabel(0));
  await expect(page.getByTestId('phaser-player').locator('canvas')).toBeInViewport({ ratio: 0.999 });
  const layout = await currentLayout(page);
  for (const image of [layout.reference, layout.edited]) {
    expect(image.width / image.height).toBeCloseTo(sourceSize.width / sourceSize.height, 6);
  }

  await clickSourcePoint(page, { x: 330, y: 650 }, 'reference', touch);
  await expect(progress).toHaveAttribute('aria-label', progressLabel(0));
  await clickSourcePoint(page, targetPoints[0], 'edited', touch);
  await expect(progress).toHaveAttribute('aria-label', progressLabel(1));
  await clickSourcePoint(page, targetPoints[0], 'reference', touch);
  await expect(progress).toHaveAttribute('aria-label', progressLabel(1));

  for (const [index, point] of targetPoints.slice(1).entries()) {
    await clickSourcePoint(page, point, index % 2 ? 'edited' : 'reference', touch);
    if (index < 3) await expect(progress).toHaveAttribute('aria-label', progressLabel(index + 2));
  }
  await expect(page).toHaveURL(/#\/result\/patterns-rabbits$/);
  await expect(page.getByRole('heading', { name: '观察完成', exact: true })).toBeVisible();
  await expect(page.locator('.result-count')).toHaveText('5处发现');
  const completed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey);
  expect(Object.keys(completed)).toEqual([levelId]);
  expect(completed[levelId]).toMatch(/^\d{4}-\d\d-\d\dT/);
  await page.reload();
  await expect(page.getByRole('heading', { name: '观察完成', exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey)).toEqual(completed);
});
