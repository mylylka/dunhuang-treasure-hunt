import { chromium, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const baseUrl = 'http://localhost:4186';
const level = JSON.parse(await readFile(new URL('../src/content/levels/patterns-intro.json', import.meta.url), 'utf8'));
const assets = JSON.parse(await readFile(new URL('../src/content/assets.json', import.meta.url), 'utf8'));
const progressLabel = found => `已找到 ${found} 处，共 ${level.differences.length} 处`;
const imageLoadTimeout = 45_000;
const progressKey = 'dunhuang:progress:v1';
const learningKey = 'dunhuang:learning:v1';
const gamesUrl = `${baseUrl}/#/theme/patterns/games`;
const levelsUrl = `${gamesUrl}/spot-difference`;
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
  for (const asset of assets) {
    const response = await fetch(new URL(asset.path.replace(/^\//, ''), `${baseUrl}/`));
    if (!response.ok) throw new Error(`构建素材不可用：${asset.id} ${asset.path} (${response.status})`);
    await response.arrayBuffer();
  }

  async function verifyCssImage(selector, property, pseudo = null) {
    const value = await page.$eval(selector, (element, { property, pseudo }) => getComputedStyle(element, pseudo).getPropertyValue(property), { property, pseudo });
    const url = value.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    if (!url || !/^https?:/.test(url)) throw new Error(`素材样式没有生成绝对网址：${selector} ${property} = ${value}`);
    const status = await page.evaluate(async url => (await fetch(url)).status, url);
    if (status !== 200) throw new Error(`构建素材不可用：${url} (${status})`);
  }

  async function waitForRenderedMedia() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      const visible = element => {
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.right > 0 && bounds.bottom > 0
          && bounds.left < innerWidth && bounds.top < innerHeight && getComputedStyle(element).visibility !== 'hidden';
      };
      const urls = new Set();
      const htmlImages = [...document.images].filter(visible);
      await Promise.all(htmlImages.map(async image => {
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error(`图片尚未解码：${image.currentSrc || image.src}`);
      }));
      // SVG <image> has no HTMLImageElement.complete/naturalWidth fields. Decode
      // its exact href separately, then allow the SVG compositor two frames.
      for (const image of document.querySelectorAll('svg image')) {
        if (visible(image)) urls.add(new URL(image.href.baseVal, document.baseURI).href);
      }
      const addCssUrls = style => {
        for (const property of ['background-image', 'border-image-source']) {
          for (const match of style.getPropertyValue(property).matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
            urls.add(new URL(match[1], document.baseURI).href);
          }
        }
      };
      for (const element of document.querySelectorAll('*')) {
        if (visible(element)) addCssUrls(getComputedStyle(element));
      }
      const shell = document.querySelector('.app-shell');
      if (shell) for (const pseudo of ['::before', '::after']) addCssUrls(getComputedStyle(shell, pseudo));
      await Promise.all([...urls].map(async url => {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error(`SVG或蒙皮图片尚未解码：${url}`);
      }));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
  }

  async function captureScreenshot(path) {
    await waitForRenderedMedia();
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  }

  async function verifyScreen(label) {
    await expect.poll(() => page.evaluate(() => ({
      horizontal: Math.max(0, document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      vertical: Math.max(0, document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
      x: Math.abs(scrollX), y: Math.abs(scrollY),
    })), { message: `${label} 不应产生页面滚动` }).toEqual({ horizontal: 0, vertical: 0, x: 0, y: 0 });
    await page.mouse.move(1, 1);
    await page.mouse.wheel(0, 600);
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
  }

  async function verifyVisible(locator) {
    await expect(locator).toBeVisible();
    await expect(locator).toBeInViewport({ ratio: 0.999 });
    const bounds = await locator.boundingBox();
    const size = page.viewportSize();
    expect(bounds.x).toBeGreaterThanOrEqual(-1);
    expect(bounds.y).toBeGreaterThanOrEqual(-1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width + 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height + 1);
  }

  async function verifyButtonCentered(button) {
    const label = button.locator('.button-label');
    await expect(label).toHaveCount(1);
    await expect.poll(async () => {
      const outer = await button.boundingBox(), inner = await label.boundingBox();
      return !!outer && !!inner && Math.abs(outer.x + outer.width / 2 - inner.x - inner.width / 2) <= 1
        && Math.abs(outer.y + outer.height / 2 - inner.y - inner.height / 2) <= 1;
    }, { message: '按钮正文应在装饰底图的中心' }).toBe(true);
  }

  async function verifyHomeGeometry() {
    const boxes = [];
    for (const card of await page.locator('.select-theme-card').all()) {
      await verifyVisible(card);
      const picture = await card.locator('.select-theme-picture').boundingBox();
      const image = await card.locator('.select-theme-picture > img').boundingBox();
      const title = await card.getByRole('heading', { level: 2 }).boundingBox();
      expect(Math.abs(picture.width / picture.height - 1.5)).toBeLessThan(0.001);
      expect(Math.abs(picture.width - image.width)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(picture.height - image.height)).toBeLessThanOrEqual(0.1);
      expect(title.y - picture.y - picture.height).toBeGreaterThanOrEqual(12);
      expect(title.y - picture.y - picture.height).toBeLessThanOrEqual(16);
      boxes.push(picture);
    }
    expect(boxes).toHaveLength(3);
    for (const box of boxes.slice(1)) {
      expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(box.height - boxes[0].height)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(box.y - boxes[0].y)).toBeLessThanOrEqual(0.1);
    }
  }

  async function verifyTeachingPage(index) {
    const chapters = page.getByRole('navigation', { name: '教学章节' }).getByRole('button');
    await expect(chapters.nth(index)).toHaveAttribute('aria-current', 'step');
    await verifyVisible(page.getByTestId('teaching-screen'));
    await verifyVisible(page.locator('.lesson-panel'));
    const guideLabel = page.locator('.lesson-guide-label');
    await verifyVisible(guideLabel);
    await expect(guideLabel).toHaveText('文化导览纹样与色彩');
    await expect(page.locator('.lesson-panel')).toHaveCSS('background-image', /linear-gradient/);
    await verifyCssImage('.lesson-panel', 'border-image-source');
    await verifyVisible(page.getByRole('heading', { level: 1 }));
    for (const name of ['返回主题首页', '资料', '上一页', index === 6 ? '去玩游戏' : '下一页']) {
      await verifyVisible(page.getByRole('button', { name, exact: true }));
    }
    const image = page.getByTestId('lesson-image');
    if (await image.isVisible()) {
      await verifyVisible(page.getByTestId('lesson-figure'));
      await verifyVisible(image);
      await verifyVisible(page.locator('.lesson-figure figcaption'));
      const bounds = await image.boundingBox();
      expect(bounds.width).toBeGreaterThan(35);
      expect(bounds.height).toBeGreaterThan(35);
    } else expect(index).toBe(6);
    for (const control of await page.locator('.lesson-image-tools button:visible, .lesson-panel-choices button:visible').all()) await verifyVisible(control);
    await verifyScreen(`教学第${index + 1}页`);
  }

  async function verifyTeachingSources() {
    await page.getByRole('button', { name: '资料', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '教学资料' });
    await verifyVisible(dialog);
    await verifyCssImage('.lesson-source-dialog', 'border-image-source');
    await expect(dialog.locator('.lesson-source-scroll')).toHaveCSS('overflow-y', 'auto');
    const supplements = dialog.locator('.lesson-source-figures figure');
    await expect(supplements).toHaveCount(2);
    for (const figure of await supplements.all()) {
      const image = figure.getByRole('img');
      // Center inside the permitted dialog scroller. Browser "nearest" can
      // stop at a fractional-pixel edge and leave a half-pixel clipped.
      await image.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
      await verifyVisible(image);
      const href = await figure.getByRole('link').getAttribute('href');
      expect(new URL(href).origin).toBe(new URL(baseUrl).origin);
      expect(new URL(href).pathname).toContain('/assets/lessons/patterns/lesson-user-');
      expect(await image.getAttribute('src')).toBe(href);
      await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0),
        { message: '本地补充图应通过解析后的生产网址实际载入' }).toBe(true);
      await waitForRenderedMedia();
      await verifyScreen('教学资料补充图');
    }
    const source = dialog.getByRole('link').last();
    await source.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await verifyVisible(source);
    await verifyVisible(dialog.getByRole('button', { name: '关闭教学资料', exact: true }));
    await verifyVisible(dialog.getByRole('button', { name: '返回教学', exact: true }));
    await verifyScreen('教学资料弹窗');
    await dialog.getByRole('button', { name: '关闭教学资料', exact: true }).click();
  }

  async function walkTeaching(firstVisit = false, capture = false) {
    await expect(page.getByTestId('teaching-screen')).toBeVisible();
    await expect(page.getByRole('navigation', { name: '教学章节' }).getByRole('button')).toHaveCount(7);
    for (let index = 0; index < 7; index++) {
      await verifyTeachingPage(index);
      if (index === 0) {
        await verifyTeachingSources();
        if (capture) await captureScreenshot('outputs/文化教学预览.png');
      }
      if (index < 6) {
        await page.getByRole('button', { name: '下一页', exact: true }).click();
        continue;
      }
      const finish = page.getByRole('button', { name: '去玩游戏', exact: true });
      if (firstVisit) await expect(finish).toBeDisabled();
      const questions = page.locator('.lesson-review-questions .lesson-question');
      await expect(questions).toHaveCount(3);
      for (const question of await questions.all()) {
        const answer = question.getByRole('button').first();
        await answer.scrollIntoViewIfNeeded();
        await verifyVisible(answer);
        await answer.click();
        await expect(question.getByRole('status')).toBeVisible();
        await verifyScreen('观察回顾选择');
      }
      await expect(finish).toBeEnabled();
      await verifyVisible(finish);
      await finish.click();
    }
    await expect(page).toHaveURL(gamesUrl);
    await verifyGameChoices();
  }

  async function verifyGameChoices() {
    await expect(page.locator('.game-choice-card h2')).toHaveText(['找不同', '拼图', '填色']);
    await expect(page.locator('.game-choice-card')).toHaveCount(3);
    await expect(page.locator('a.game-choice-card')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /拼图/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /填色/ })).toBeDisabled();
    for (const card of await page.locator('.game-choice-card').all()) await verifyVisible(card);
    await verifyScreen('游戏选择');
  }

  async function verifyGameFits() {
    const host = page.getByTestId('phaser-player');
    await expect.poll(async () => host.evaluate(element => {
      const canvas = element.querySelector('canvas');
      if (!canvas || !element.dataset.layout) return false;
      const layout = JSON.parse(element.dataset.layout);
      const bounds = canvas.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && bounds.x >= -1 && bounds.y >= -1
        && bounds.right <= innerWidth + 1 && bounds.bottom <= innerHeight + 1
        && [layout.reference, layout.edited].every(image => image.width > 0 && image.height > 0
          && image.x >= 0 && image.y >= 0 && image.x + image.width <= layout.width + 1
          && image.y + image.height <= layout.height + 1 && Math.abs(image.width / image.height - 1.5) < 0.001);
    }), { message: '两张完整图片应在当前视口内等比显示' }).toBe(true);
    for (const name of ['给我提示', '重新开始', '放大观察']) await verifyVisible(page.getByRole('button', { name, exact: true }));
    await verifyVisible(page.getByTestId('hint-status'));
    await verifyVisible(page.getByTestId('game-progress'));
    await verifyButtonCentered(page.getByRole('button', { name: '给我提示', exact: true }));
    await verifyScreen('游玩屏幕');
  }

  // A fresh browser really completes the teaching prerequisite; no game completion
  // or learning completion is injected into this production smoke test.
  await page.goto(`${baseUrl}/#/play/patterns-intro`);
  await expect(page.getByRole('heading', { name: '先看文化导览' })).toBeVisible();
  await page.goto(baseUrl);
  await expect(page.locator('.theme-row')).toHaveCount(3);
  await expect(page.locator('a[href*="/play/"]')).toHaveCount(0);
  await expect(page.getByText('开始第一次观察')).toHaveCount(0);
  await verifyCssImage('.app-shell', 'background-image', '::before');
  await page.setViewportSize({ width: 1279, height: 925 });
  await verifyHomeGeometry();
  await verifyScreen('1279×925首页');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await verifyHomeGeometry();
  await captureScreenshot('outputs/试玩首页.png');
  await page.locator('.theme-patterns').click();
  await walkTeaching(true, true);
  const learned = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), learningKey);
  const learningRecords = Object.values(learned.books);
  expect(learningRecords).toHaveLength(1);
  expect(learningRecords[0].visitedIds).toHaveLength(7);
  expect(learningRecords[0].completedAt).toBeTruthy();
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await captureScreenshot('outputs/游戏选择预览.png');
  await page.getByRole('link', { name: '找不同', exact: true }).click();
  await expect(page).toHaveURL(levelsUrl);
  await expect(page.getByRole('heading', { name: '找不同关卡', level: 1 })).toBeVisible();
  await expect(page.locator('.level-choice-card')).toHaveCount(6);
  await expect(page.locator('.level-choice-card[data-status="planned"]')).toHaveCount(5);
  await expect(page.getByTestId('level-catalog-summary')).toHaveText('共 6 关1 关开放');
  for (const card of await page.locator('.level-choice-card').all()) {
    await verifyVisible(card);
    if (await card.getAttribute('data-status') === 'planned') {
      await expect(card).toContainText('筹备中');
      await expect(card.locator('a, button')).toHaveCount(0);
    }
  }
  const start = page.getByRole('link', { name: '开始观察', exact: true });
  await verifyVisible(start);
  await verifyButtonCentered(start);
  await verifyCssImage('.button-primary', 'border-image-source');
  await verifyScreen('关卡选择');
  await captureScreenshot('outputs/关卡选择预览.png');
  await start.click();
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
  await verifyCssImage('.game-stage', 'border-image-source');
  await verifyCssImage('.button-secondary', 'border-image-source');
  await verifyGameFits();
  await expect(page.getByRole('button', { name: '学习目标与来源' })).toHaveCount(0);
  await captureScreenshot('outputs/首关美术预览.png');

  async function hit(index, side) {
    const host = page.getByTestId('phaser-player');
    const layout = JSON.parse(await host.getAttribute('data-layout'));
    const image = layout[side], region = level.differences[index].region;
    await host.locator('canvas').click({ position: { x: image.x + (region.x + region.width / 2) * image.width, y: image.y + (region.y + region.height / 2) * image.height } });
  }
  await hit(0, 'reference');
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(1));
  await page.getByRole('button', { name: '给我提示' }).click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[1].hint);
  await page.setViewportSize({ width: 360, height: 640 });
  await expect.poll(async () => JSON.parse(await page.getByTestId('phaser-player').getAttribute('data-layout')).stacked).toBe(true);
  await verifyCssImage('.app-shell', 'background-image', '::before');
  await hit(0, 'edited');
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(1));
  await page.getByRole('button', { name: '给我提示' }).click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[1].detailHint);
  await verifyGameFits();
  await captureScreenshot('outputs/手机美术预览.png');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => JSON.parse(await page.getByTestId('phaser-player').getAttribute('data-layout')).stacked).toBe(false);
  await verifyGameFits();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(1));
  await captureScreenshot('outputs/手机横屏美术预览.png');
  for (let index = 1; index < level.differences.length; index++) {
    await hit(index, index % 2 === 0 ? 'reference' : 'edited');
    if (index < level.differences.length - 1) await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(index + 1));
  }
  await expect(page).toHaveURL(/result\/patterns-intro$/);
  await verifyScreen('结果屏幕');
  await verifyVisible(page.getByRole('button', { name: '再观察一次' }));
  const resultReference = page.getByRole('region', { name: '文化参考', exact: true });
  await verifyVisible(resultReference);
  await verifyVisible(resultReference.getByRole('link', { name: new RegExp(level.source.title) }));
  await expect(resultReference).toContainText('开发者');
  await expect(resultReference).not.toContainText('婧婧');
  await expect(page.locator('.dialog-discoveries')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看发现与文化来源' })).toHaveCount(0);
  await captureScreenshot('outputs/通关结果手机预览.png');
  await page.setViewportSize({ width: 1279, height: 925 });
  await verifyScreen('桌面结果文化参考');
  await verifyVisible(resultReference);
  await captureScreenshot('outputs/通关结果预览.png');
  await page.reload();
  await expect(page.getByRole('heading', { name: '观察完成' })).toBeVisible();
  const completedIds = await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)).completed), progressKey);
  expect(completedIds).toEqual([level.id]);
  await page.getByRole('link', { name: '返回关卡', exact: true }).click();
  await verifyButtonCentered(page.getByRole('link', { name: '再次观察', exact: true }));
  await page.getByRole('button', { name: '返回游戏选择', exact: true }).click();
  await page.getByRole('button', { name: '重看教学', exact: true }).click();
  await expect(page.getByTestId('teaching-screen')).toHaveAttribute('data-unit-id', 'locations');
  for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/#/theme/patterns`);
    await walkTeaching();
    await page.getByRole('link', { name: '找不同', exact: true }).click();
    await verifyVisible(page.getByRole('link', { name: '再次观察', exact: true }));
    await verifyButtonCentered(page.getByRole('link', { name: '再次观察', exact: true }));
    await verifyScreen('手机关卡选择');
    for (const route of ['/', '/theme/music', '/help', '/settings']) {
      await page.goto(`${baseUrl}/#${route}`);
      await verifyScreen(`${viewport.width}×${viewport.height} ${route}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('生产构建验证通过：真实七屏教学和三题反馈、资料内部滚动、三类玩法与独立关卡层级；三张主题图尺寸相等且题名间距正确，按钮正文居中；各页无页面滚动，1440→360→844完整适配、真实点击与状态保留、独立学习记录与游戏记录、完成和刷新保存。');
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
