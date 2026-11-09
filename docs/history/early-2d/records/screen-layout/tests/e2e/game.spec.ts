import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { SpotDifferenceLevel } from '../../src/types';

const level = JSON.parse(readFileSync('src/content/levels/patterns-intro.json', 'utf8')) as SpotDifferenceLevel;
const progressKey = 'dunhuang:progress:v1';
interface Rect { x: number; y: number; width: number; height: number }
interface Layout { width: number; height: number; stacked: boolean; reference: Rect; edited: Rect }

async function startGame(page: Page) {
  await page.goto('/#/play/patterns-intro');
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: 25000 });
  await expect(page.getByTestId('phaser-player').locator('canvas')).toBeVisible();
}

async function clickDifference(page: Page, index: number, side: 'reference' | 'edited', touch = false) {
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!) as Layout;
  const rect = layout[side];
  const region = level.differences[index].region;
  const position = {
    x: rect.x + (region.x + region.width / 2) * rect.width,
    y: rect.y + (region.y + region.height / 2) * rect.height,
  };
  if (touch) await host.locator('canvas').tap({ position });
  else await host.locator('canvas').click({ position });
}

async function completeGame(page: Page, touch = false) {
  await clickDifference(page, 0, 'reference', touch);
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 1 处，共 3 处');
  await clickDifference(page, 1, 'edited', touch);
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 2 处，共 3 处');
  await clickDifference(page, 2, 'reference', touch);
  await expect(page).toHaveURL(/#\/result\/patterns-intro$/);
  await expect(page.getByRole('heading', { name: '这一轮观察，完成了。' })).toBeVisible();
}

test('首页三个真实主题，未完成主题只有介绍，无空关卡', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '选择一段探索' })).toBeVisible();
  await expect(page.locator('.theme-row')).toHaveCount(3);
  await page.locator('.theme-music').click();
  await expect(page.getByRole('heading', { level: 1, name: '飞天、乐舞与服饰' })).toBeVisible();
  await expect(page.getByText('新的线索，还在整理中。')).toBeVisible();
  await expect(page.getByRole('link', { name: /^开始观察/ })).toHaveCount(0);
  await page.goto('/#/theme/stories');
  await expect(page.locator('.game-type-list span')).toHaveText(['线索找物', '故事拼图']);
  expect(errors).toEqual([]);
});

test('真实画布点击、无限提示、重开、完成与刷新保存', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().includes('/assets/')) errors.push(`素材请求失败：${response.status()} ${response.url()}`); });
  const touch = testInfo.project.name === 'mobile-chromium';
  await startGame(page);
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!) as Layout;
  expect(layout.stacked).toBe(testInfo.project.name === 'mobile-chromium');
  expect(Math.abs(layout.reference.width / layout.reference.height - 1.5)).toBeLessThan(0.001);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await host.locator('canvas').click({ position: { x: 2, y: 2 } });
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 0 处，共 3 处');
  await page.getByRole('button', { name: '给我提示' }).click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].hint);
  await page.getByRole('button', { name: '给我提示' }).click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].detailHint);
  await clickDifference(page, 0, 'edited', touch);
  await clickDifference(page, 0, 'reference', touch);
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 1 处，共 3 处');
  await page.getByRole('button', { name: '重新开始' }).click();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 0 处，共 3 处');
  await completeGame(page, touch);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(Object.keys(stored.completed)).toEqual(['patterns-intro']);
  const completedAt = stored.completed['patterns-intro'];
  await page.reload();
  await expect(page.getByText('完成记录已保存在当前浏览器')).toBeVisible();
  await page.getByRole('button', { name: '再观察一次' }).click();
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 0 处，共 3 处');
  const afterReplay = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(afterReplay.completed['patterns-intro']).toBe(completedAt);
  await page.goto('/#/theme/patterns');
  await expect(page.locator('.completed-label')).toContainText('已完成');
  expect(errors).toEqual([]);
});

