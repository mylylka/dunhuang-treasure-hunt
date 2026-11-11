import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ColoringLevel } from '../../src/types';

test.use({ viewport: { width: 852, height: 330 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
test.setTimeout(60_000);
const level = JSON.parse(readFileSync('src/content/levels/coloring-grape-pomegranate.json', 'utf8')) as ColoringLevel;
const palette = (page: Page) => page.getByTestId('floating-color-palette');
const host = (page: Page) => page.getByTestId('phaser-player');
const saved = (page: Page) => page.evaluate(() => localStorage.getItem('dunhuang:artworks:v2'));

async function start(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/#/play/${level.id}`);
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: 45_000 });
  await page.getByRole('button', { name: '完整色盘', exact: true }).click();
  await expect(palette(page)).toBeInViewport({ ratio: .999 });
}
async function withinViewport(page: Page) {
  await expect(palette(page)).toBeInViewport({ ratio: .999 });
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY,
    w: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
    h: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - innerHeight,
  }))).toEqual({ x: 0, y: 0, w: 0, h: 0 });
}
async function initialPosition(page: Page) {
  const p = (await palette(page).boundingBox())!, canvas = (await host(page).boundingBox())!;
  const side = (await page.locator('.coloring-reference-aside').boundingBox())!;
  expect(p.x).toBeGreaterThanOrEqual(canvas.x + canvas.width);
  expect(p.x).toBeGreaterThanOrEqual(side.x);
  await withinViewport(page);
}
async function movePalette(page: Page, to: { x: number; y: number }) {
  const box = (await palette(page).getByRole('button', { name: '拖动完整色盘', exact: true }).boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  if (page.context().browser()?.browserType().name() === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    const finger = (x: number, y: number) => [{ id: 0, x, y, radiusX: 2, radiusY: 2, force: 1 }];
    try {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: finger(from.x, from.y) });
      for (let step = 1; step <= 6; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove',
        touchPoints: finger(from.x + (to.x - from.x) * step / 6, from.y + (to.y - from.y) * step / 6) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally { await cdp.detach(); }
  } else {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 }); await page.mouse.up();
  }
}

test('完整色盘初始只覆盖右两栏，12纯色金银和彩虹自由色完整显示且没有模态遮罩', async ({ page }) => {
  await start(page); await initialPosition(page);
  await expect(palette(page)).toHaveAttribute('aria-modal', 'false');
  await expect(page.locator('.coloring-studio')).not.toHaveAttribute('inert', '');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  const colors = palette(page).getByRole('button', { name: /^选择/ });
  await expect(colors).toHaveCount(14);
  for (const color of await colors.all()) {
    await expect(color).toBeInViewport({ ratio: .999 });
    const rect = (await color.boundingBox())!; expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44);
    // The internal colour grid must not clip the last row.
    const frame = (await palette(page).boundingBox())!; expect(rect.y + rect.height).toBeLessThanOrEqual(frame.y + frame.height);
  }
  const wheel = palette(page).locator('.coloring-free-color-rainbow');
  await expect(wheel).toBeInViewport({ ratio: .999 });
  const rect = (await wheel.boundingBox())!; expect(rect.width).toBe(44); expect(rect.height).toBe(44);
  await expect(wheel).toHaveCSS('border-radius', '50%');
  expect(await wheel.evaluate(n => getComputedStyle(n).backgroundImage)).toContain('conic-gradient');
  expect(await palette(page).evaluate(n => getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({ path: `outputs/完整色盘-初始右侧-${test.info().project.name}.png`, scale: 'css' });
});

test('色盘可拖到画布上方且不误着色，露出画布仍可填色，重开与转屏后位置合法', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page); const before = await saved(page), initial = (await palette(page).boundingBox())!;
  await movePalette(page, { x: 110, y: 55 }); await withinViewport(page);
  let floating = (await palette(page).boundingBox())!, canvas = (await host(page).boundingBox())!;
  expect(floating.x).toBeLessThan(canvas.x + canvas.width);
  expect(floating.x).toBeLessThan(initial.x - 100);
  expect(await saved(page)).toBe(before);
  const custom = '#9f528a';
  await palette(page).locator('input[type=color]').fill(custom);
  await expect(palette(page)).toBeVisible();
  const layout = JSON.parse((await host(page).getAttribute('data-layout'))!);
  const candidates = level.regions.map(region => ({ region, point: {
    x: layout.image.x + region.point.x * layout.image.width,
    y: layout.image.y + region.point.y * layout.image.height,
  } })).filter(({ point }) => {
    const x = canvas.x + point.x, y = canvas.y + point.y;
    return x < floating.x - 4 || x > floating.x + floating.width + 4 || y < floating.y - 4 || y > floating.y + floating.height + 4;
  }).sort((a, b) => b.region.pixelCount - a.region.pixelCount);
  expect(candidates.length).toBeGreaterThan(0);
  const chosen = candidates[0];
  await host(page).locator('canvas').tap({ position: chosen.point });
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
  const colors = await page.evaluate(({ id, version }) => JSON.parse(localStorage.getItem('dunhuang:artworks:v2')!).artworks[id][version].colors,
    { id: level.id, version: level.artworkVersion });
  expect(colors).toEqual({ [chosen.region.id]: custom });
  await page.screenshot({ path: `outputs/完整色盘-拖动后继续填色-${test.info().project.name}.png`, scale: 'css' });
  const handle = palette(page).getByRole('button', { name: '拖动完整色盘', exact: true });
  await handle.focus(); const x = floating.x; await handle.press('ArrowRight');
  expect((await palette(page).boundingBox())!.x).toBeCloseTo(x + 10, 1);
  await handle.press('Home'); await initialPosition(page);
  await movePalette(page, { x: 10, y: 10 }); await withinViewport(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
  await page.setViewportSize({ width: 640, height: 300 });
  await expect(page.getByTestId('mobile-landscape-gate')).toBeHidden(); await withinViewport(page);
  await palette(page).getByRole('button', { name: '关闭完整色盘', exact: true }).click();
  await page.getByRole('button', { name: '完整色盘', exact: true }).click(); await initialPosition(page);
  await palette(page).getByRole('button', { name: '拖动完整色盘', exact: true }).press('Escape');
  await expect(palette(page)).toHaveCount(0); expect(errors).toEqual([]);
});
