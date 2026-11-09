import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { AssetDefinition, SpotDifferenceLevel } from '../../src/types';

const level = JSON.parse(readFileSync('src/content/levels/patterns-intro.json', 'utf8')) as SpotDifferenceLevel;
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const editedAsset = assets.find(asset => asset.id === level.editedAssetId)!;
const editedAssetRoute = `**${editedAsset.path}*`;
const progressKey = 'dunhuang:progress:v1';
const imageLoadTimeout = 45_000;
test.setTimeout(60_000);
const progressLabel = (found: number, total = level.differences.length) => `已找到 ${found} 处，共 ${total} 处`;
interface Rect { x: number; y: number; width: number; height: number }
interface Layout { width: number; height: number; stacked: boolean; reference: Rect; edited: Rect }

async function expectDocumentFits(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    return {
      horizontalOverflow: Math.max(0, documentWidth - window.innerWidth - 1),
      verticalOverflow: Math.max(0, documentHeight - window.innerHeight - 1),
      scrollX: Math.abs(window.scrollX),
      scrollY: Math.abs(window.scrollY),
    };
  }), { message: '文档应固定在屏幕内，长文字只允许在内容区或弹窗内部滚动' }).toEqual({
    horizontalOverflow: 0, verticalOverflow: 0, scrollX: 0, scrollY: 0,
  });
}

async function expectInsideViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  // Intersection also catches clipping by an ancestor's overflow:hidden.
  await expect(locator).toBeInViewport({ ratio: 0.999 });
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectGameFits(page: Page) {
  const host = page.getByTestId('phaser-player');
  const canvas = host.locator('canvas');
  await expectInsideViewport(page, canvas);
  await expectInsideViewport(page, page.getByRole('button', { name: '给我提示' }));
  await expectInsideViewport(page, page.getByRole('button', { name: '重新开始' }));
  await expectInsideViewport(page, page.getByRole('button', { name: '学习目标与来源' }));
  await expectInsideViewport(page, page.getByTestId('game-progress'));
  await expectInsideViewport(page, page.getByTestId('hint-status'));
  await expectDocumentFits(page);

  await expect.poll(async () => {
    const raw = await host.getAttribute('data-layout');
    if (!raw) return false;
    const layout = JSON.parse(raw) as Layout;
    const box = await canvas.boundingBox();
    if (!box || layout.width <= 0 || layout.height <= 0) return false;
    const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
    const scaleX = box.width / layout.width;
    const scaleY = box.height / layout.height;
    return [layout.reference, layout.edited].every(rect => {
      const left = box.x + rect.x * scaleX;
      const top = box.y + rect.y * scaleY;
      const width = rect.width * scaleX;
      const height = rect.height * scaleY;
      return [left, top, width, height].every(Number.isFinite)
        && width > 0 && height > 0
        && Math.abs(width / height - 1.5) < 0.001
        && rect.x >= 0 && rect.y >= 0
        && rect.x + rect.width <= layout.width + 1
        && rect.y + rect.height <= layout.height + 1
        && left >= -1 && top >= -1
        && left + width <= viewport.width + 1
        && top + height <= viewport.height + 1;
    });
  }, { message: '两幅3:2图像必须完整显示在画布及viewport内，不能依靠裁切通过验收' }).toBe(true);
}

async function expectResultFits(page: Page) {
  await expectInsideViewport(page, page.getByRole('heading', { name: '这一轮观察，完成了。' }));
  await expectInsideViewport(page, page.getByRole('link', { name: /^返回主题/ }));
  await expectInsideViewport(page, page.getByRole('button', { name: '再观察一次' }));
  await expectInsideViewport(page, page.getByRole('button', { name: '查看发现与文化来源' }));
  await expectDocumentFits(page);
}

async function inspectSourceDialog(page: Page, buttonName: string) {
  await page.getByRole('button', { name: buttonName }).click();
  const dialog = page.getByRole('dialog');
  await expectInsideViewport(page, dialog);
  await expectInsideViewport(page, dialog.getByRole('button', { name: '关闭说明' }));
  await expectDocumentFits(page);
  // Reaching the source at the end must scroll the dialog, not the document.
  const source = dialog.getByRole('link', { name: new RegExp(level.source.title) });
  await source.scrollIntoViewIfNeeded();
  await expectInsideViewport(page, source);
  await expectInsideViewport(page, dialog.getByRole('button', { name: '关闭说明' }));
  await expectDocumentFits(page);
  await dialog.getByRole('button', { name: '关闭说明' }).click();
  await expect(dialog).toBeHidden();
  await expectDocumentFits(page);
}

