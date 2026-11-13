import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { HiddenObjectLevel } from '../../src/types';

const level = JSON.parse(readFileSync('src/content/levels/music-hidden-objects-intro.json', 'utf8')) as HiddenObjectLevel;
test.setTimeout(60_000);
const host = (page: Page) => page.getByTestId('phaser-player');
const layout = async (page: Page) => JSON.parse((await host(page).getAttribute('data-layout'))!);

async function inside(target: Locator, touch = false) {
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport({ ratio: .999 });
  if (touch) {
    const bounds = (await target.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
}

async function fits(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    x: Math.abs(scrollX), y: Math.abs(scrollY),
    width: Math.max(0, Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth - 1),
    height: Math.max(0, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight - 1),
  }))).toEqual({ x: 0, y: 0, width: 0, height: 0 });
}

for (const viewport of [{ width: 1280, height: 925 }, { width: 852, height: 330 }, { width: 640, height: 300 }]) {
  const mobile = viewport.height <= 330;
  test(`找物${viewport.width}×${viewport.height}准备仅目标与开始，同局进入全高长卷`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport, hasTouch: mobile, isMobile: mobile,
      screen: mobile ? { width: 393, height: 852 } : viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/#/play/${level.id}`);
      const screen = page.locator('.hidden-object-screen');
      await expect(screen).toHaveAttribute('data-hidden-status', 'ready', { timeout: 45_000 });
      const ready = page.getByTestId('hidden-object-ready');
      await inside(ready);
      const readyBounds = (await ready.boundingBox())!;
      expect(readyBounds.width).toBeGreaterThanOrEqual(viewport.width * .94);
      expect(readyBounds.height).toBeGreaterThanOrEqual(viewport.height * .94);
      for (const selector of ['.hidden-object-controls', '.hidden-object-task-panel', '.hidden-object-heading', '.hidden-object-actions', '.hidden-object-tools']) {
        await expect(page.locator(selector)).toBeHidden();
      }
      await expect(screen.locator('button:visible')).toHaveText(['开始寻找']);
      await expect(screen).not.toContainText('滚轮或上下拖动浏览');
      const before = await layout(page);
      expect(before.items).toHaveLength(120);
      const targetItems = before.items.filter((item: { groupId?: string }) => item.groupId);
      expect(targetItems.length).toBeGreaterThanOrEqual(3);
      expect(targetItems.length).toBeLessThanOrEqual(6);
      const meta = ready.locator('.hidden-object-ready-meta');
      await expect(meta).toHaveText(`${level.timeLimitSeconds}秒·共${targetItems.length}件`);
      const metaBounds = (await meta.boundingBox())!;
      const targets = page.getByTestId('hidden-object-ready-target');
      await expect(targets).toHaveCount(3);
      for (const target of await targets.all()) {
        await inside(target);
        await inside(target.locator('img'));
        await inside(target.locator('figcaption'));
        const bounds = (await target.boundingBox())!;
        expect(bounds.y).toBeGreaterThanOrEqual(metaBounds.y + metaBounds.height - 1);
      }
      const timer = page.getByTestId('hidden-object-timer');
      await expect(timer).toBeHidden();
      const canvas = await host(page).locator('canvas').elementHandle();
      expect(canvas).not.toBeNull();
      // A real second on the ready page must not consume the independent round clock.
      await page.waitForTimeout(1100);
      expect((await layout(page)).seed).toBe(before.seed);
      await expect(timer).toHaveAttribute('aria-label', `剩余 ${level.timeLimitSeconds} 秒`);
      const start = page.getByRole('button', { name: '开始寻找', exact: true });
      await inside(start, true); await start.click();
      await expect(screen).toHaveAttribute('data-hidden-status', 'running');
      await expect(ready).toHaveCount(0);
      expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
      expect(await host(page).locator('canvas').evaluate((element, original) => element === original, canvas!)).toBe(true);
      await expect.poll(async () => {
        const current = await layout(page), bounds = await host(page).boundingBox();
        return !!bounds && current.width === Math.floor(bounds.width) && current.height === Math.floor(bounds.height);
      }).toBe(true);
      const after = await layout(page);
      expect(after.seed).toBe(before.seed);
      const identity = (items: { id: string; spriteId: string; x: number; y: number; width: number; height: number; rotation: number }[]) =>
        items.map(({ id, spriteId, x, y, width, height, rotation }) => ({ id, spriteId, x, y, width, height, rotation }));
      expect(identity(after.items)).toEqual(identity(before.items));
      await inside(timer);
      await inside(host(page).locator('canvas'));
      for (const task of await page.getByTestId('hidden-object-task').all()) await inside(task, true);
      for (const control of await page.locator('.hidden-object-actions :is(button,a):visible').all()) await inside(control, true);
      if (mobile) {
        await expect(page.locator('.hidden-object-tools')).toBeHidden();
        const canvasBounds = (await host(page).locator('canvas').boundingBox())!;
        expect(canvasBounds.height).toBeGreaterThanOrEqual(viewport.height - 14);
        expect(canvasBounds.width).toBeGreaterThanOrEqual(viewport.width - 200);
      }
      const scrollbar = page.getByTestId('hidden-object-scrollbar');
      await inside(scrollbar);
      await expect.poll(async () => {
        const current = await layout(page);
        const maximum = await scrollbar.evaluate(element => element.scrollHeight - element.clientHeight);
        return current.scrollMax > 0 && Math.abs(maximum - current.scrollMax) <= 1;
      }).toBe(true);
      await scrollbar.evaluate(element => { element.scrollTop = element.scrollHeight - element.clientHeight; });
      await expect.poll(async () => {
        const current = await layout(page);
        return Math.abs(current.scrollTop - current.scrollMax) <= 1;
      }).toBe(true);
      await page.getByRole('button', { name: '暂停', exact: true }).click();
      await expect(screen).toHaveAttribute('data-hidden-status', 'paused');
      await inside(page.getByRole('button', { name: '继续寻找', exact: true }), true);
      expect((await layout(page)).seed).toBe(before.seed);
      await fits(page);
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
