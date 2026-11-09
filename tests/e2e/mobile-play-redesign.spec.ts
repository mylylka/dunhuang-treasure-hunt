import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ColoringLevel, SpotDifferenceLevel } from '../../src/types';
import type { Point, Rectangle } from '../../src/runtime/geometry';

// CDP sends genuine multi-touch input; it exercises pointer capture and browser gesture prevention.
test.use({ browserName: 'chromium', channel: process.platform === 'darwin' ? 'chrome' : undefined,
  viewport: { width: 852, height: 330 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
test.setTimeout(60_000);
const spot = JSON.parse(readFileSync('src/content/levels/patterns-lotus.json', 'utf8')) as SpotDifferenceLevel;
const paint = JSON.parse(readFileSync('src/content/levels/coloring-grape-pomegranate.json', 'utf8')) as ColoringLevel;
const host = (page: Page) => page.getByTestId('phaser-player');
const layout = async (page: Page) => JSON.parse((await host(page).getAttribute('data-layout'))!);
const center = (r: Rectangle): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

async function ready(page: Page, id: string, button: string) {
  await page.goto(`/#/play/${id}`);
  await expect(page.getByRole('button', { name: button, exact: true })).toBeEnabled({ timeout: 45_000 });
  await expect(host(page)).toHaveAttribute('data-render-pixel-ratio', '2');
  await expect.poll(async () => { const b = await host(page).boundingBox(), l = await layout(page);
    return Boolean(b && l.width === Math.floor(b.width) && l.height === Math.floor(b.height)); }).toBe(true);
  await expect(page.getByRole('button', { name: /^更多(?:操作)?$/ })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: /^(更多操作|填色操作)$/ })).toHaveCount(0);
}
async function expectNavigation(page: Page, previous: string | null, next: string | null) {
  for (const { testId, label, id } of [
    { testId: 'level-previous', label: '上一关', id: previous },
    { testId: 'level-advance', label: '下一关', id: next },
  ]) {
    const action = page.getByTestId(testId);
    await expect(action).toHaveText(label);
    await expect(action).toBeInViewport({ ratio: .999 });
    const bounds = (await action.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
    if (id) await expect(action).toHaveAttribute('href', `#/play/${id}`);
    else {
      await expect(action).toBeDisabled();
      expect(await action.getAttribute('href')).toBeNull();
    }
  }
}
async function pinch(page: Page, point: Point, scale: number) {
  const rect = (await host(page).locator('canvas').boundingBox())!;
  const x = rect.x + point.x, y = rect.y + point.y;
  const session = await page.context().newCDPSession(page);
  const fingers = (d: number) => [
    { x: x - d, y, id: 0, radiusX: 2, radiusY: 2, force: 1 },
    { x: x + d, y, id: 1, radiusX: 2, radiusY: 2, force: 1 },
  ];
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(25) });
    for (let i = 1; i <= 6; i++) await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: fingers(25 * (1 + (scale - 1) * i / 6)),
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
}
async function drag(page: Page, point: Point, delta: Point) {
  const rect = (await host(page).locator('canvas').boundingBox())!;
  await page.mouse.move(rect.x + point.x, rect.y + point.y); await page.mouse.down();
  await page.mouse.move(rect.x + point.x + delta.x, rect.y + point.y + delta.y, { steps: 5 }); await page.mouse.up();
}
async function fitted(page: Page) {
  await expect(host(page).locator('canvas')).toBeInViewport({ ratio: .999 });
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY,
    horizontal: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
    vertical: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - innerHeight,
  }))).toEqual({ x: 0, y: 0, horizontal: 0, vertical: 0 });
}
function synchronized(l: any) {
  expect(l.renderedReference.width / l.reference.width).toBeCloseTo(l.view.zoom, 6);
  expect(l.renderedEdited.width / l.edited.width).toBeCloseTo(l.view.zoom, 6);
  expect((l.reference.x - l.renderedReference.x) / l.renderedReference.width)
    .toBeCloseTo((l.edited.x - l.renderedEdited.x) / l.renderedEdited.width, 6);
  expect((l.reference.y - l.renderedReference.y) / l.renderedReference.height)
    .toBeCloseTo((l.edited.y - l.renderedEdited.y) / l.renderedEdited.height, 6);
}

test('找不同左右真实双指连续同步缩放，拖动和竖屏中断不误找，放大后仍能命中', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await ready(page, spot.id, '给我提示');
  await expectNavigation(page, 'patterns-intro', 'patterns-scrolls');
  let l = await layout(page); expect(l.reference.height).toBeGreaterThan(280);
  for (const button of await page.locator('.spot-controls button:visible').all()) {
    const b = (await button.boundingBox())!; expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await pinch(page, center(l.reference), 1.7);
  await expect.poll(async () => (await layout(page)).view.zoom).toBeCloseTo(1.7, 1);
  l = await layout(page); synchronized(l);
  await pinch(page, center(l.edited), .8);
  await expect.poll(async () => (await layout(page)).view.zoom).toBeCloseTo(1.36, 1);
  l = await layout(page); synchronized(l);
  await drag(page, center(l.edited), { x: 24, y: 14 });
  const view = (await layout(page)).view; expect(view.center.x).toBeLessThan(.5);
  synchronized(await layout(page));
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 0 处，共 5 处');
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
  await page.setViewportSize({ width: 852, height: 330 });
  await expect(page.getByTestId('mobile-landscape-gate')).toBeHidden();
  await expect.poll(async () => (await layout(page)).view).toEqual(view);
  l = await layout(page);
  const difference = spot.differences[1].region, r = l.renderedEdited;
  const point = { x: r.x + (difference.x + difference.width / 2) * r.width,
    y: r.y + (difference.y + difference.height / 2) * r.height };
  expect(point.x).toBeGreaterThan(l.edited.x); expect(point.x).toBeLessThan(l.edited.x + l.edited.width);
  await host(page).locator('canvas').tap({ position: point });
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 1 处，共 5 处');
  await fitted(page); expect(errors).toEqual([]);
  await page.screenshot({ path: 'outputs/手机横屏-正式找不同.png', scale: 'css' });
});

