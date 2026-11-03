import { expect, test, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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

async function walkTo(page: Page, target: { x: number; z: number }) {
  let pressed = new Set<string>();
  const deadline = Date.now() + 15_000;
  try {
    while (Date.now() < deadline) {
      const p = await position(page), dx = target.x - p.x, dz = target.z - p.z;
      if (Math.hypot(dx, dz) < .45) return;
      const next = new Set<string>();
      if (Math.abs(dx) > .22) next.add(dx > 0 ? 'd' : 'a');
      if (Math.abs(dz) > .22) next.add(dz > 0 ? 's' : 'w');
      for (const key of pressed) if (!next.has(key)) await page.keyboard.up(key);
      for (const key of next) if (!pressed.has(key)) await page.keyboard.down(key);
      pressed = next;
      await page.waitForTimeout(90);
    }
    throw new Error(`Walking to ${JSON.stringify(target)} stopped at ${JSON.stringify(await position(page))}`);
  } finally { for (const key of pressed) await page.keyboard.up(key); }
}

test('沿道路从出生点转入真实院门并走到藻井，不从围墙穿行', async ({ page }, testInfo) => {
  await page.goto('/#/'); await ready(page);
  for (const [x, z] of [[0, 12], [-1.9, 9.8], [-6, 9], [-10.1, 8.2], [-12, 6]]) await walkTo(page, { x, z });
  await page.screenshot({ path: `work/world/art-sample-v002-road-gate-${testInfo.project.name}.png` });
  await walkTo(page, { x: -12, z: 1 });
  await expect(page.getByTestId('world-location')).toHaveText('纹彩院');
  await walkTo(page, { x: -12, z: -17 });
  await expect(page.getByTestId('world-interact')).toHaveText(/抬头看看/);
  await expect(page.getByTestId('world-location')).toHaveText('藻井观赏厅');
});

for (const edge of [{ name: 'east', x: 30, z: 25.5, key: 'd', limit: 34.31 }, { name: 'west', x: -29, z: 27, key: 'a', limit: -32.31 }]) {
  test(`沙丘${edge.name}旧穿模点可行走，边界限制与转镜头保持有效`, async ({ page }, testInfo) => {
    await seedPosition(page, edge.x, edge.z);
    await page.goto('/#/'); await ready(page);
    await hold(page, edge.key, 2200);
    const reached = await position(page);
    expect(reached.x).toBeCloseTo(edge.limit, 0);
    expect(reached.z).toBeCloseTo(edge.z, 2);
    await hold(page, edge.key, 500);
    expect(await position(page)).toEqual(reached);
    await hold(page, 'q', 1900);
    await page.screenshot({ path: `work/world/art-sample-v002-dune-${edge.name}-left-${testInfo.project.name}.png` });
    await hold(page, 'e', 3500);
    await page.screenshot({ path: `work/world/art-sample-v002-dune-${edge.name}-right-${testInfo.project.name}.png` });
    expect(await position(page)).toEqual(reached);
    await fits(page);
  });
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
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'follow');
  await page.getByTestId('world-interact').click();
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'caisson');
  await expect(page.locator('.world-subtitle')).toHaveCount(0);
  const still = await position(page);
  await hold(page, 'w', 350);
  expect(await position(page)).toEqual(still);
  await expect(page.getByTestId('world-culture-choice')).toBeVisible();
  await expect(page.getByTestId('world-culture-choice').getByRole('button')).toHaveCount(2);
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
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'follow');
  await page.reload();
  await ready(page);
  expect(await position(page)).toEqual(restored);
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'follow');
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

test('五段故事自动展开，可跳段、暂停重播与退出，世界保持冻结', async ({ page }) => {
  await seedPosition(page, -5.3, -5.8);
  await page.goto('/#/');
  await ready(page);
  await page.getByTestId('world-interact').click();
  const story = page.getByTestId('world-story');
  await expect(story).toBeVisible();
  await expect(story).toHaveAttribute('data-phase', 'narration');
  await page.waitForFunction(()=>Number(document.querySelector<HTMLAudioElement>('[data-testid="story-audio"]')?.currentTime)>.1);
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
  await story.getByRole('button', { name: '跳过本段', exact: true }).click();
  await expect(story.getByTestId('world-story-step')).toHaveAttribute('data-index', '1');

  await story.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(story.getByRole('button', { name: '继续播放', exact: true })).toBeVisible();
  await story.getByRole('button', { name: '继续播放', exact: true }).click();
  await story.getByRole('button', { name: '重播', exact: true }).click();
  await expect(story.getByTestId('world-story-step')).toHaveAttribute('data-index', '1');
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

test('正式模型加载失败可重试，恢复后显示完整样片', async ({ page }) => {
  const model = '**/assets/world/courtyard/v002/courtyard.glb';
  await page.route(model, route => route.abort());
  await page.goto('/#/');
  await expect(page.getByTestId('world-error')).toBeVisible({ timeout: readyTimeout });
  await expect(page.getByTestId('world-retry')).toBeVisible();
  await expect(page.getByRole('link', { name: '直接选择文化主题', exact: true }).first()).toHaveAttribute('href', '#/themes');
  await page.unroute(model);
  await page.getByTestId('world-retry').click();
  await ready(page);
  await expect(page.getByText('美术样片 · 待确认', { exact: true })).toBeVisible();
  await hold(page, 'w', 450);
  expect((await position(page)).z).toBeLessThan(17.5);
});

test('模型尚在加载时离开，晚到的资源不会复活世界', async ({ page }) => {
  const modelBody = await readFile('public/assets/world/courtyard/v002/courtyard.glb');
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let intercepted!: () => void;
  const requested = new Promise<void>(resolve => { intercepted = resolve; });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/world/courtyard/v002/courtyard.glb', async route => {
    intercepted();
    await pending;
    await route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: modelBody });
  }, { times: 1 });
  await page.goto('/#/');
  await requested;
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'false');
  await page.getByRole('link', { name: '直接选择文化主题', exact: true }).first().click();
  await expect(page.getByTestId('theme-choice-grid')).toBeVisible();
  release();
  await page.waitForTimeout(500);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.getByTestId('world-return').click();
  await ready(page);
  await fits(page);
});

test('一个模型失败时不被另一个挂起请求阻塞', async ({ page }) => {
  let held: Route | undefined;
  await page.route('**/assets/world/courtyard/v002/courtyard.glb', route => { held = route; });
  await page.route('**/assets/world/shared/v001/traveler.glb', route => route.abort());
  await page.goto('/#/');
  await expect(page.getByTestId('world-error')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('world-retry')).toBeVisible();
  await held?.abort();
  await page.getByRole('link', { name: '直接选择文化主题', exact: true }).first().click();
  await expect(page.getByTestId('theme-choice-grid')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
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
