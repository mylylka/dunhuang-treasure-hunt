import { chromium, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const baseUrl = 'http://localhost:4186';
const level = JSON.parse(await readFile(new URL('../src/content/levels/patterns-intro.json', import.meta.url), 'utf8'));
let server;
let browser;
async function isReady() {
  try { const response = await fetch(`${baseUrl}/__dunhuang_preview__`); return response.ok && (await response.json()).app === 'dunhuang-treasure'; }
  catch { return false; }
}
try {
  if (!await isReady()) {
    server = spawn(process.execPath, [new URL('./serve-preview.mjs', import.meta.url).pathname, '--no-open'], { stdio: 'pipe' });
    for (let i = 0; i < 60 && !await isReady(); i++) await new Promise(resolve => setTimeout(resolve, 100));
    if (!await isReady()) throw new Error('生产预览服务未能启动');
  }
  browser = await chromium.launch({ channel: process.platform === 'darwin' ? 'chrome' : undefined, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().includes('/assets/')) errors.push(`${response.status()} ${response.url()}`); });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  async function verifyCssImage(selector, property, pseudo = null) {
    const value = await page.$eval(selector, (element, { property, pseudo }) => getComputedStyle(element, pseudo).getPropertyValue(property), { property, pseudo });
    const url = value.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    if (!url || !/^https?:/.test(url)) throw new Error(`素材样式没有生成绝对网址：${selector} ${property} = ${value}`);
    const status = await page.evaluate(async url => (await fetch(url)).status, url);
    if (status !== 200) throw new Error(`构建素材不可用：${url} (${status})`);
  }

  async function verifyScreen(label) {
    await expect.poll(() => page.evaluate(() => ({
      width: document.documentElement.scrollWidth - innerWidth,
      height: document.documentElement.scrollHeight - innerHeight,
    })), { message: `${label} 不应产生页面滚动` }).toEqual({ width: 0, height: 0 });
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 600);
    if (await page.evaluate(() => scrollY) !== before) throw new Error(`${label} 随滚轮移动了整个页面`);
  }

  async function verifyGameFits() {
    const host = page.getByTestId('phaser-player');
    await expect.poll(async () => {
      const geometry = await host.evaluate(element => {
        const canvas = element.querySelector('canvas');
        if (!canvas || !element.dataset.layout) return false;
        const layout = JSON.parse(element.dataset.layout);
        const bounds = canvas.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.x >= 0 && bounds.y >= 0 &&
          bounds.right <= innerWidth + 1 && bounds.bottom <= innerHeight + 1 &&
          [layout.reference, layout.edited].every(image => image.width > 0 && image.height > 0 &&
            image.x >= 0 && image.y >= 0 && image.x + image.width <= bounds.width + 1 &&
            image.y + image.height <= bounds.height + 1 && Math.abs(image.width / image.height - 1.5) < 0.001);
      });
      return geometry;
    }, { message: '两张完整图片应在当前视口内等比显示' }).toBe(true);
    for (const name of ['给我提示', '重新开始']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeInViewport({ ratio: 1 });
    }
    await expect(page.getByTestId('hint-status')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('game-progress')).toBeInViewport({ ratio: 1 });
    await verifyScreen('游玩屏幕');
  }

  await page.goto(baseUrl);
  await expect(page.locator('.theme-row')).toHaveCount(3);
  await verifyCssImage('.app-shell', 'background-image', '::before');
  await verifyScreen('首页');
  await page.screenshot({ path: 'outputs/试玩首页.png', fullPage: true, animations: 'disabled' });
  await page.goto(`${baseUrl}/#/theme/patterns`);
  await verifyCssImage('.button-primary', 'border-image-source');
  await verifyScreen('选关屏幕');
  await page.goto(`${baseUrl}/#/play/patterns-intro`);
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled();
  await verifyCssImage('.game-stage', 'border-image-source');
  await verifyCssImage('.button-secondary', 'border-image-source');
  await verifyGameFits();
  await page.screenshot({ path: 'outputs/首关占位预览.png', fullPage: true, animations: 'disabled' });

  async function hit(index, side) {
    const host = page.getByTestId('phaser-player');
    const layout = JSON.parse(await host.getAttribute('data-layout'));
    const image = layout[side], region = level.differences[index].region;
    await host.locator('canvas').click({ position: { x: image.x + (region.x + region.width / 2) * image.width, y: image.y + (region.y + region.height / 2) * image.height } });
  }
  await hit(0, 'reference');
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 1 处，共 3 处');
  await page.setViewportSize({ width: 360, height: 780 });
  await expect.poll(async () => JSON.parse(await page.getByTestId('phaser-player').getAttribute('data-layout')).stacked).toBe(true);
  await verifyCssImage('.app-shell', 'background-image', '::before');
  await hit(0, 'edited');
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 1 处，共 3 处');
  await verifyGameFits();
  await page.screenshot({ path: 'outputs/手机占位预览.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => JSON.parse(await page.getByTestId('phaser-player').getAttribute('data-layout')).stacked).toBe(false);
  await verifyGameFits();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 1 处，共 3 处');
  await page.screenshot({ path: 'outputs/手机横屏占位预览.png', fullPage: true, animations: 'disabled' });
  await hit(1, 'edited');
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 2 处，共 3 处');
  await hit(2, 'reference');
  await expect(page).toHaveURL(/result\/patterns-intro$/);
  await verifyScreen('结果屏幕');
  await expect(page.getByRole('button', { name: '再观察一次' })).toBeInViewport({ ratio: 1 });
  await page.reload();
  await expect(page.getByText('完成记录已保存在当前浏览器')).toBeVisible();
  for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const route of ['/', '/theme/patterns', '/theme/music', '/help', '/settings']) {
      await page.goto(`${baseUrl}/#${route}`);
      await verifyScreen(`${viewport.width}×${viewport.height} ${route}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('生产构建验证通过：素材实际加载，各页无页面滚动，1440→360→844横竖屏完整适配、按钮与提示常驻、真实点击与状态保留、完成与刷新保存。');
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
