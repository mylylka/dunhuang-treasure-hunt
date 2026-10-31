import { expect, test, type Page } from '@playwright/test';

const sessionKey = 'dunhuang:world-session:v1';
const oldKeys = ['dunhuang:progress:v1', 'dunhuang:artworks:v1', 'dunhuang:learning:v1'];
const readyTimeout = 45_000;
test.setTimeout(60_000);

async function seedPosition(page: Page, x: number, z: number) {
  await page.addInitScript(({ key, x, z }) => {
    // Only seed a new tab; reload and 2D returns must use the application's save.
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify({
      version: 1, position: { x, z }, heading: 0, cameraYaw: 0, visitedEvents: [],
    }));
  }, { key: sessionKey, x, z });
}
async function ready(page: Page) {
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: readyTimeout });
  await expect(page.getByTestId('world-host').locator('canvas')).toHaveCount(1);
}
async function position(page: Page) {
  const locator = page.getByTestId('world-position');
  return { x: Number(await locator.getAttribute('data-x')), z: Number(await locator.getAttribute('data-z')) };
}
async function fits(page: Page) {
  expect(await page.evaluate(() => ({
    x: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    y: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
  }))).toEqual({ x: 0, y: 0 });
}
async function hold(page: Page, key: string, duration: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('世界行走、暂停和恢复不会留下卡住的按键或改写旧记录', async ({ page }) => {
  await page.goto('/#/');
  await ready(page);
  const before = await position(page);
  await hold(page, 'w', 800);
  await expect.poll(async () => (await position(page)).z).toBeLessThan(before.z - 1);
  expect(Math.abs((await position(page)).x - before.x)).toBeLessThan(.15);
  await page.keyboard.down('w');
  await page.getByTestId('world-pause').click();
  await page.keyboard.up('w');
  const paused = await position(page);
  await page.waitForTimeout(350);
  expect(await position(page)).toEqual(paused);
  await page.getByTestId('world-resume').click();
  await page.waitForTimeout(350);
  expect(await position(page)).toEqual(paused);
  await hold(page, 'ArrowRight', 450);
  await expect.poll(async () => (await position(page)).x).toBeGreaterThan(paused.x + .5);
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), oldKeys)).toEqual([null, null, null]);
  await fits(page);
});