test('中途退出与多次进入不残留局内发现状态', async ({ page }) => {
  await startGame(page); await clickDifference(page, 0, 'reference');
  await page.getByRole('link', { name: '纹样与色彩', exact: true }).click();
  await page.getByRole('link', { name: /^开始观察/ }).click();
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 0 处，共 3 处');
  await completeGame(page);
  expect(await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).completed).length, progressKey)).toBe(1);
});

test('存档失败如实反馈，恢复后重试成功', async ({ page }) => {
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    (window as unknown as { __originalStorageSetter: typeof original }).__originalStorageSetter = original;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('测试模拟不可写', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, progressKey);
  await startGame(page); await completeGame(page);
  await expect(page.getByTestId('save-error')).toBeVisible();
  await expect(page.getByText('完成记录已保存在当前浏览器')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { __originalStorageSetter: typeof Storage.prototype.setItem }).__originalStorageSetter; });
  await page.getByTestId('retry-save').click();
  await expect(page.getByTestId('save-error')).toHaveCount(0);
  await expect(page.getByText('完成记录已保存在当前浏览器')).toBeVisible();
});

test('图片加载失败可重试，恢复后不必刷新页面', async ({ page }) => {
  await page.route('**/patterns-intro-b.svg*', route => route.abort());
  await page.goto('/#/play/patterns-intro');
  await expect(page.getByRole('button', { name: '重新加载画面' })).toBeVisible({ timeout: 25000 });
  await page.unroute('**/patterns-intro-b.svg*');
  await page.getByRole('button', { name: '重新加载画面' }).click();
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: 25000 });
  await completeGame(page);
});

test('减少动效设置保存，结果页不能凭地址伪造完成', async ({ page }) => {
  await page.goto('/#/result/patterns-intro');
  await expect(page.getByRole('heading', { name: '先完成活动，再回看发现' })).toBeVisible();
  await page.goto('/#/settings');
  await page.getByRole('checkbox', { name: '减少动效' }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '减少动效' })).toBeChecked();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-reduced-motion', 'true');
});

test('隔离的两处差异配置生效，B的区域外像素不进入游戏', async ({ page }) => {
  const testId = 'test-two-differences';
  const two = { ...level, id: testId, title: '测试配置：两处变化', differences: level.differences.slice(0, 2) };
  const themes = JSON.parse(readFileSync('src/content/themes.json', 'utf8')) as { id: string; introLevelId: string | null }[];
  themes.find(theme => theme.id === 'patterns')!.introLevelId = testId;
  // Only this isolated browser context sees the fixture. The formal catalog stays untouched.
  await page.route('**/src/content/levels/patterns-intro.json*', route => route.fulfill({ contentType: 'application/javascript', body: `export default ${JSON.stringify(two)};` }));
  await page.route('**/src/content/themes.json*', route => route.fulfill({ contentType: 'application/javascript', body: `export default ${JSON.stringify(themes)};` }));
  // A deliberately invalid full-frame edit makes accidental exposure outside the crop obvious.
  await page.route('**/patterns-intro-b.svg*', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#ff00ff"/></svg>' }));
  await page.goto(`/#/play/${testId}`);
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: 25000 });
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 0 处，共 2 处');
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!) as Layout;
  const samples = [0, 1, 2].map(index => {
    const region = level.differences[index].region;
    return { x: layout.edited.x + (region.x + region.width / 2) * layout.edited.width, y: layout.edited.y + (region.y + region.height / 2) * layout.edited.height };
  });
  const screenshot = await host.locator('canvas').screenshot({ scale: 'css', animations: 'disabled' });
  const pixels = await page.evaluate(async ({ png, points }) => {
    const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    return points.map(point => [...context.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data]);
  }, { png: screenshot.toString('base64'), points: samples });
  expect(pixels[0].slice(0, 3)).toEqual([255, 0, 255]);
  expect(pixels[1].slice(0, 3)).toEqual([255, 0, 255]);
  expect(pixels[2].slice(0, 3)).not.toEqual([255, 0, 255]);
  await clickDifference(page, 0, 'reference');
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 1 处，共 2 处');
  await clickDifference(page, 1, 'edited');
  await expect(page).toHaveURL(new RegExp(`#/result/${testId}$`));
  const completed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey);
  expect(Object.keys(completed)).toEqual([testId]);
});