async function inspectArtwork(page: Page) {
  const progressBefore = await page.getByTestId('game-progress').getAttribute('aria-label');
  const opener = page.getByRole('button', { name: '放大观察', exact: true });
  // Open with the keyboard so restoring focus has a defined keyboard target;
  // Safari intentionally leaves pointer-activated buttons unfocused.
  await opener.focus();
  await opener.press('Enter');
  const inspector = page.getByTestId('art-inspector');
  const picture = page.getByTestId('art-inspector-image');
  const returnButton = inspector.getByRole('button', { name: '返回游戏' });
  await expectInsideViewport(page, inspector);
  await expectInsideViewport(page, inspector.getByRole('button', { name: '关闭放大观察' }));
  await expectInsideViewport(page, returnButton);
  await expectInsideViewport(page, picture);
  await expect.poll(async () => {
    const bounds = await picture.boundingBox();
    return !!bounds && bounds.width > 100 && Math.abs(bounds.width / bounds.height - 1.5) < 0.001;
  }, { message: '放大观察图应为可见的完整3:2观察窗口' }).toBe(true);
  await expect(picture).toHaveAttribute('data-view', 'full');
  await expect(picture).toHaveAttribute('data-side', 'reference');
  await expect(picture).toHaveCSS('background-size', '100% 100%');

  await inspector.getByRole('button', { name: '右上 2×', exact: true }).click();
  await expect(picture).toHaveAttribute('data-view', 'upper-right');
  await expect(picture).toHaveCSS('background-size', '200% 200%');
  await expect(picture).toHaveCSS('background-position', '100% 0%');
  await inspector.getByRole('button', { name: '变化图 B', exact: true }).click();
  await expect(picture).toHaveAttribute('data-side', 'edited');
  await expect(picture).toHaveAttribute('data-view', 'upper-right');
  await expect(inspector.getByRole('button', { name: '变化图 B', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectInsideViewport(page, picture);
  await expectInsideViewport(page, returnButton);
  await expectDocumentFits(page);

  await returnButton.click();
  await expect(inspector).toBeHidden();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressBefore!);
  await expect(opener).toBeFocused();
  // Also exercise the ordinary pointer entry and the top close control.
  await opener.click();
  await expectInsideViewport(page, inspector);
  await inspector.getByRole('button', { name: '关闭放大观察' }).click();
  await expect(inspector).toBeHidden();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressBefore!);
  await expectGameFits(page);
}

async function inspectStaticScreens(page: Page) {
  await page.goto('/');
  await expectInsideViewport(page, page.locator('.theme-patterns'));
  await expectDocumentFits(page);

  await page.goto('/#/theme/patterns');
  await expectInsideViewport(page, page.getByRole('link', { name: /^开始观察/ }));
  await expectDocumentFits(page);

  await page.goto('/#/theme/music');
  await expectInsideViewport(page, page.getByRole('heading', { level: 1, name: '飞天、乐舞与服饰' }));
  await expectInsideViewport(page, page.getByRole('link', { name: /去看纹样与色彩/ }));
  await expectDocumentFits(page);

  await page.goto('/#/help');
  await expectInsideViewport(page, page.getByRole('heading', { level: 1 }));
  await expectDocumentFits(page);
  const returnHome = page.getByRole('link', { name: /回到探索首页/ });
  await returnHome.scrollIntoViewIfNeeded();
  await expectInsideViewport(page, returnHome);
  await expectDocumentFits(page);

  await page.goto('/#/settings');
  await expectInsideViewport(page, page.getByRole('checkbox', { name: '减少动效' }));
  await expectDocumentFits(page);

  await page.goto('/#/missing-screen');
  await expectInsideViewport(page, page.getByRole('main').getByRole('link', { name: '返回首页' }));
  await expectDocumentFits(page);
}

async function startGame(page: Page) {
  await page.goto('/#/play/patterns-intro');
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(page.getByTestId('phaser-player').locator('canvas')).toBeVisible();
  await expectGameFits(page);
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
  for (let index = 0; index < level.differences.length; index++) {
    await clickDifference(page, index, index % 2 === 0 ? 'reference' : 'edited', touch);
    if (index < level.differences.length - 1) {
      await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(index + 1));
    }
  }
  await expect(page).toHaveURL(/#\/result\/patterns-intro$/);
  await expect(page.getByRole('heading', { name: '这一轮观察，完成了。' })).toBeVisible();
  await expectResultFits(page);
}

test('首页三个真实主题，未完成主题只有介绍，无空关卡', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '选择一段探索' })).toBeVisible();
  await expect(page.locator('.theme-row')).toHaveCount(3);
  await expectInsideViewport(page, page.locator('.theme-patterns'));
  await expectDocumentFits(page);
  const selectMusic = page.getByRole('button', { name: '查看主题：飞天、乐舞与服饰' });
  if (await selectMusic.isVisible()) await selectMusic.click();
  await expectInsideViewport(page, page.locator('.theme-music'));
  await page.locator('.theme-music').click();
  await expect(page.getByRole('heading', { level: 1, name: '飞天、乐舞与服饰' })).toBeVisible();
  await expect(page.getByText('新的线索，还在整理中。')).toBeVisible();
  await expect(page.getByRole('link', { name: /^开始观察/ })).toHaveCount(0);
  await expectDocumentFits(page);
  await page.goto('/#/theme/stories');
  await expect(page.locator('.game-type-list span')).toHaveText(['线索找物', '故事拼图']);
  await expectDocumentFits(page);
  expect(errors).toEqual([]);
});