test('填色双指连续缩放不着色，三档按钮保留，高清画布点选/撤销和窗口变化保局', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page, paint.id, '1×');
  await expectNavigation(page, 'coloring-grape-lotus', 'coloring-lotus-camellia');
  const stored = () => page.evaluate(() => localStorage.getItem('dunhuang:artworks:v2'));
  let l = await layout(page); expect(l.image.height).toBeGreaterThan(280);
  for (const name of ['1×', '2×', '3×', '撤销', '清空重涂', '完成作品', '参考配色', '完整色盘']) {
    const b = page.getByRole('button', { name, exact: true }); await expect(b).toBeInViewport({ ratio: .999 });
    const rect = (await b.boundingBox())!; expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  const before = await stored();
  await pinch(page, center(l.image), 1.6);
  await expect.poll(async () => (await layout(page)).zoom).toBeCloseTo(1.6, 1);
  await drag(page, center(l.image), { x: 30, y: 16 });
  expect(await stored()).toEqual(before);
  for (const value of [3, 2, 1]) {
    await page.getByRole('button', { name: `${value}×`, exact: true }).click();
    await expect.poll(async () => (await layout(page)).zoom).toBe(value);
  }
  l = await layout(page);
  const region = [...paint.regions].sort((a, b) => b.pixelCount - a.pixelCount)[0];
  await host(page).locator('canvas').tap({ position: {
    x: l.image.x + region.point.x * l.image.width, y: l.image.y + region.point.y * l.image.height,
  } });
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
  const saved = await stored();
  await page.getByRole('button', { name: '2×', exact: true }).click();
  await pinch(page, center((await layout(page)).image), .8);
  const zoom = (await layout(page)).zoom;
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
  await page.setViewportSize({ width: 640, height: 300 });
  await expect(page.getByTestId('mobile-landscape-gate')).toBeHidden();
  await expect.poll(async () => (await layout(page)).zoom).toBeCloseTo(zoom, 6);
  expect(await stored()).toEqual(saved); await fitted(page);
  await expectNavigation(page, 'coloring-grape-lotus', 'coloring-lotus-camellia');
  await page.getByRole('button', { name: '1×', exact: true }).click();
  await page.screenshot({ path: 'outputs/手机横屏-正式填色.png', scale: 'css' });
  const savedColors = JSON.parse(saved!).artworks[paint.id][paint.artworkVersion].colors;
  const currentColors = async () => JSON.parse((await stored())!).artworks[paint.id][paint.artworkVersion].colors;
  await page.getByRole('button', { name: '清空重涂', exact: true }).click();
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 0 个区域');
  await expect.poll(currentColors).toEqual({});
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(currentColors).toEqual(savedColors);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 0 个区域');
  expect(await page.evaluate(({ id, version }) => {
    const artwork = JSON.parse(localStorage.getItem('dunhuang:artworks:v2')!).artworks[id][version];
    const progress = JSON.parse(localStorage.getItem('dunhuang:progress:v1') ?? '{"completed":{}}');
    return { submitted: Boolean(artwork.submittedAt), completed: Boolean(progress.completed[id]) };
  }, { id: paint.id, version: paint.artworkVersion })).toEqual({ submitted: false, completed: false });
  expect(errors).toEqual([]);
});

test('拼图大主板与碎片同屏，DPR3设备按2倍渲染仍能选片归位并滚动', async ({ page }) => {
  await ready(page, 'puzzle-three-rabbits', '拼图提示');
  await expectNavigation(page, 'puzzle-lotus-ceiling', 'puzzle-twin-dragons');
  for (const name of ['查看原图', '重新拼图']) {
    const action = page.getByRole('button', { name, exact: true });
    await expect(action).toBeInViewport({ ratio: .999 });
    const bounds = (await action.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  const l = await layout(page); expect(l.board.height).toBeGreaterThan(290);
  await page.getByRole('button', { name: '拼图提示', exact: true }).click();
  const selected = await layout(page), piece = selected.pieces[selected.selectedPieceId];
  await host(page).locator('canvas').tap({ position: center(piece.targetRect) });
  await expect(page.getByTestId('puzzle-progress')).toHaveAttribute('aria-label', '已归位 1 块，共 12 块');
  const scrollbar = page.getByTestId('puzzle-tray-scrollbar');
  await scrollbar.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect.poll(async () => (await layout(page)).trayScroll).toBeGreaterThan(0);
  await fitted(page);
  await page.screenshot({ path: 'outputs/手机横屏-正式拼图.png', scale: 'css' });
});
