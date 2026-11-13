import { expect, test, type Page } from '@playwright/test';

const levelId = 'puzzle-nine-colored-deer';
const order = async (page: Page) => (await page.locator('.gallery-screen').getAttribute('data-gallery-order'))!.split(',').map(Number);

async function open(page: Page, completed = false) {
  await page.addInitScript(({ completed, levelId }) => {
    if (completed) localStorage.setItem('dunhuang:progress:v1', JSON.stringify({ version: 1, completed: { [levelId]: '2026-11-01T00:00:00.000Z' }, settings: { reducedMotion: true } }));
  }, { completed, levelId });
  await page.goto(`/#/play/${levelId}`);
  await expect(page.locator('.gallery-screen')).toBeVisible();
  await expect(page.getByTestId('gallery-piece')).toHaveCount(12);
  await expect(page.getByTestId('gallery-piece').first()).toBeEnabled({ timeout: 45000 });
}

test('电脑画廊可选图、拖动插入、排序完成并保留旧记录', async ({ page }) => {
  await open(page, true);
  let initial = await order(page);
  expect(initial).not.toEqual([...initial].sort((a, b) => a - b));
  await page.screenshot({ path: 'work/qa/screenshots/mural-gallery-desktop.png' });
  const first = page.getByTestId('gallery-piece').nth(0), third = page.getByTestId('gallery-piece').nth(2);
  await third.click();
  await expect(page.getByTestId('gallery-preview')).toHaveAttribute('data-piece-id', String(initial[2]));
  const start = (await third.boundingBox())!, target = (await first.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down(); await page.mouse.move(target.x + 2, target.y + target.height / 2, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await order(page))[0]).toBe(initial[2]);
  const movedPiece = page.locator(`[data-piece-id="${initial[2]}"][data-testid="gallery-piece"]`);
  await movedPiece.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await order(page))[1]).toBe(initial[2]);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('dunhuang:progress:v1')))!).completed[levelId]).toBe('2026-11-01T00:00:00.000Z');
  await page.getByTestId('gallery-reference').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '关闭拼图参考' }).click();
  await page.getByTestId('gallery-hint').click();
  await expect(page.getByRole('status')).toContainText('应排在');
  for (let i = 0; i < 12; i++) {
    if (page.url().includes('/result/')) break;
    const current = await order(page), index = current.indexOf(i);
    if (index === i) continue;
    const after = [...current]; after.splice(index, 1); after.splice(i, 0, i);
    await page.locator(`[data-piece-id="${i}"][data-testid="gallery-piece"]`).click();
    for (let n = index; n > i; n--) await page.getByTestId('gallery-move-left').click();
    if (after.every((id, index) => id === index)) break;
  }
  await expect(page).toHaveURL(new RegExp(`/#/result/${levelId}$`));
  await expect(page.getByRole('heading', { name: '恭喜完成！' })).toBeVisible();
  await expect(page.getByTestId('gallery-result-mural')).toBeVisible();
  await expect(page.getByTestId('gallery-result-next')).toBeDisabled();
  await page.getByRole('button', { name: '重玩' }).click();
  await expect(page.locator('.gallery-screen')).toBeVisible();
  expect(await order(page)).not.toEqual(Array.from({ length: 12 }, (_, i) => i));
});