test('靠近只提示，藻井观察进入教学后释放世界并安全返回', async ({ page }) => {
  await seedPosition(page, -12, -17);
  await page.goto('/#/');
  await ready(page);
  await expect(page.getByTestId('world-interact')).toBeVisible();
  await expect(page.getByTestId('world-observation')).toHaveCount(0);
  await page.getByTestId('world-interact').click();
  await expect(page.getByTestId('world-observation')).toBeVisible();
  const still = await position(page);
  await hold(page, 'w', 350);
  expect(await position(page)).toEqual(still);
  await page.getByTestId('world-enter-theme').click();
  await expect(page).toHaveURL(/#\/theme\/patterns$/);
  await expect(page.getByTestId('teaching-screen')).toBeVisible();
  await expect(page.getByTestId('world-host')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByTestId('world-return').click();
  await ready(page);
  const restored = await position(page);
  expect(restored.x).toBeCloseTo(-12, 1);
  expect(restored.z).toBeCloseTo(-13, 1);
  await expect(page.getByTestId('world-observation')).toHaveCount(0);
  await page.reload();
  await ready(page);
  expect(await position(page)).toEqual(restored);
  await expect(page.getByTestId('world-observation')).toHaveCount(0);
  await fits(page);
});

test('人物不能穿过庭院后墙，重置能回到可行走位置', async ({ page }) => {
  await seedPosition(page, -12, -22);
  await page.goto('/#/');
  await ready(page);
  await hold(page, 'w', 1500);
  const stopped = await position(page);
  expect(stopped.z).toBeGreaterThan(-24);
  expect(stopped.z).toBeLessThan(-22);
  await hold(page, 'w', 500);
  expect((await position(page)).z).toBeCloseTo(stopped.z, 2);
  await page.getByTestId('world-pause').click();
  await page.getByTestId('world-reset').click();
  // Reset returns to the start; it is not permitted to erase old game records.
  await expect.poll(async () => (await position(page)).z).toBeCloseTo(18, 1);
  expect((await position(page)).x).toBeCloseTo(0, 1);
});

test('两段故事可手动前后切换、暂停重播与退出，世界保持冻结', async ({ page }) => {
  await seedPosition(page, -5, -6);
  await page.goto('/#/');
  await ready(page);
  await page.getByTestId('world-interact').click();
  const story = page.getByTestId('world-story');
  await expect(story).toBeVisible();
  await expect(story).toContainText('预览');
  await story.getByTestId('world-story-start').click();
  await expect(story.getByTestId('world-story-step')).toHaveAttribute('data-index', '0');
  // Losing window focus opens the global pause cover, which must own keyboard
  // focus instead of leaving Tab trapped inside the covered story dialog.
  await story.getByRole('button', { name: '暂停', exact: true }).focus();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(story).toHaveAttribute('inert', '');
  const resume = page.getByTestId('world-resume');
  await expect(resume).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('world-reset')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(resume).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(story).not.toHaveAttribute('inert', '');
  await expect(story).toBeFocused();
  await expect(story.getByTestId('world-story-step')).toHaveAttribute('data-index', '0');
  const frozen = await position(page);
  await hold(page, 'w', 350);
  expect(await position(page)).toEqual(frozen);
  await story.getByRole('button', { name: '下一段', exact: true }).click();
  await expect(story.getByTestId('world-story-step')).toHaveAttribute('data-index', '1');
  await story.getByRole('button', { name: '上一段', exact: true }).click();
  await expect(story.getByTestId('world-story-step')).toHaveAttribute('data-index', '0');
  await story.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(story.getByRole('button', { name: '继续播放', exact: true })).toBeVisible();
  await story.getByRole('button', { name: '继续播放', exact: true }).click();
  await story.getByRole('button', { name: '重播', exact: true }).click();
  await expect(story.getByTestId('world-story-step')).toHaveAttribute('data-index', '0');
  await story.getByRole('button', { name: '退出故事', exact: true }).click();
  await expect(story).toHaveCount(0);
  expect(await position(page)).toEqual(frozen);
  await hold(page, 's', 450);
  await expect.poll(async () => (await position(page)).z).toBeGreaterThan(frozen.z + .5);
  await fits(page);
});

test('WebGL2 不可用时保留重试和直接选择文化主题的入口', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl2') return null;
      return Reflect.apply(getContext, this, [type, ...args]);
    } as typeof getContext;
  });
  await page.goto('/#/');
  await expect(page.getByTestId('world-error')).toBeVisible({ timeout: readyTimeout });
  await expect(page.getByTestId('world-retry')).toBeVisible();
  const direct = page.getByRole('link', { name: '直接选择文化主题', exact: true }).first();
  await expect(direct).toHaveAttribute('href', '#/themes');
  await direct.click();
  await expect(page.locator('.theme-patterns')).toBeVisible();
  await expect(page.getByTestId('world-host')).toHaveCount(0);
});

test('竖屏暂停世界，回到横屏须主动继续且保持位置', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/#/');
  await ready(page);
  await hold(page, 'w', 500);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('world-rotate')).toBeVisible();
  const paused = await position(page);
  await hold(page, 'w', 350);
  expect(await position(page)).toEqual(paused);
  await fits(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('world-rotate')).toHaveCount(0);
  await expect(page.getByTestId('world-resume')).toBeVisible();
  expect(await position(page)).toEqual(paused);
  await page.getByTestId('world-resume').click();
  await hold(page, 'w', 450);
  await expect.poll(async () => (await position(page)).z).toBeLessThan(paused.z - .5);
  await fits(page);
});
