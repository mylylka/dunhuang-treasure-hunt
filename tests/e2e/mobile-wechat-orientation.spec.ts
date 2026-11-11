import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const viewed = (JSON.parse(readFileSync('src/content/world/mogao-exhibit-v001.json', 'utf8')) as { items: { id: string }[] }).items.map(item => item.id);
const phoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger';

test('手机内嵌浏览器能力报告不完整时，竖屏阻挡并在横屏保留同一局', async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: String(info.project.use.baseURL), viewport: { width: 393, height: 852 },
    screen: { width: 393, height: 852 }, userAgent: phoneUA, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.addInitScript(({ viewed }) => {
      for (const id of ['bandits', 'burning-house', 'story-demo', 'novice-story']) localStorage.setItem(`dunhuang:mogao-hall-a:progress:v2:${id}`, 'complete');
      localStorage.setItem('dunhuang:mogao-hall-a:progress:v2:award', 'received');
      localStorage.setItem('dunhuang:mogao-exhibit:progress:v1', JSON.stringify({ version: 1, viewed, introSeen: true, noticeSeen: true }));
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 0 });
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        const m = original(query);
        if (query !== '(pointer: coarse)' && query !== '(hover: none)') return m;
        return new Proxy(m, { get(target, prop) {
          if (prop === 'matches') return false;
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        } });
      };
    }, { viewed });
    await page.goto('/#/play/puzzle-nine-colored-deer');
    const gate = page.getByTestId('mobile-landscape-gate');
    await expect(gate).toBeVisible();
    await expect(page.locator('.gallery-screen')).toHaveCount(0);
    await page.setViewportSize({ width: 852, height: 393 });
    await expect(gate).toBeHidden();
    await expect(page.getByTestId('gallery-piece')).toHaveCount(12);
    await expect(page.getByTestId('gallery-move-right')).toBeEnabled({ timeout: 45_000 });
    const game = page.locator('.gallery-screen');
    const initial = await game.getAttribute('data-gallery-order');
    await page.getByTestId('gallery-move-right').click();
    await expect(game).not.toHaveAttribute('data-gallery-order', initial!);
    const moved = await game.getAttribute('data-gallery-order');
    await page.setViewportSize({ width: 393, height: 852 });
    await expect(gate).toBeVisible();
    await page.getByTestId('gallery-move-right').dispatchEvent('click');
    expect(await game.getAttribute('data-gallery-order')).toBe(moved);
    await page.setViewportSize({ width: 852, height: 393 });
    await expect(gate).toBeHidden();
    expect(await game.getAttribute('data-gallery-order')).toBe(moved);
  } finally { await context.close(); }
});

test('触控电脑的窄竖窗口不被误判为手机', async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: String(info.project.use.baseURL), viewport: { width: 393, height: 852 },
    screen: { width: 1440, height: 900 }, isMobile: false, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto('/#/themes');
    await expect(page.getByTestId('mobile-landscape-gate')).toBeHidden();
  } finally { await context.close(); }
});
