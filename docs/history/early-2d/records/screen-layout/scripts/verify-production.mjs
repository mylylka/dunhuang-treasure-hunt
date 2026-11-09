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

  await page.goto(baseUrl);
  await expect(page.locator('.theme-row')).toHaveCount(3);
  await verifyCssImage('.app-shell', 'background-image', '::before');
  await page.screenshot({ path: 'outputs/试玩首页.png', fullPage: true, animations: 'disabled' });
  await page.goto(`${baseUrl}/#/theme/patterns`);
  await verifyCssImage('.button-primary', 'border-image-source');
  await page.goto(`${baseUrl}/#/play/patterns-intro`);
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled();
  await verifyCssImage('.game-stage', 'border-image-source');
  await verifyCssImage('.button-secondary', 'border-image-source');
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
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('360px 宽度出现横向溢出');
  await page.screenshot({ path: 'outputs/手机占位预览.png', fullPage: true, animations: 'disabled' });
  await hit(1, 'edited');
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 2 处，共 3 处');
  await hit(2, 'reference');
  await expect(page).toHaveURL(/result\/patterns-intro$/);
  await page.reload();
  await expect(page.getByText('完成记录已保存在当前浏览器')).toBeVisible();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('生产构建验证通过：背景/面板/按钮全部实际加载，三主题、真实点击、1440→360布局切换保持状态、无横向溢出、完成与刷新保存。');
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
