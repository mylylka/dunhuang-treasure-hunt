import { expect, test, type Locator, type Page } from '@playwright/test';

test.setTimeout(60_000);
async function chrome(page: Page, dialog: Locator, label: string) {
  await expect(dialog).toBeInViewport({ ratio: .999 });
  await expect(dialog).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const close = dialog.getByRole('button', { name: label, exact: true });
  await expect(close).toBeInViewport({ ratio: .999 });
  const bounds = (await close.boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
  await expect(close.locator('svg')).toHaveCount(1);
  await close.focus();
  await expect(close).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Tab'); await close.focus();
  await expect(close).toHaveCSS('outline-style', 'solid');
  await expect(close).toHaveCSS('outline-color', 'rgb(168, 132, 89)');
  await expect(close).toHaveCSS('border-radius', '50%');
  await close.click(); await expect(dialog).toBeHidden();
}

for (const viewport of [{ width: 1280, height: 925 }, { width: 640, height: 300 }]) {
  test(`电脑与手机${viewport.width}×${viewport.height}保留弹窗透明外缘、线条关闭和协调焦点`, async ({ browser, baseURL }) => {
    const phone = viewport.width === 640;
    const context = await browser.newContext({ baseURL, viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: 2 });
    try {
      const page = await context.newPage(); const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/#/play/coloring-grape-pomegranate');
      await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: 45_000 });
      await expect(page.getByRole('button', { name: /^(更多|更多操作)$/ })).toHaveCount(0);
      expect(await page.locator('.coloring-reference-label').textContent()).toBe('参考配色');
      await page.getByRole('button', { name: '参考配色', exact: true }).click();
      await chrome(page, page.getByRole('dialog', { name: '参考配色', exact: true }), '关闭参考配色');
      if (phone) {
        await page.getByRole('button', { name: '完整色盘', exact: true }).click();
        await chrome(page, page.getByRole('dialog', { name: '完整色盘', exact: true }), '关闭完整色盘');
      }
      await page.goto('/#/play/puzzle-three-rabbits');
      await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: 45_000 });
      await expect(page.getByRole('button', { name: '更多操作', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: '查看原图', exact: true }).click();
      await chrome(page, page.locator('dialog.puzzle-reference-dialog'), '关闭拼图参考');
      await page.goto('/#/play/music-apsara-shadow');
      await expect(page.getByRole('button', { name: '配对提示', exact: true })).toBeEnabled({ timeout: 45_000 });
      await expect(page.getByRole('button', { name: /^放大影子 [A-D] 对照$/ })).toHaveCount(0);
      await page.getByRole('button', { name: '放大对照', exact: true }).click();
      await chrome(page, page.getByTestId('shadow-match-inspector'), '关闭放大对照');
      await page.goto('/#/theme/patterns');
      await page.getByRole('button', { name: '资料', exact: true }).click();
      await chrome(page, page.getByRole('dialog', { name: '教学资料', exact: true }), '关闭教学资料');
      await page.getByRole('button', { name: '放大查看', exact: true }).first().click();
      await chrome(page, page.getByTestId('lesson-image-viewer'), '关闭图像查看器');
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