test('手机横屏可浏览、按住拖动插入，转竖屏保留本局', async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: String(info.project.use.baseURL), viewport: { width: 844, height: 390 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await open(page);
    const initial = await order(page);
    const metrics = await page.locator('[data-testid="gallery-piece"] .gallery-piece-art').evaluateAll(nodes => {
      const a = nodes[0].getBoundingClientRect(), b = nodes[1].getBoundingClientRect();
      const parent = nodes[0].parentElement!, style = getComputedStyle(parent), art = getComputedStyle(nodes[0]);
      return { gap: b.left - a.right, buttonWidth: parent.getBoundingClientRect().width, artWidth: a.width, padding: style.padding, minWidth: style.minWidth, artHeight: a.height, aspect: art.aspectRatio };
    });
    expect(Math.abs(metrics.gap), JSON.stringify(metrics)).toBeLessThan(1);
    const first = page.getByTestId('gallery-piece').nth(0), third = page.getByTestId('gallery-piece').nth(2);
    const a = (await third.boundingBox())!, b = (await first.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x + a.width / 2, y: a.y + a.height / 2 }] });
    await page.waitForTimeout(400);
    await expect(page.getByTestId('gallery-drag-preview')).toBeVisible();
    await expect(page.getByTestId('gallery-piece')).toHaveCount(11);
    await expect(page.locator(`[data-piece-id="${initial[2]}"][data-testid="gallery-piece"]`)).toHaveCount(0);
    await page.screenshot({ path: 'work/qa/screenshots/mural-gallery-drag-mobile.png' });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + 2, y: b.y + b.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByTestId('gallery-drag-preview')).toHaveCount(0);
    await expect.poll(async () => (await order(page))[0]).toBe(initial[2]);
    const moved = await order(page);
    await page.screenshot({ path: 'work/qa/screenshots/mural-gallery-mobile.png' });
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])).toEqual([844, 390]);
    const selected = (await page.getByTestId('gallery-piece').first().boundingBox())!;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: selected.x + selected.width / 2, y: selected.y + selected.height / 2 }] });
    await page.waitForTimeout(400);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
    await expect(page.getByTestId('gallery-drag-preview')).toHaveCount(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByTestId('mobile-landscape-gate')).not.toBeVisible();
    expect(await order(page)).toEqual(moved);
    await page.setViewportSize({ width: 640, height: 300 });
    const tray = page.getByTestId('gallery-tray');
    const compactMetrics = await page.locator('[data-testid="gallery-piece"] .gallery-piece-art').evaluateAll(nodes => {
      const a = nodes[0].getBoundingClientRect(), b = nodes[1].getBoundingClientRect();
      return { gap: b.left - a.right, width: nodes[0].parentElement!.getBoundingClientRect().width };
    });
    expect(Math.abs(compactMetrics.gap)).toBeLessThan(1);
    expect(compactMetrics.width).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: 'work/qa/screenshots/mural-gallery-compact-mobile.png' });
    for (const button of [page.getByTestId('gallery-reference'), page.getByTestId('gallery-hint'), page.getByTestId('gallery-restart'), page.getByTestId('gallery-move-left'), page.getByTestId('gallery-move-right')]) {
      const bounds = (await button.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      await expect(button).toBeInViewport({ ratio: 1 });
    }
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])).toEqual([640, 300]);
    // Eleven closely packed tiles can fit at 640px; use a narrower landscape viewport to exercise edge scrolling after pickup.
    await page.setViewportSize({ width: 540, height: 260 });
    const box = (await tray.boundingBox())!, firstPiece = (await page.getByTestId('gallery-piece').first().boundingBox())!;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: firstPiece.x + firstPiece.width / 2, y: firstPiece.y + firstPiece.height / 2 }] });
    await page.waitForTimeout(400);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width - 3, y: firstPiece.y + firstPiece.height / 2 }] });
    await expect.poll(async () => tray.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await context.close(); }
});

test('拖起后补位，并能准确插入末尾和中间', async ({ page }) => {
  await open(page);
  const initial = await order(page);
  const dragToSlot = async (id: number, slot: number) => {
    const selected = page.locator(`[data-testid="gallery-piece"][data-piece-id="${id}"]`);
    const rect = (await selected.boundingBox())!;
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 12, rect.y + rect.height / 2);
    await expect(page.getByTestId('gallery-piece')).toHaveCount(11);
    await expect(selected).toHaveCount(0);
    await page.waitForTimeout(260);
    const pieces = page.getByTestId('gallery-piece');
    const target = (await pieces.nth(Math.min(slot, 10)).boundingBox())!;
    const x = slot === 11 ? target.x + target.width - 1 : target.x + 1;
    await page.mouse.move(x, target.y + target.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByTestId('gallery-piece')).toHaveCount(12);
  };
  const moved = initial[1];
  await dragToSlot(moved, 11);
  const tail = initial.filter(id => id !== moved).concat(moved);
  await expect.poll(() => order(page)).toEqual(tail);
  await page.waitForTimeout(250);
  await dragToSlot(moved, 4);
  const middle = tail.filter(id => id !== moved); middle.splice(4, 0, moved);
  await expect.poll(() => order(page)).toEqual(middle);
});
