import { expect, test, type Locator, type Page } from '@playwright/test';

const directory = '/#/theme/patterns/games/puzzle';
const progressKey = 'dunhuang:progress:v1';
const list = (page: Page) => page.getByTestId('level-choice-scroll');

async function noPageScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    vertical: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
    x: scrollX, y: scrollY,
  }))).toEqual({ horizontal: 0, vertical: 0, x: 0, y: 0 });
}

async function visible(page: Page, element: Locator, touch = false) {
  await expect(element).toBeInViewport({ ratio: .999 });
  const rect = (await element.boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual((await page.evaluate(() => innerWidth)) + 1);
  if (touch) {
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
}

test('844与852手机横屏展示至少三列紧凑关卡，固定标题并滚动到所有筹备位', async ({ page }) => {
  for (const viewport of [{ width: 844, height: 300 }, { width: 852, height: 330 }]) {
    await page.setViewportSize(viewport);
    await page.goto(directory);
    await expect(page.locator('.level-choice-card')).toHaveCount(6);
    await expect(page.locator('.level-select-screen')).toHaveClass(/is-compact/);
    await expect.poll(async () => Number(await page.locator('.level-select-screen').getAttribute('data-columns'))).toBeGreaterThanOrEqual(3);
    await expect(page.getByRole('button', { name: /^(上一页|下一页)$/ })).toHaveCount(0);
    await list(page).evaluate(element => { element.scrollTop = 0; });
    const header = page.locator('.level-select-screen .selection-topbar');
    const before = await header.boundingBox();
    const firstRow = page.locator('.level-choice-card').filter({ has: page.locator('.selected-level-start') });
    for (const card of await firstRow.all()) {
      await visible(page, card);
      const rect = (await card.boundingBox())!;
      expect(rect.height).toBeGreaterThanOrEqual(120);
      expect(rect.height).toBeLessThanOrEqual(155);
      for (const link of await card.locator('a').all()) await visible(page, link, true);
      expect(await card.locator('.selected-level-picture').evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(94);
    }
    await list(page).focus();
    await list(page).press('End');
    await expect.poll(() => list(page).evaluate(element =>
      Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThanOrEqual(1);
    const last = page.locator('.level-choice-card').last();
    await visible(page, last);
    await expect(last).toContainText('筹备中');
    await expect(page.locator('.level-choice-card[data-status="planned"] a')).toHaveCount(0);
    expect(await header.boundingBox()).toEqual(before);
    await visible(page, page.getByRole('button', { name: '返回游戏选择', exact: true }), true);
    await noPageScroll(page);
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  }
});

test.describe('电脑关卡目录', () => {
  test.use({ isMobile: false, hasTouch: false });

  test('大屏保持六卡同屏，电脑窄窗仍可键盘浏览滚动目录', async ({ page }) => {
    await page.setViewportSize({ width: 1279, height: 925 });
    await page.goto(directory);
    await expect(page.locator('.level-choice-card')).toHaveCount(6);
    await expect(page.locator('.level-select-screen')).not.toHaveClass(/is-compact/);
    for (const card of await page.locator('.level-choice-card').all()) await visible(page, card);
    await noPageScroll(page);
    await page.setViewportSize({ width: 360, height: 640 });
    await expect(page.getByTestId('mobile-landscape-gate')).toBeHidden();
    await expect(page.locator('.level-select-screen')).toHaveClass(/is-compact/);
    await expect(page.locator('.level-select-screen')).toHaveAttribute('data-columns', '1');
    await list(page).focus();
    await list(page).press('End');
    await visible(page, page.locator('.level-choice-card').last());
    await noPageScroll(page);
    const title = page.locator('.level-choice-card[data-status="available"] .selected-level-title-link').last();
    await title.focus();
    await expect(title).toBeFocused();
    await title.press('Enter');
    await expect(page).toHaveURL(/#\/play\/puzzle-twin-dragons$/);
  });
});
