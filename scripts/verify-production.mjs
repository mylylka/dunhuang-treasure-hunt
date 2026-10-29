import { chromium, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const baseUrl = 'http://localhost:4186';
const level = JSON.parse(await readFile(new URL('../src/content/levels/patterns-intro.json', import.meta.url), 'utf8'));
const assets = JSON.parse(await readFile(new URL('../src/content/assets.json', import.meta.url), 'utf8'));
const allLevels = await Promise.all((await readdir(new URL('../src/content/levels/', import.meta.url))).filter(name => name.endsWith('.json')).map(async name => JSON.parse(await readFile(new URL(`../src/content/levels/${name}`, import.meta.url), 'utf8'))));
const availableDifferenceCount = allLevels.filter(item => item.gameType === 'spot-difference').length;
const coloringLevels = allLevels.filter(item => item.gameType === 'coloring');
const puzzleLevels = allLevels.filter(item => item.gameType === 'puzzle');
const soundManifest = JSON.parse(await readFile(new URL('../public/assets/shared/audio/warm-v001/manifest.json', import.meta.url), 'utf8'));
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
  for (const sound of soundManifest.sounds) {
    const response = await fetch(`${baseUrl}/assets/shared/audio/warm-v001/${sound.file}`);
    if (!response.ok) throw new Error(`构建音效不可用：${sound.file} (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== sound.sha256) throw new Error(`构建音效与已确认试听不一致：${sound.file}`);
  }
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

  async function verifyInsideSurface(surface, element) {
    await verifyVisible(element);
    await expect.poll(async () => {
      const safe = await surface.evaluate(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
        return { left: rect.left + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth), top: rect.top + parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth),
          right: rect.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth), bottom: rect.bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth) };
      });
      const rect = await element.boundingBox();
      return !!rect && rect.x >= safe.left - 1 && rect.y >= safe.top - 1 && rect.x + rect.width <= safe.right + 1 && rect.y + rect.height <= safe.bottom + 1;
    }, { message: '控件应位于浅色内层的安全区，不能压住外层装饰' }).toBe(true);
  }

  async function verifyHomeTitle() {
    const title = page.getByRole('heading', { name: '敦煌寻宝记', level: 1, exact: true });
    await verifyVisible(title); await verifyVisible(page.getByText('开启敦煌探索', { exact: true }));
    await expect(title).toHaveCSS('font-family', /Dunhuang Title/);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('48px "Dunhuang Title"', '敦煌寻宝记'))).toBe(true);
    const style = await title.evaluate(node => {
      const style = getComputedStyle(node), rect = node.getBoundingClientRect();
      return { fontSize: parseFloat(style.fontSize), rgb: style.color.match(/[\d.]+/g).map(Number), center: rect.top + rect.height / 2, height: innerHeight };
    });
    expect(style.fontSize).toBeGreaterThanOrEqual(36); expect(style.center).toBeLessThan(style.height / 2);
    expect(style.rgb[0]).toBeGreaterThan(style.rgb[1] * 1.5);
    const fontUrl = `${baseUrl}/assets/shared/fonts/dunhuang-title-v001.woff`;
    expect((await fetch(fontUrl)).status).toBe(200);
    expect(await page.evaluate(url => performance.getEntriesByType('resource').some(item => item.name === url), fontUrl)).toBe(true);
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
    const surface = page.getByTestId('lesson-content-surface');
    await verifyVisible(surface);
    await expect(surface).toHaveCSS('background-image', /linear-gradient/);
    const guideLabel = page.locator('.lesson-guide-label');
    await verifyVisible(guideLabel);
    await expect(guideLabel).toContainText('文化导览');
    await expect(page.locator('.lesson-panel')).toHaveCSS('background-image', /linear-gradient/);
    await verifyCssImage('.lesson-panel', 'border-image-source');
    await verifyVisible(page.getByRole('heading', { level: 1 }));
    for (const name of ['返回主题首页', '资料', '直接玩游戏', '上一页', index === 6 ? '完成小考' : '下一页']) {
      await verifyVisible(page.getByRole('button', { name, exact: true }));
    }
    await expect(page.getByRole('button', { name: '直接玩游戏', exact: true })).toBeEnabled();
    await expect(page.locator('.lesson-lead,.lesson-review-lead')).toHaveCount(0);
    if (index !== 6) await expect(page.locator('.lesson-question')).toHaveCount(0);
    await expect(page.locator('.lesson-chapter-name')).toHaveText(['装饰部位', '花叶纹样', '几何纹样', '动物纹样', '组织方式', '色彩', '知识小考']);
    for (const tab of await page.locator('.lesson-chapter-name').all()) {
      expect(await tab.evaluate(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const rects = [...range.getClientRects()], parent = node.closest('button').getBoundingClientRect();
        return rects.length === 1 && rects[0].height <= parseFloat(getComputedStyle(node).lineHeight) + 1 && rects[0].left >= parent.left - 1 && rects[0].right <= parent.right + 1;
      })).toBe(true);
    }
    for (const control of await page.locator('.lesson-heading button,.lesson-chapters button,.lesson-image-tools button,.lesson-panel-choices button,.lesson-navigation button').all()) await verifyInsideSurface(surface, control);
    const image = page.getByTestId('lesson-image');
    await verifyInsideSurface(surface, page.locator('.lesson-copy'));
    if (await image.isVisible()) {
      await verifyVisible(page.getByTestId('lesson-figure'));
      await verifyInsideSurface(surface, page.getByTestId('lesson-figure'));
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
    const surface = page.getByTestId('lesson-source-surface');
    await verifyInsideSurface(surface, dialog.getByRole('button', { name: '关闭教学资料', exact: true }));
    await verifyInsideSurface(surface, dialog.getByRole('button', { name: '返回教学', exact: true }));
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

  async function verifyLessonViewer(move = false, capture = false) {
    const source = page.getByTestId('lesson-image').locator('image');
    const src = await source.getAttribute('href');
    const size = [Number(await source.getAttribute('width')), Number(await source.getAttribute('height'))];
    const opener = page.getByRole('button', { name: '放大查看', exact: true });
    await opener.focus(); await opener.press('Enter');
    const viewer = page.getByTestId('lesson-image-viewer'), surface = page.getByTestId('lesson-viewer-surface');
    const stage = page.getByTestId('lesson-viewer-stage'), image = page.getByTestId('lesson-viewer-image');
    await verifyVisible(viewer); await verifyInsideSurface(surface, stage);
    await verifyInsideSurface(surface, viewer.locator('.lesson-viewer-caption'));
    for (const button of await viewer.getByRole('button').all()) await verifyInsideSurface(surface, button);
    await expect(stage).toHaveAttribute('data-zoom', '1');
    await verifyVisible(image); await waitForRenderedMedia();
    expect(await image.evaluate(element => [element.naturalWidth, element.naturalHeight])).toEqual(size);
    expect(new URL(await image.getAttribute('src'), page.url()).href).toBe(new URL(src, page.url()).href);
    if (move) {
      await viewer.getByRole('button', { name: '3×', exact: true }).click();
      await expect(stage).toHaveAttribute('data-zoom', '3');
      await stage.focus(); await stage.press('ArrowRight'); await stage.press('ArrowDown');
      await expect.poll(async () => Math.abs(Number(await stage.getAttribute('data-pan-x'))) + Math.abs(Number(await stage.getAttribute('data-pan-y')))).toBeGreaterThan(0);
      const before = `${await stage.getAttribute('data-pan-x')}:${await stage.getAttribute('data-pan-y')}`;
      const box = await stage.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 4 }); await page.mouse.up();
      await expect.poll(async () => `${await stage.getAttribute('data-pan-x')}:${await stage.getAttribute('data-pan-y')}`).not.toBe(before);
      if (capture) {
        // Frame the documented upper scroll-pattern border with the viewer's
        // own controls; the source pixels and caption remain unchanged.
        await viewer.getByRole('button', { name: '3×', exact: true }).click();
        await expect(stage).toHaveAttribute('data-pan-y', '0'); await stage.focus();
        for (let step = 0; step < 7; step++) await stage.press('ArrowUp');
        await expect(stage).toHaveAttribute('data-pan-y', '336');
        await captureScreenshot('outputs/卷草放大预览.png');
      }
      await viewer.getByRole('button', { name: '复位', exact: true }).click();
      await expect(stage).toHaveAttribute('data-zoom', '1');
      await expect(stage).toHaveAttribute('data-pan-x', '0'); await expect(stage).toHaveAttribute('data-pan-y', '0');
      await verifyVisible(image);
    }
    await verifyScreen('教学图片观察窗');
    await viewer.getByRole('button', { name: '关闭图像查看器', exact: true }).click();
    await expect(viewer).toBeHidden(); await expect(opener).toBeFocused();
    await expect(source).toHaveAttribute('href', src);
  }

  async function walkTeaching(capture = false, allPanels = false) {
    await expect(page.getByTestId('teaching-screen')).toBeVisible();
    await expect(page.getByRole('navigation', { name: '教学章节' }).getByRole('button')).toHaveCount(7);
    let observedPanels = 0;
    for (let index = 0; index < 7; index++) {
      await verifyTeachingPage(index);
      if (index === 0) {
        await verifyTeachingSources();
        if (capture) await captureScreenshot('outputs/文化教学预览.png');
        const viewport = page.viewportSize();
        if (viewport.width === 360) await captureScreenshot('outputs/手机文化教学预览.png');
        if (viewport.width === 844) await captureScreenshot('outputs/手机横屏文化教学预览.png');
      }
      if (allPanels) {
        const choices = page.getByRole('group', { name: '选择观察内容' }).getByRole('button');
        const options = await choices.count() ? await choices.all() : [null];
        for (const option of options) {
          if (option) await option.click();
          await verifyTeachingPage(index);
          const label = option ? (await option.textContent() ?? '').trim() : '';
          if (capture && index === 0 && label === '平棋') await captureScreenshot('outputs/平棋教学预览.png');
          if (capture && index === 1 && label === '莲花') await captureScreenshot('outputs/花叶教学预览.png');
          if (capture && index === 3 && label === '三兔共耳') await captureScreenshot('outputs/三兔教学预览.png');
          await expect(page.getByRole('button', { name: '放大查看', exact: true })).toHaveCount(1);
          const scroll = option && (await option.textContent()) === '卷草';
          await verifyLessonViewer(!!scroll, capture && !!scroll);
          observedPanels++;
        }
      } else if (index === 1) {
        await page.getByRole('group', { name: '选择观察内容' }).getByRole('button', { name: '卷草', exact: true }).click();
        await verifyLessonViewer(true);
      }
      if (index < 6) {
        await page.getByRole('button', { name: '下一页', exact: true }).click();
        continue;
      }
      const finish = page.getByRole('button', { name: '完成小考', exact: true });
      await expect(finish).toBeDisabled();
      await expect(page.locator('.lesson-copy')).toHaveCSS('overflow-y', 'auto');
      const questions = page.locator('.lesson-review-questions .lesson-question');
      await expect(questions).toHaveCount(6);
      for (const question of await questions.all()) {
        const answer = question.getByRole('button').first();
        await answer.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
        await verifyVisible(answer); await answer.click();
        await expect(question.getByRole('status')).toBeVisible();
        await verifyScreen('知识小考选择');
      }
      await expect(finish).toBeEnabled(); await verifyVisible(finish);
      await page.locator('.lesson-copy').evaluate(element => { element.scrollTop = 0; });
      if (capture) await captureScreenshot('outputs/知识小考预览.png');
      if (page.viewportSize().width === 360) await captureScreenshot('outputs/手机知识小考预览.png');
      if (page.viewportSize().width === 844) await captureScreenshot('outputs/手机横屏知识小考预览.png');
      await finish.click();
    }
    if (allPanels) expect(observedPanels).toBe(19);
    await expect(page).toHaveURL(gamesUrl); await verifyGameChoices();
  }

  async function verifyGameChoices() {
    await expect(page.locator('.game-choice-card h2')).toHaveText(['找不同', '拼图', '填色']);
    await expect(page.locator('.game-choice-card')).toHaveCount(3);
    await expect(page.locator('a.game-choice-card')).toHaveCount(3);
    await expect(page.getByRole('link', { name: '拼图', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '填色', exact: true })).toBeVisible();
    for (const card of await page.locator('.game-choice-card').all()) await verifyVisible(card);
    await verifyScreen('游戏选择');
  }

  async function verifyGameFits(imageAspectRatio = 1.5) {
    const host = page.getByTestId('phaser-player');
    await expect.poll(async () => host.evaluate((element, aspectRatio) => {
      const canvas = element.querySelector('canvas');
      if (!canvas || !element.dataset.layout) return false;
      const layout = JSON.parse(element.dataset.layout);
      const bounds = canvas.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && bounds.x >= -1 && bounds.y >= -1
        && bounds.right <= innerWidth + 1 && bounds.bottom <= innerHeight + 1
        && [layout.reference, layout.edited].every(image => image.width > 0 && image.height > 0
          && image.x >= 0 && image.y >= 0 && image.x + image.width <= layout.width + 1
          && image.y + image.height <= layout.height + 1 && Math.abs(image.width / image.height - aspectRatio) < 0.001);
    }, imageAspectRatio), { message: '两张完整图片应在当前视口内等比显示' }).toBe(true);
    for (const name of ['给我提示', '重新开始', '放大观察']) await verifyVisible(page.getByRole('button', { name, exact: true }));
    await verifyVisible(page.getByTestId('hint-status'));
    await verifyVisible(page.getByTestId('game-progress'));
    await verifyButtonCentered(page.getByRole('button', { name: '给我提示', exact: true }));
    await verifyScreen('游玩屏幕');
  }

  if (process.argv.includes('--teaching-layout-only')) {
    // Recheck a corrected teaching layout without repeating unrelated game cases.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(`${baseUrl}/#/theme/patterns`);
    await walkTeaching();
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('生产教学布局复验通过：844×390七屏安全区、资料补图完整显示、卷草观察窗与六题小考，文档无滚动。');
  } else {
  // Optional learning never blocks a real game or writes a fabricated completion.
  await page.goto(gamesUrl); await verifyGameChoices();
  await page.goto(`${baseUrl}/#/play/patterns-intro`);
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
  expect(await page.evaluate(key => localStorage.getItem(key), learningKey)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await page.goto(baseUrl); await verifyHomeTitle();
  await expect(page.locator('.theme-row')).toHaveCount(3);
  await expect(page.locator('a[href*="/play/"]')).toHaveCount(0);
  await expect(page.getByText('开始第一次观察')).toHaveCount(0);
  await verifyCssImage('.app-shell', 'background-image', '::before');
  await page.setViewportSize({ width: 1279, height: 925 });
  await verifyHomeTitle(); await verifyHomeGeometry(); await verifyScreen('1279×925首页');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await verifyHomeTitle(); await verifyHomeGeometry(); await captureScreenshot('outputs/试玩首页.png');
  await expect(page.locator('.theme-patterns')).toHaveAttribute('href', '#/theme/patterns');
  await page.locator('.theme-patterns').click(); await verifyTeachingPage(0);
  await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
  await expect(page).toHaveURL(gamesUrl);
  const skipped = await page.evaluate(key => Object.values(JSON.parse(localStorage.getItem(key) ?? '{"books":{}}').books)[0] ?? {}, learningKey);
  expect(skipped.completedAt).toBeUndefined();
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await page.goto(baseUrl); await verifyHomeTitle(); await page.locator('.theme-patterns').click();
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
  await expect(page.locator('.level-choice-card[data-status="planned"]')).toHaveCount(6 - availableDifferenceCount);
  await expect(page.getByTestId('level-catalog-summary')).toHaveText(`共 6 关${availableDifferenceCount} 关开放`);
  for (const card of await page.locator('.level-choice-card').all()) {
    await verifyVisible(card);
    if (await card.getAttribute('data-status') === 'planned') {
      await expect(card).toContainText('筹备中');
      await expect(card.locator('a, button')).toHaveCount(0);
    }
  }
  const start = page.getByRole('link', { name: '开始观察', exact: true }).first();
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

  async function hit(index, side, activeLevel = level) {
    const host = page.getByTestId('phaser-player');
    const layout = JSON.parse(await host.getAttribute('data-layout'));
    const image = layout[side], region = activeLevel.differences[index].region;
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
  await page.goto(baseUrl); await verifyHomeTitle();
  await expect(page.locator('.theme-patterns')).toHaveAttribute('href', '#/theme/patterns');
  await page.locator('.theme-patterns').click();
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

  // Exercise the new square assets at their native ratio, using real pointer input.
  for (const square of allLevels.filter(item => item.gameType === 'spot-difference' && item.id !== level.id)) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${baseUrl}/#/play/${square.id}`);
    await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
    const image = assets.find(asset => asset.id === square.baseAssetId);
    expect([image.width, image.height]).toEqual([1254, 1254]);
    await verifyGameFits(image.width / image.height);
    await captureScreenshot(`outputs/${square.id}-找不同预览.png`);
    for (let index = 0; index < square.differences.length; index++) await hit(index, index % 2 ? 'edited' : 'reference', square);
    await expect(page).toHaveURL(new RegExp(`result/${square.id}$`));
    await verifyScreen(`${square.title}结果`);
  }

  expect(coloringLevels).toHaveLength(4);
  for (const [index, coloring] of coloringLevels.entries()) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${baseUrl}/#/play/${coloring.id}`);
    await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
    const host = page.getByTestId('phaser-player');
    const largest = [...coloring.regions].sort((a, b) => b.pixelCount - a.pixelCount)[0];
    const geometry = JSON.parse(await host.getAttribute('data-layout'));
    await host.locator('canvas').click({ position: {
      x: geometry.image.x + largest.point.x * geometry.image.width,
      y: geometry.image.y + largest.point.y * geometry.image.height,
    } });
    await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
    const saved = await page.evaluate(({ id, version }) => JSON.parse(localStorage.getItem('dunhuang:artworks:v1')).artworks[id][version].colors,
      { id: coloring.id, version: coloring.artworkVersion });
    expect(saved[String(largest.id)]).toBe(coloring.palette[0].color.toLowerCase());
    await verifyVisible(host.locator('canvas'));
    await verifyVisible(page.getByTestId('coloring-inline-reference'));
    await verifyVisible(page.getByTestId('coloring-inline-reference').locator('img'));
    for (const name of ['撤销', '清空重涂', '完成作品', '参考配色']) await verifyVisible(page.getByRole('button', { name, exact: true }));
    await verifyScreen(`填色第${index + 1}关`);
    await captureScreenshot(`outputs/填色第${index + 1}关预览.png`);
    if (index === 0) {
      for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        await verifyVisible(host.locator('canvas'));
        await verifyVisible(page.getByTestId('coloring-inline-reference'));
        await verifyVisible(page.getByTestId('coloring-inline-reference').locator('img'));
        for (const name of ['撤销', '清空重涂', '完成作品', '参考配色']) await verifyVisible(page.getByRole('button', { name, exact: true }));
        await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
        await verifyScreen(`${viewport.width}×${viewport.height}填色`);
        await captureScreenshot(`outputs/${viewport.width === 360 ? '手机' : '手机横屏'}填色预览.png`);
      }
      await page.getByRole('button', { name: '完成作品', exact: true }).click();
      await expect(page.getByTestId('coloring-result-canvas')).toBeVisible({ timeout: imageLoadTimeout });
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        await verifyVisible(page.getByTestId('coloring-result-canvas'));
        await verifyVisible(page.getByRole('button', { name: '导出PNG', exact: true }));
        await verifyVisible(page.getByRole('link', { name: '返回关卡', exact: true }));
        await verifyScreen(`${viewport.width}×${viewport.height}填色作品结果`);
        await captureScreenshot(`outputs/${viewport.width === 360 ? '手机' : viewport.width === 844 ? '手机横屏' : ''}填色作品结果预览.png`);
      }
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: '导出PNG', exact: true }).click();
      expect((await download).suggestedFilename()).toContain('.png');
    }
  }
  // Real pointer input only; geometry is observed from the same layout used by the scene.
  async function puzzleLayout() {
    const host = page.getByTestId('phaser-player');
    await expect.poll(async () => {
      const bounds = await host.boundingBox();
      const data = JSON.parse(await host.getAttribute('data-layout'));
      return !!bounds && data.width === Math.floor(bounds.width) && data.height === Math.floor(bounds.height);
    }).toBe(true);
    return JSON.parse(await host.getAttribute('data-layout'));
  }
  async function puzzleClick(rectangle) {
    await page.getByTestId('phaser-player').locator('canvas').click({ position: {
      x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2,
    } });
  }
  async function puzzleDrag(piece) {
    const canvas = await page.getByTestId('phaser-player').locator('canvas').boundingBox();
    const source = piece.displayRect, target = piece.targetRect;
    await page.mouse.move(canvas.x + source.x + source.width / 2, canvas.y + source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvas.x + target.x + target.width / 2, canvas.y + target.y + target.height / 2, { steps: 6 });
    await page.mouse.up();
  }
  async function puzzleScrollTo(offset) {
    const state = await puzzleLayout();
    if (!state.tray || Math.abs(state.trayScroll - offset) <= 1) return;
    const canvas = await page.getByTestId('phaser-player').locator('canvas').boundingBox();
    await page.mouse.move(canvas.x + state.tray.x + state.tray.width / 2,
      canvas.y + state.tray.y + state.tray.height / 2);
    await page.mouse.wheel(0, offset - state.trayScroll);
    await expect.poll(async () => Math.abs((await puzzleLayout()).trayScroll - offset)).toBeLessThanOrEqual(1);
  }
  expect(puzzleLevels).toHaveLength(3);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/#/theme/patterns/games/puzzle`);
  await expect(page.getByTestId('level-catalog-summary')).toHaveText('共 6 关3 关开放');
  await expect(page.locator('.level-choice-card[data-status=planned]')).toHaveCount(3);
  expect(await page.locator('.level-choice-card[data-status=planned] a').count()).toBe(0);
  for (const card of await page.locator('.level-choice-card[data-status=available]').all()) {
    const id = await card.getAttribute('data-level-id');
    await expect(card.locator('a')).toHaveCount(3);
    for (const link of await card.locator('a').all()) await expect(link).toHaveAttribute('href', `#/play/${id}`);
    await expect(card.locator('.selected-level-start')).toHaveText('开始拼图');
  }
  await verifyScreen('拼图六关目录');
  await captureScreenshot('outputs/拼图关卡选择预览.png');
  const firstPuzzleCard = page.locator('.level-choice-card[data-level-id="puzzle-lotus-ceiling"]');
  await firstPuzzleCard.locator('.selected-level-cover-link').click();
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await page.getByRole('button', { name: '返回拼图关卡', exact: true }).click();
  await firstPuzzleCard.locator('.selected-level-title-link').focus();
  await firstPuzzleCard.locator('.selected-level-title-link').press('Enter');
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await page.getByRole('button', { name: '返回拼图关卡', exact: true }).click();
  for (const puzzle of puzzleLevels) {
    await page.goto(`${baseUrl}/#/play/${puzzle.id}`);
    await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
    const total = puzzle.rows * puzzle.columns;
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      const state = await puzzleLayout();
      expect(state.pieces).toHaveLength(total);
      expect(state.board.width / state.board.height).toBeCloseTo(1, 6);
      await verifyVisible(page.getByTestId('phaser-player').locator('canvas'));
      for (const name of ['查看原图', '拼图提示', '重新拼图']) await verifyVisible(page.getByRole('button', { name, exact: true }));
      if (puzzle.mode === 'jigsaw') {
        await expect(page.getByRole('button', { name: '上一组', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: '下一组', exact: true })).toHaveCount(0);
        await verifyVisible(page.getByTestId('puzzle-tray-scrollbar'));
        if (state.trayMaxScroll > 0) {
          await puzzleScrollTo(state.trayMaxScroll);
          await expect(page.getByTestId('puzzle-progress')).toHaveAttribute('aria-label', `已归位 0 块，共 ${total} 块`);
          await puzzleScrollTo(Math.min(state.trayMaxScroll, state.trayRowHeight / 2));
          const scrolled = await puzzleLayout();
          expect(scrolled.pieces.some(piece => !piece.placed && piece.visible && !piece.fullyVisible)).toBe(true);
          await verifyScreen(`${puzzle.title}碎片区局部滚动 ${viewport.width}`);
          if (puzzle.id === 'puzzle-twin-dragons' && viewport.width !== 844) {
            await captureScreenshot(`outputs/${viewport.width === 360 ? '手机-' : ''}双龙碎片滚动预览.png`);
          }
          await puzzleScrollTo(0);
        }
      }
      await verifyScreen(`${puzzle.title} ${viewport.width}×${viewport.height}`);
      await captureScreenshot(`outputs/${viewport.width === 360 ? '手机-' : viewport.width === 844 ? '手机横屏-' : ''}${puzzle.id}-拼图预览.png`);
    }
    await page.getByRole('button', { name: '查看原图', exact: true }).click();
    await verifyVisible(page.getByRole('dialog').locator('img'));
    await page.getByRole('button', { name: '返回拼图', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (puzzle.mode === 'rotation') {
      const initial = await puzzleLayout();
      for (const piece of initial.pieces) {
        const turns = (4 - piece.turns) % 4;
        for (let turn = 0; turn < turns; turn++) {
          const state = await puzzleLayout();
          await puzzleClick(state.pieces[piece.id].targetRect);
        }
      }
    } else {
      for (let count = 0; count < total; count++) {
        const beforeScroll = await puzzleLayout();
        await puzzleScrollTo(count % 2 === 0 ? beforeScroll.trayMaxScroll : 0);
        const state = await puzzleLayout();
        const piece = state.pieces.find(piece => !piece.placed && piece.fullyVisible && piece.displayRect);
        expect(piece).toBeTruthy();
        await puzzleDrag(piece);
        if (count < total - 1) await expect(page.getByTestId('puzzle-progress')).toHaveAttribute('aria-label', `已归位 ${count + 1} 块，共 ${total} 块`);
      }
    }
    await expect(page).toHaveURL(new RegExp(`/#/result/${puzzle.id}$`));
    await expect(page.getByRole('heading', { name: '拼图完成', exact: true })).toBeVisible();
    await verifyVisible(page.getByRole('img', { name: '拼合完成的完整图像', exact: true }));
    await verifyScreen(`${puzzle.title}完成结果`);
    await page.reload();
    await expect(page.getByRole('heading', { name: '拼图完成', exact: true })).toBeVisible();
    const nextPuzzleIds = { 'puzzle-lotus-ceiling': 'puzzle-three-rabbits', 'puzzle-three-rabbits': 'puzzle-twin-dragons' };
    const nextId = nextPuzzleIds[puzzle.id];
    const nextLink = page.getByRole('link', { name: '下一关', exact: true });
    if (nextId) await expect(nextLink).toHaveAttribute('href', `#/play/${nextId}`);
    else await expect(nextLink).toHaveCount(0);
    if (puzzle.id === 'puzzle-lotus-ceiling') {
      await page.goto(`${baseUrl}/#/theme/patterns/games/puzzle`);
      await expect(page.locator('.level-choice-card[data-level-id="puzzle-lotus-ceiling"] .selected-level-start')).toHaveText('开始拼图');
      await page.goto(`${baseUrl}/#/result/${puzzle.id}`);
      await expect(page.getByRole('heading', { name: '拼图完成', exact: true })).toBeVisible();
      await expect(page.locator('.result-reference-link a')).toHaveAttribute('href', 'https://www.sina.cn/news/detail/5337906056003855.html');
      await expect(page.locator('.result-reference')).not.toContainText('可从中心、边带和重复排列观察');
      await expect(page.locator('.result-reference')).not.toContainText('保留原有来源水印');
    }
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await verifyVisible(page.getByRole('link', { name: '返回关卡', exact: true }));
      await verifyVisible(page.getByRole('button', { name: '再拼一次', exact: true }));
      if (nextId) await verifyVisible(nextLink);
      await verifyScreen(`${puzzle.title}结果操作 ${viewport.width}×${viewport.height}`);
      if (puzzle.id === 'puzzle-lotus-ceiling') await captureScreenshot(`outputs/${viewport.width === 360 ? '手机-' : viewport.width === 844 ? '手机横屏-' : ''}莲花平棋结果预览.png`);
    }
    if (nextId) {
      await nextLink.click();
      await expect(page).toHaveURL(new RegExp(`/#/play/${nextId}$`));
      await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('生产构建验证通过：七屏教学、三关找不同清晰标签、四关同屏参考填色及PNG、9块旋转与12/20片不规则拼图；电脑/手机横竖屏布局、碎片区连续滚动、封面和标题入口、真实点击拖拽与独立通关保存。');
  }
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