test('真实画布点击、无限提示、重开、完成与刷新保存', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().includes('/assets/')) errors.push(`素材请求失败：${response.status()} ${response.url()}`); });
  const touch = testInfo.project.name === 'mobile-chromium';
  await startGame(page);
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!) as Layout;
  expect(Math.abs(layout.reference.width / layout.reference.height - 1.5)).toBeLessThan(0.001);
  await host.locator('canvas').click({ position: { x: 2, y: 2 } });
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(0));
  await page.getByRole('button', { name: '给我提示' }).click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].hint);
  await page.getByRole('button', { name: '给我提示' }).click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].detailHint);
  await expectGameFits(page);
  await clickDifference(page, 0, 'edited', touch);
  await clickDifference(page, 0, 'reference', touch);
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(1));
  await page.getByRole('button', { name: '重新开始' }).click();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(0));
  await completeGame(page, touch);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(Object.keys(stored.completed)).toEqual(['patterns-intro']);
  const completedAt = stored.completed['patterns-intro'];
  await page.reload();
  await expect(page.getByText('完成记录已保存在当前浏览器')).toBeVisible();
  await page.getByRole('button', { name: '再观察一次' }).click();
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(0));
  const afterReplay = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(afterReplay.completed['patterns-intro']).toBe(completedAt);
  await page.goto('/#/theme/patterns');
  await expect(page.locator('.completed-label')).toContainText('已完成');
  await expectInsideViewport(page, page.getByRole('link', { name: /^再次观察/ }));
  await expectDocumentFits(page);
  expect(errors).toEqual([]);
});

test('中途退出与多次进入不残留局内发现状态', async ({ page }) => {
  await startGame(page); await clickDifference(page, 0, 'reference');
  await page.getByRole('link', { name: '纹样与色彩', exact: true }).click();
  await page.getByRole('link', { name: /^开始观察/ }).click();
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(0));
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
  await expectInsideViewport(page, page.getByTestId('retry-save'));
  await expectResultFits(page);
  await expect(page.getByText('完成记录已保存在当前浏览器')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { __originalStorageSetter: typeof Storage.prototype.setItem }).__originalStorageSetter; });
  await page.getByTestId('retry-save').click();
  await expect(page.getByTestId('save-error')).toHaveCount(0);
  await expect(page.getByText('完成记录已保存在当前浏览器')).toBeVisible();
});

test('图片加载失败可重试，恢复后不必刷新页面', async ({ page }) => {
  await page.route(editedAssetRoute, route => route.abort());
  await page.goto('/#/play/patterns-intro');
  await expect(page.getByRole('button', { name: '重新加载画面' })).toBeVisible({ timeout: imageLoadTimeout });
  await page.unroute(editedAssetRoute);
  await page.getByRole('button', { name: '重新加载画面' }).click();
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
  await completeGame(page);
});

test('减少动效设置保存，结果页不能凭地址伪造完成', async ({ page }) => {
  await page.goto('/#/result/patterns-intro');
  await expect(page.getByRole('heading', { name: '先完成活动，再回看发现' })).toBeVisible();
  await expectInsideViewport(page, page.getByRole('link', { name: '前往观察' }));
  await expectDocumentFits(page);
  await page.goto('/#/settings');
  await page.getByRole('checkbox', { name: '减少动效' }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '减少动效' })).toBeChecked();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-reduced-motion', 'true');
  await expectInsideViewport(page, page.getByRole('checkbox', { name: '减少动效' }));
  await expectDocumentFits(page);
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
  await page.route(editedAssetRoute, route => route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${editedAsset.width}" height="${editedAsset.height}" viewBox="0 0 ${editedAsset.width} ${editedAsset.height}"><rect width="${editedAsset.width}" height="${editedAsset.height}" fill="#ff00ff"/></svg>` }));
  await page.goto(`/#/play/${testId}`);
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', '已找到 0 处，共 2 处');
  await expectGameFits(page);
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

for (const viewport of [
  { name: '小竖屏', width: 360, height: 640 },
  { name: '手机横屏', width: 844, height: 390 },
]) {
  test(`${viewport.name}${viewport.width}×${viewport.height}：主要页面与完整游戏均在屏幕内`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await inspectStaticScreens(page);
    await startGame(page);
    await inspectSourceDialog(page, '学习目标与来源');
    await inspectArtwork(page);
    await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(0));
    await page.getByRole('button', { name: '给我提示' }).click();
    await page.getByRole('button', { name: '给我提示' }).click();
    await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].detailHint);
    await expectGameFits(page);
    await completeGame(page, testInfo.project.name === 'mobile-chromium');
    await inspectSourceDialog(page, '查看发现与文化来源');
    await expectResultFits(page);
    expect(errors).toEqual([]);
  });
}

test('桌面到竖屏再到横屏：发现状态与提示级别保持，画面重新适配', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await startGame(page);
  await clickDifference(page, 0, 'reference');
  await page.getByRole('button', { name: '给我提示' }).click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[1].hint);

  await page.setViewportSize({ width: 360, height: 640 });
  await expectGameFits(page);
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(1));
  await page.getByRole('button', { name: '给我提示' }).click();
  await expect(page.getByTestId('hint-status')).toContainText(level.differences[1].detailHint);
  // Finding a different target detects a scene reset that a stale UI counter could hide.
  await clickDifference(page, 1, 'edited');
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(2));

  await page.setViewportSize({ width: 844, height: 390 });
  await expectGameFits(page);
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(2));
  for (let index = 2; index < level.differences.length; index++) {
    await clickDifference(page, index, index % 2 === 0 ? 'reference' : 'edited');
    if (index < level.differences.length - 1) {
      await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(index + 1));
    }
  }
  await expect(page).toHaveURL(/#\/result\/patterns-intro$/);
  await expectResultFits(page);
  const completed = await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).completed), progressKey);
  expect(completed).toEqual(['patterns-intro']);
});

test('增加关卡后按实际空间分页，每关均能通过按钮访问', async ({ page }) => {
  const levels = [level, ...Array.from({ length: 5 }, (_, index) => ({
    ...level, id: `test-pagination-${index}`, title: `观察活动 ${index + 2}：认识纹样中的组成与形状`,
  }))];
  // Inject only into this browser's catalog; do not create formal content files.
  await page.route('**/src/content/index.ts*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    expect(source).toContain('levels: Object.values(levelFiles)');
    await route.fulfill({ response, body: source.replace('levels: Object.values(levelFiles)', `levels: ${JSON.stringify(levels)}`) });
  });
  await page.addInitScript(({ key, introId }) => localStorage.setItem(key, JSON.stringify({
    version: 1, completed: { [introId]: '2026-10-28T00:00:00.000Z' }, settings: { reducedMotion: true },
  })), { key: progressKey, introId: level.id });
  for (const viewport of [{ width: 1000, height: 600 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('.theme-patterns').click();
    const seen = new Set<string>();
    for (let index = 0; index < levels.length; index++) {
      const rows = page.locator('.level-row');
      await expect(rows.first()).toBeVisible();
      for (const row of await rows.all()) {
        await expectInsideViewport(page, row);
        const link = row.getByRole('link');
        await expectInsideViewport(page, link);
        seen.add((await link.getAttribute('href'))!);
      }
      await expectDocumentFits(page);
      const next = page.getByRole('button', { name: '下一页' });
      if (!await next.isEnabled()) break;
      await next.click();
    }
    expect(seen.size).toBe(levels.length);
  }
});
