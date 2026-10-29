import { expect, test as base, type Locator, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { AssetDefinition, Level, SpotDifferenceLevel } from '../../src/types';
import { patternLesson } from '../../src/content/lessons/patterns';

const level = JSON.parse(readFileSync('src/content/levels/patterns-intro.json', 'utf8')) as SpotDifferenceLevel;
const allLevels = readdirSync('src/content/levels').filter(name => name.endsWith('.json')).map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level);
const availableDifferenceCount = allLevels.filter(item => item.gameType === 'spot-difference').length;
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const editedAsset = assets.find(asset => asset.id === level.editedAssetId)!;
const editedAssetRoute = `**${editedAsset.path}*`;
const progressKey = 'dunhuang:progress:v1';
const learningKey = 'dunhuang:learning:v1';
const gamesUrl = '/#/theme/patterns/games';
const levelsUrl = `${gamesUrl}/spot-difference`;
const completedLearning = {
  version: 1,
  books: { [patternLesson.id]: { contentVersion: patternLesson.version,
    visitedIds: patternLesson.units.map(unit => unit.id), completedAt: '2026-10-28T00:00:00.000Z' } },
};
// Learning is optional. Only the explicit returning-student case seeds a record;
// game rules and deep links are exercised with no learning prerequisite.
const test = base.extend<{ lessonReady: boolean }>({
  lessonReady: [false, { option: true }],
  page: async ({ page, lessonReady }, use) => {
    if (lessonReady) await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: learningKey, value: completedLearning });
    await use(page);
  },
});
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

async function expectButtonCentered(button: Locator) {
  const label = button.locator('.button-label');
  await expect(label).toHaveCount(1);
  await expect.poll(async () => {
    const buttonBox = await button.boundingBox();
    const labelBox = await label.boundingBox();
    if (!buttonBox || !labelBox) return false;
    return Math.abs(buttonBox.x + buttonBox.width / 2 - labelBox.x - labelBox.width / 2) <= 1
      && Math.abs(buttonBox.y + buttonBox.height / 2 - labelBox.y - labelBox.height / 2) <= 1;
  }, { message: '按钮正文应独立位于底图的水平、垂直中心，不能被装饰或尾箭头推偏' }).toBe(true);
}

async function expectInsideSurface(page: Page, surface: Locator, element: Locator) {
  await expectInsideViewport(page, element);
  await expect.poll(async () => {
    const safe = await surface.evaluate(node => {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { left: rect.left + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth),
        top: rect.top + parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth),
        right: rect.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth),
        bottom: rect.bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth) };
    });
    const rect = await element.boundingBox();
    return !!rect && rect.x >= safe.left - 1 && rect.y >= safe.top - 1
      && rect.x + rect.width <= safe.right + 1 && rect.y + rect.height <= safe.bottom + 1;
  }, { message: '控件必须完整位于浅色内层的安全内容区，不能压在装饰边框上' }).toBe(true);
}

async function expectHomeTitle(page: Page) {
  const title = page.getByRole('heading', { name: '敦煌寻宝记', level: 1, exact: true });
  await expectInsideViewport(page, title);
  await expectInsideViewport(page, page.getByText('开启敦煌探索', { exact: true }));
  await expect(title).toHaveCSS('font-family', /Dunhuang Title/);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('48px "Dunhuang Title"', '敦煌寻宝记'))).toBe(true);
  const appearance = await title.evaluate(node => {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect();
    return { color: style.color.match(/[\d.]+/g)!.map(Number), fontSize: parseFloat(style.fontSize), centerY: rect.top + rect.height / 2, viewport: innerHeight };
  });
  expect(appearance.fontSize).toBeGreaterThanOrEqual(36);
  expect(appearance.centerY).toBeLessThan(appearance.viewport / 2);
  expect(appearance.color[0]).toBeGreaterThan(appearance.color[1] * 1.5);
  const fontPath = '/assets/shared/fonts/dunhuang-title-v001.woff';
  expect(await page.evaluate(path => performance.getEntriesByType('resource').some(item => new URL(item.name).pathname.endsWith(path)), fontPath)).toBe(true);
}

async function expectTeachingFits(page: Page, unitIndex: number) {
  const unit = patternLesson.units[unitIndex];
  await expect(page.getByTestId('teaching-screen')).toHaveAttribute('data-unit-id', unit.id);
  const surface = page.getByTestId('lesson-content-surface');
  await expectInsideViewport(page, surface);
  await expect(surface).toHaveCSS('background-image', /linear-gradient/);
  await expectInsideViewport(page, page.locator('.lesson-panel'));
  await expect(page.locator('.lesson-panel')).toHaveCSS('background-image', /linear-gradient/);
  await expect(page.locator('.lesson-panel')).toHaveCSS('box-shadow', /rgba?\(/);
  const guideLabel = page.locator('.lesson-guide-label');
  await expectInsideViewport(page, guideLabel);
  await expect(guideLabel).toContainText('文化导览');
  await expectInsideViewport(page, page.getByRole('heading', { name: unit.title, level: 1 }));
  await expectInsideViewport(page, page.getByRole('navigation', { name: '教学章节' }));
  await expectInsideViewport(page, page.getByRole('button', { name: '返回主题首页', exact: true }));
  await expectInsideViewport(page, page.getByRole('button', { name: '资料', exact: true }));
  await expectInsideViewport(page, page.getByRole('button', { name: '上一页', exact: true }));
  await expectInsideViewport(page, page.getByRole('button', { name: unitIndex === patternLesson.units.length - 1 ? '完成小考' : '下一页', exact: true }));
  await expectInsideSurface(page, surface, page.getByRole('button', { name: '直接玩游戏', exact: true }));
  await expect(page.getByRole('button', { name: '直接玩游戏', exact: true })).toBeEnabled();
  await expect(page.locator('.lesson-lead,.lesson-review-lead')).toHaveCount(0);
  if (unit.kind !== 'review') await expect(page.locator('.lesson-question')).toHaveCount(0);
  const tabs = page.locator('.lesson-chapter-name');
  await expect(tabs).toHaveText(['装饰部位', '花叶纹样', '几何纹样', '动物纹样', '组织方式', '色彩', '知识小考']);
  for (const tab of await tabs.all()) {
    await expectInsideViewport(page, tab);
    expect(await tab.evaluate(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      const boxes = [...range.getClientRects()];
      const button = node.closest('button')!.getBoundingClientRect();
      return boxes.length === 1 && boxes[0].height <= parseFloat(getComputedStyle(node).lineHeight) + 1
        && boxes[0].left >= button.left - 1 && boxes[0].right <= button.right + 1;
    })).toBe(true);
  }
  for (const control of await page.locator('.lesson-heading button,.lesson-chapters button,.lesson-image-tools button,.lesson-panel-choices button,.lesson-navigation button').all()) {
    await expectInsideSurface(page, surface, control);
  }
  await expectInsideViewport(page, page.locator('.lesson-copy'));
  await expectInsideSurface(page, surface, page.locator('.lesson-copy'));
  const image = page.getByTestId('lesson-image');
  if (await image.isVisible()) {
    await expectInsideViewport(page, page.getByTestId('lesson-figure'));
    await expectInsideSurface(page, surface, page.getByTestId('lesson-figure'));
    await expectInsideViewport(page, image);
    await expectInsideViewport(page, page.locator('.lesson-figure figcaption'));
    await expect.poll(async () => {
      const box = await image.boundingBox();
      return !!box && box.width > 35 && box.height > 35;
    }, { message: '教学图片必须有可见的实际画面，不能通过压缩为零来消除溢出' }).toBe(true);
  } else {
    expect(unit.kind).toBe('review');
  }
  for (const control of await page.locator('.lesson-image-tools button:visible, .lesson-panel-choices button:visible').all()) {
    await expectInsideViewport(page, control);
  }
  await expectDocumentFits(page);
}

async function inspectTeachingSources(page: Page) {
  const opener = page.getByRole('button', { name: '资料', exact: true });
  // Safari does not retain pointer-button focus. Keyboard entry gives focus
  // restoration a defined target, just as the art-inspector check does below.
  await opener.focus();
  await opener.press('Enter');
  const dialog = page.getByRole('dialog', { name: '教学资料' });
  await expectInsideViewport(page, dialog);
  await expect(dialog).toHaveCSS('border-image-source', /panel-v001\.png/);
  const surface = page.getByTestId('lesson-source-surface');
  await expectInsideSurface(page, surface, dialog.getByRole('button', { name: '关闭教学资料' }));
  await expectInsideSurface(page, surface, dialog.getByRole('button', { name: '返回教学', exact: true }));
  await expectInsideViewport(page, dialog.getByRole('button', { name: '关闭教学资料' }));
  const scrollArea = dialog.locator('.lesson-source-scroll');
  await expect(scrollArea).toHaveCSS('overflow-y', 'auto');
  const finalSource = scrollArea.getByRole('link').last();
  // Center within the permitted internal scroller instead of stopping at a
  // fractional-pixel edge with Chromium's default nearest alignment.
  await finalSource.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expectInsideViewport(page, finalSource);
  await expectInsideViewport(page, dialog.getByRole('button', { name: '返回教学', exact: true }));
  await expectDocumentFits(page);
  await dialog.getByRole('button', { name: '关闭教学资料' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: '资料', exact: true })).toBeFocused();
}

async function inspectLessonImage(page: Page, move = false) {
  const source = page.getByTestId('lesson-image').locator('image');
  const sourceUrl = (await source.getAttribute('href'))!;
  const width = Number(await source.getAttribute('width')), height = Number(await source.getAttribute('height'));
  const opener = page.getByRole('button', { name: '放大查看', exact: true });
  await opener.focus(); await opener.press('Enter');
  const viewer = page.getByTestId('lesson-image-viewer');
  const surface = page.getByTestId('lesson-viewer-surface');
  const stage = page.getByTestId('lesson-viewer-stage');
  const image = page.getByTestId('lesson-viewer-image');
  await expectInsideViewport(page, viewer);
  await expectInsideSurface(page, surface, stage);
  await expectInsideSurface(page, surface, viewer.locator('.lesson-viewer-caption'));
  for (const button of await viewer.getByRole('button').all()) await expectInsideSurface(page, surface, button);
  await expect(stage).toHaveAttribute('data-zoom', '1');
  await expectInsideViewport(page, image);
  await expect.poll(() => image.evaluate(element => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
  const actual = await image.evaluate(element => ({ src: (element as HTMLImageElement).src,
    width: (element as HTMLImageElement).naturalWidth, height: (element as HTMLImageElement).naturalHeight }));
  expect(new URL(actual.src).href).toBe(new URL(sourceUrl, page.url()).href);
  expect([actual.width, actual.height]).toEqual([width, height]);
  if (move) {
    await viewer.getByRole('button', { name: '3×', exact: true }).click();
    await expect(stage).toHaveAttribute('data-zoom', '3');
    await stage.focus(); await stage.press('ArrowRight'); await stage.press('ArrowDown');
    await expect.poll(async () => Math.abs(Number(await stage.getAttribute('data-pan-x'))) + Math.abs(Number(await stage.getAttribute('data-pan-y')))).toBeGreaterThan(0);
    const before = `${await stage.getAttribute('data-pan-x')}:${await stage.getAttribute('data-pan-y')}`;
    const rect = (await stage.boundingBox())!;
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + 30, rect.y + rect.height / 2 + 20, { steps: 4 }); await page.mouse.up();
    await expect.poll(async () => `${await stage.getAttribute('data-pan-x')}:${await stage.getAttribute('data-pan-y')}`).not.toBe(before);
    await viewer.getByRole('button', { name: '复位', exact: true }).click();
    await expect(stage).toHaveAttribute('data-zoom', '1');
    await expect(stage).toHaveAttribute('data-pan-x', '0'); await expect(stage).toHaveAttribute('data-pan-y', '0');
    await expect(image).toHaveAttribute('src', await source.getAttribute('href') ?? '');
    await expectInsideViewport(page, image);
  }
  await viewer.getByRole('button', { name: '关闭图像查看器', exact: true }).click();
  await expect(viewer).toBeHidden(); await expect(opener).toBeFocused();
  await expect(source).toHaveAttribute('href', sourceUrl);
  await expectDocumentFits(page);
}

async function completeTeaching(page: Page, inspectInteractions = false) {
  await expect(page.getByTestId('teaching-screen')).toBeVisible();
  for (let index = 0; index < patternLesson.units.length; index++) {
    const unit = patternLesson.units[index];
    await expectTeachingFits(page, index);
    if (inspectInteractions && index === 0) {
      // A student can inspect individual decoration positions without leaving the screen.
      const choices = page.getByRole('group', { name: '选择观察内容' });
      await choices.getByRole('button', { name: unit.panels[1].label, exact: true }).click();
      await expect(choices.getByRole('button', { name: unit.panels[1].label, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expectTeachingFits(page, index);
      await choices.getByRole('button', { name: unit.panels[0].label, exact: true }).click();
      await page.getByRole('button', { name: '看重点', exact: true }).click();
      await expect(page.getByTestId('lesson-highlight')).not.toHaveCount(0);
      await page.getByRole('button', { name: '返回全图', exact: true }).click();
      const opener = page.getByRole('button', { name: '资料', exact: true });
      await opener.focus();
      await inspectTeachingSources(page);
    }
    if (inspectInteractions && index === 1) {
      await page.getByRole('group', { name: '选择观察内容' }).getByRole('button', { name: '卷草', exact: true }).click();
      await inspectLessonImage(page, true);
    }
    if (index < patternLesson.units.length - 1) {
      await page.getByRole('button', { name: '下一页', exact: true }).click();
      continue;
    }
    const finish = page.getByRole('button', { name: '完成小考', exact: true });
    await expect(page.locator('.lesson-question')).toHaveCount(6);
    await expect(page.locator('.lesson-copy')).toHaveCSS('overflow-y', 'auto');
    await expect(finish).toBeDisabled();
    // A completed guide means participation. Deliberately answer one incorrectly;
    // explanatory feedback must remain available and must not become a score gate.
    for (const [questionIndex, question] of (unit.questions ?? []).entries()) {
      const fieldset = page.getByTestId(`lesson-question-${question.id}`);
      const answer = fieldset.getByRole('button', { name: question.options[questionIndex === 0 ? (question.correctIndex + 1) % question.options.length : question.correctIndex], exact: true });
      await answer.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
      await expectInsideViewport(page, answer);
      await answer.click();
      await expect(fieldset.getByRole('status')).toBeVisible();
      await expectDocumentFits(page);
    }
    await expect(finish).toBeEnabled();
    await expectInsideViewport(page, finish);
    await finish.click();
  }
  await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
}

async function expectGameFits(page: Page) {
  const host = page.getByTestId('phaser-player');
  const canvas = host.locator('canvas');
  await expectInsideViewport(page, canvas);
  await expectInsideViewport(page, page.getByRole('button', { name: '给我提示' }));
  await expectInsideViewport(page, page.getByRole('button', { name: '重新开始' }));
  await expectInsideViewport(page, page.getByRole('button', { name: '放大观察', exact: true }));
  await expect(page.getByRole('button', { name: '学习目标与来源' })).toHaveCount(0);
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
  await expectInsideViewport(page, page.getByRole('heading', { name: '观察完成' }));
  await expectInsideViewport(page, page.getByRole('link', { name: /^返回关卡/ }));
  await expectInsideViewport(page, page.getByRole('button', { name: '再观察一次' }));
  await expectInsideViewport(page, page.getByRole('heading', { name: '文化参考', exact: true }));
  await expectInsideViewport(page, page.getByRole('link', { name: new RegExp(level.source.title) }));
  await expectDocumentFits(page);
}

async function inspectResultReference(page: Page) {
  const reference = page.getByRole('region', { name: '文化参考', exact: true });
  await expectInsideViewport(page, reference);
  const source = reference.getByRole('link', { name: new RegExp(level.source.title) });
  await expectInsideViewport(page, source);
  await expect(source).toHaveAttribute('href', level.source.url);
  const artNote = reference.getByText(level.teachingNote, { exact: true });
  await artNote.scrollIntoViewIfNeeded();
  await expectInsideViewport(page, artNote);
  await expect(artNote).toContainText('开发者');
  await expect(reference).not.toContainText('婧婧');
  await expect(page.locator('.dialog-discoveries')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看发现与文化来源' })).toHaveCount(0);
  await reference.evaluate(element => { element.scrollTop = 0; });
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
  await expectHomeTitle(page);
  await expectInsideViewport(page, page.locator('.theme-patterns'));
  await expectDocumentFits(page);

  await page.goto(gamesUrl);
  await expectInsideViewport(page, page.getByRole('link', { name: '找不同', exact: true }));
  await expectDocumentFits(page);
  await page.goto(levelsUrl);
  await expectInsideViewport(page, page.getByRole('link', { name: /^开始观察/ }).first());
  await expectButtonCentered(page.getByRole('link', { name: /^开始观察/ }).first());
  await expectDocumentFits(page);

  await page.goto('/#/theme/music');
  await expectInsideViewport(page, page.getByRole('heading', { level: 1, name: '飞天、乐舞与服饰' }));
  await expectInsideViewport(page, page.getByRole('link', { name: '返回首页', exact: true }));
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
  await expect(page.getByRole('heading', { name: '观察完成' })).toBeVisible();
  await expectResultFits(page);
}

test.describe('首次学习与游戏层级', () => {
  test.use({ lessonReady: false });

  test('新用户可直接进入玩法、关卡和游玩，学习记录与既有游戏记录保持独立', async ({ page }) => {
    await page.addInitScript(({ key, levelId }) => localStorage.setItem(key, JSON.stringify({
      version: 1, completed: { [levelId]: '2026-10-27T00:00:00.000Z' }, settings: { reducedMotion: false },
    })), { key: progressKey, levelId: level.id });
    await page.goto(gamesUrl);
    await expect(page.getByRole('link', { name: '找不同', exact: true })).toBeVisible();
    await page.goto(levelsUrl);
    await expect(page.getByRole('link', { name: '再次观察', exact: true })).toBeVisible();
    await startGame(page);
    expect(await page.evaluate(key => localStorage.getItem(key), learningKey)).toBeNull();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey))
      .toEqual({ [level.id]: '2026-10-27T00:00:00.000Z' });
  });

  test('首页进入主题先展示教学，顶部可直接玩，跳过小考不会伪记学完', async ({ page }) => {
    await page.goto('/'); await expectHomeTitle(page);
    await expect(page.locator('.theme-patterns')).toHaveAttribute('href', '#/theme/patterns');
    await page.locator('.theme-patterns').click();
    await expectTeachingFits(page, 0);
    await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
    await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
    let record = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).books[id], { key: learningKey, id: patternLesson.id });
    expect(record.completedAt).toBeUndefined();
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
    await page.goto('/'); await expectHomeTitle(page);
    await page.locator('.theme-patterns').click();
    await expect(page).toHaveURL(/#\/theme\/patterns$/);
    await page.getByRole('navigation', { name: '教学章节' }).getByRole('button').last().click();
    await expectTeachingFits(page, patternLesson.units.length - 1);
    await expect(page.getByRole('button', { name: '完成小考', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
    await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
    record = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).books[id], { key: learningKey, id: patternLesson.id });
    expect(record.completedAt).toBeUndefined();
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  });

  test('只答完六题即可交小考，答错可交且不补写未浏览章节', async ({ page }) => {
    await page.goto('/#/theme/patterns'); await expectTeachingFits(page, 0);
    await page.getByRole('navigation', { name: '教学章节' }).getByRole('button').last().click();
    await expectTeachingFits(page, patternLesson.units.length - 1);
    const finish = page.getByRole('button', { name: '完成小考', exact: true });
    await expect(finish).toBeDisabled();
    const questions = patternLesson.units.at(-1)!.questions!;
    for (const [index, question] of questions.entries()) {
      const fieldset = page.getByTestId(`lesson-question-${question.id}`);
      const answer = fieldset.getByRole('button', { name: question.options[index === 0 ? (question.correctIndex + 1) % question.options.length : question.correctIndex], exact: true });
      await answer.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
      await expectInsideViewport(page, answer); await answer.click();
      await expect(fieldset.getByRole('status')).toBeVisible();
    }
    await expect(finish).toBeEnabled(); await finish.click();
    await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
    const record = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).books[id], { key: learningKey, id: patternLesson.id });
    expect(record.visitedIds).toEqual([patternLesson.units[0].id, patternLesson.units.at(-1)!.id]);
    expect(record.completedAt).toBeUndefined();
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  });

  test('真实七屏导览、六题反馈、选择玩法与关卡、完成后返回及复习', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('.theme-patterns').click();
    await expect(page).toHaveURL(/#\/theme\/patterns$/);
    await completeTeaching(page, true);
    const learning = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), learningKey);
    const record = learning.books[patternLesson.id];
    expect(record.contentVersion).toBe(patternLesson.version);
    expect(record.visitedIds).toEqual(patternLesson.units.map(unit => unit.id));
    expect(record.completedAt).toBeTruthy();
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
    await expect(page.locator('.game-choice-card h2')).toHaveText(['找不同', '拼图', '填色']);
    await expect(page.locator('.game-choice-card')).toHaveCount(3);
    await expect(page.locator('a.game-choice-card')).toHaveCount(3);
    await expect(page.getByRole('link', { name: '拼图', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '填色', exact: true })).toBeVisible();
    await page.getByRole('link', { name: '找不同', exact: true }).click();
    await expect(page.getByRole('heading', { name: '找不同关卡', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: '开始观察', exact: true }).first().click();
    await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
    await completeGame(page, testInfo.project.name === 'mobile-chromium');
    await page.getByRole('link', { name: '返回关卡', exact: true }).click();
    await expect(page.locator('.completed-label')).toHaveText('已完成');
    await expectButtonCentered(page.getByRole('link', { name: '再次观察', exact: true }));
    await page.getByRole('button', { name: '返回游戏选择', exact: true }).click();
    await page.getByRole('button', { name: '重看教学', exact: true }).click();
    await expectTeachingFits(page, 0);
    await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
    await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
    expect(await page.evaluate(({ key, bookId }) => JSON.parse(localStorage.getItem(key)!).books[bookId].completedAt,
      { key: learningKey, bookId: patternLesson.id })).toBe(record.completedAt);
    expect(await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).completed), progressKey)).toEqual([level.id]);
    expect(errors).toEqual([]);
  });

  for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
    test(`${viewport.width}×${viewport.height}：七屏教学安全区、卷草查看、六题及资料均能操作`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await page.goto('/#/theme/patterns');
      await completeTeaching(page, true);
      for (const card of await page.locator('.game-choice-card').all()) await expectInsideViewport(page, card);
      await expectDocumentFits(page);
    });
  }

  test('19个教学面板统一提供放大查看，重点按钮只在配置重点时出现', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/#/theme/patterns');
    let count = 0;
    for (const [unitIndex, unit] of patternLesson.units.entries()) {
      await page.getByRole('navigation', { name: '教学章节' }).getByRole('button').nth(unitIndex).click();
      for (const panel of unit.panels) {
        if (unit.panels.length > 1) await page.getByRole('group', { name: '选择观察内容' }).getByRole('button', { name: panel.label, exact: true }).click();
        await expectTeachingFits(page, unitIndex);
        await expect(page.getByRole('button', { name: '放大查看', exact: true })).toHaveCount(1);
        const hasEmphasis = !!panel.focus || !!panel.highlights?.length;
        await expect(page.getByRole('button', { name: '看重点', exact: true })).toHaveCount(hasEmphasis ? 1 : 0);
        const source = page.getByTestId('lesson-image').locator('image');
        const asset = assets.find(item => item.id === panel.imageAssetId)!;
        expect(new URL((await source.getAttribute('href'))!, page.url()).pathname).toBe(asset.path);
        if (unit.kind !== 'review') await expect(page.locator('.lesson-copy h2')).toContainText(panel.label);
        await inspectLessonImage(page, panel.id === 'scroll');
        count++;
      }
    }
    expect(count).toBe(19);
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
    const record = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).books[id], { key: learningKey, id: patternLesson.id });
    expect(record.completedAt).toBeUndefined();
  });

  test('学习记录保存失败保留当前导览并允许重试，不写入游戏完成记录', async ({ page }) => {
    await page.addInitScript(key => {
      const original = Storage.prototype.setItem;
      (window as unknown as { __originalLearningSetter: typeof original }).__originalLearningSetter = original;
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException('测试模拟学习记录不可写', 'QuotaExceededError');
        return original.call(this, name, value);
      };
    }, learningKey);
    await page.goto('/#/theme/patterns');
    await expect(page.getByTestId('learning-save-error')).toBeVisible();
    await expectInsideViewport(page, page.getByRole('button', { name: '重试保存学习记录', exact: true }));
    await page.getByRole('button', { name: '下一页', exact: true }).click();
    await expectTeachingFits(page, 1);
    expect(await page.evaluate(key => localStorage.getItem(key), learningKey)).toBeNull();
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
    await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { __originalLearningSetter: typeof Storage.prototype.setItem }).__originalLearningSetter; });
    await page.getByRole('button', { name: '重试保存学习记录', exact: true }).click();
    await expect(page.getByTestId('learning-save-error')).toHaveCount(0);
    expect(await page.evaluate(({ key, bookId }) => JSON.parse(localStorage.getItem(key)!).books[bookId].visitedIds,
      { key: learningKey, bookId: patternLesson.id }))
      .toEqual(patternLesson.units.slice(0, 2).map(unit => unit.id));
    await expectTeachingFits(page, 1);
  });
});

test.describe('已完成导览的再次访问', () => {
  test.use({ lessonReady: true });
  test('已有学习记录也从首页进入教学，直接玩不改写原完成时间', async ({ page }) => {
    await page.goto('/'); await expectHomeTitle(page);
    await expect(page.locator('.theme-patterns')).toHaveAttribute('href', '#/theme/patterns');
    await page.locator('.theme-patterns').click();
    await expectTeachingFits(page, 0);
    await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
    await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
    const record = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).books[id], { key: learningKey, id: patternLesson.id });
    expect(record.completedAt).toBe('2026-10-28T00:00:00.000Z');
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  });
});

test('1279×925 首页三幅图尺寸相等、保持3:2，题名紧跟图片且按钮正文居中', async ({ page }) => {
  await page.setViewportSize({ width: 1279, height: 925 });
  await page.goto('/');
  await expectHomeTitle(page);
  const cards = page.locator('.select-theme-card');
  await expect(cards).toHaveCount(3);
  const boxes = [];
  for (const card of await cards.all()) {
    const frame = card.getByTestId('theme-picture');
    const image = frame.locator('img');
    await expectInsideViewport(page, card);
    const frameBox = (await frame.boundingBox())!;
    const imageBox = (await image.boundingBox())!;
    const titleBox = (await card.getByRole('heading', { level: 2 }).boundingBox())!;
    expect(Math.abs(frameBox.width / frameBox.height - 1.5)).toBeLessThan(0.001);
    expect(Math.abs(imageBox.width - frameBox.width)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(imageBox.height - frameBox.height)).toBeLessThanOrEqual(0.1);
    const gap = titleBox.y - frameBox.y - frameBox.height;
    expect(gap).toBeGreaterThanOrEqual(12);
    expect(gap).toBeLessThanOrEqual(16);
    boxes.push(frameBox);
  }
  for (const box of boxes.slice(1)) {
    expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(box.height - boxes[0].height)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(box.y - boxes[0].y)).toBeLessThanOrEqual(0.1);
  }
  await expectDocumentFits(page);
  await page.goto(levelsUrl);
  await expectButtonCentered(page.getByRole('link', { name: '开始观察', exact: true }).first());
  await startGame(page);
  await expectButtonCentered(page.getByRole('button', { name: '给我提示', exact: true }));
});

test('首页主题、三个玩法与关卡分别导航，未开放内容没有假入口', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: '敦煌寻宝记' })).toBeVisible();
  await expect(page.locator('a[href*="/play/"]')).toHaveCount(0);
  await expect(page.getByText('开始第一次观察')).toHaveCount(0);
  await expect(page.locator('.theme-row')).toHaveCount(3);
  await expectInsideViewport(page, page.locator('.theme-patterns'));
  await expectDocumentFits(page);
  const selectMusic = page.getByRole('button', { name: '查看主题：飞天、乐舞与服饰' });
  if (await selectMusic.isVisible()) await selectMusic.click();
  await page.locator('.theme-music').click();
  await expect(page.getByRole('heading', { level: 1, name: '飞天、乐舞与服饰' })).toBeVisible();
  await expect(page.getByText('主题尚未开放', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /^开始观察/ }).first()).toHaveCount(0);
  const back = page.getByRole('link', { name: '返回首页', exact: true });
  await back.locator('img').click();
  await expect(page).toHaveURL(/#\/$/);
  // Hash navigation updates the URL before React renders the home screen.
  // Wait for that screen before asking whether its mobile-only switch exists.
  await expect(page.getByRole('heading', { level: 1, name: '敦煌寻宝记' })).toBeVisible();
  const selectPatterns = page.getByRole('button', { name: '查看主题：纹样与色彩' });
  if (await selectPatterns.isVisible()) await selectPatterns.click();
  await page.locator('.theme-patterns').click();
  await expect(page).toHaveURL(/#\/theme\/patterns$/);
  await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
  await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
  await expect(page.locator('.game-choice-card h2')).toHaveText(['找不同', '拼图', '填色']);
  await expect(page.getByRole('link', { name: '拼图', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '填色', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '找不同', exact: true }).click();
  await expect(page).toHaveURL(/#\/theme\/patterns\/games\/spot-difference$/);
  await expect(page.getByRole('heading', { level: 1, name: '找不同关卡', exact: true })).toBeVisible();
  expect(await page.locator('.level-row').count()).toBeGreaterThan(0);
  await expectButtonCentered(page.getByRole('link', { name: /^开始观察/ }).first());
  const backToGames = page.getByRole('button', { name: '返回游戏选择', exact: true });
  await backToGames.focus();
  await backToGames.press('Enter');
  await expect(page).toHaveURL(/#\/theme\/patterns\/games$/);
  await expectDocumentFits(page);
  expect(errors).toEqual([]);
});

test('六关规划位清楚区分已开放与筹备中，筹备位不生成游戏记录', async ({ page }) => {
  const titles = ['藻井寻踪', '莲瓣与团花', '忍冬与卷草', '联珠与几何', '三兔与旋转', '色彩与层次'];
  for (const viewport of [{ width: 1279, height: 925 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto(levelsUrl);
    // The ResizeObserver changes the number of cards after the viewport changes.
    // Wait for that layout before taking an array of locators for the current page.
    await expect(page.locator('.level-select-screen')).toHaveAttribute('data-page-size', viewport.width === 1279 ? '6' : '2');
    await expect(page.getByTestId('level-catalog-summary')).toHaveText(`共 6 关${availableDifferenceCount} 关开放`);
    // A same-address navigation can preserve the current React page in Chromium.
    // Traverse back through the real pager before collecting every planned slot.
    const previous = page.getByRole('button', { name: '上一页', exact: true });
    for (let step = 0; step < 6 && await previous.count() && await previous.isEnabled(); step++) {
      const pager = page.locator('.selection-pagination > span');
      const previousPage = await pager.textContent();
      await previous.click();
      await expect(pager).not.toHaveText(previousPage!);
    }
    if (await previous.count()) await expect(previous).toBeDisabled();
    const seen = new Set<string>();
    for (let pageIndex = 0; pageIndex < 6; pageIndex++) {
      const cards = page.locator('.level-choice-card');
      await expect(cards.first()).toBeVisible();
      if (viewport.width === 1279) await expect(cards).toHaveCount(6);
      for (const card of await cards.all()) {
        await expectInsideViewport(page, card);
        seen.add((await card.getByRole('heading', { level: 2 }).textContent())!);
        if (await card.getAttribute('data-status') === 'planned') {
          await expect(card).toContainText('筹备中');
          await expect(card).toContainText('待制作');
          await expect(card.getByRole('link')).toHaveCount(0);
          await expect(card.getByRole('button')).toHaveCount(0);
          await expect(card.locator('.completed-label')).toHaveCount(0);
        }
      }
      await expectDocumentFits(page);
      const next = page.getByRole('button', { name: '下一页', exact: true });
      if (!await next.count() || !await next.isEnabled()) break;
      const pager = page.locator('.selection-pagination > span');
      const previousPage = await pager.textContent();
      await next.click();
      await expect(pager).not.toHaveText(previousPage!);
    }
    expect([...seen]).toEqual(titles);
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  }
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
  await expectResultFits(page);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed['patterns-intro'], progressKey)).toBe(completedAt);
  await page.getByRole('button', { name: '再观察一次' }).click();
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(0));
  const afterReplay = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(afterReplay.completed['patterns-intro']).toBe(completedAt);
  await page.goto(levelsUrl);
  await expect(page.locator('.completed-label')).toContainText('已完成');
  await expectInsideViewport(page, page.getByRole('link', { name: /^再次观察/ }));
  await expectDocumentFits(page);
  expect(errors).toEqual([]);
});

test('中途退出与多次进入不残留局内发现状态', async ({ page }) => {
  await startGame(page); await clickDifference(page, 0, 'reference');
  await page.getByRole('link', { name: '返回找不同关卡', exact: true }).locator('img').click();
  await expect(page).toHaveURL(/#\/theme\/patterns\/games\/spot-difference$/);
  await page.getByRole('link', { name: /^开始观察/ }).first().click();
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
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { __originalStorageSetter: typeof Storage.prototype.setItem }).__originalStorageSetter; });
  await page.getByTestId('retry-save').click();
  await expect(page.getByTestId('save-error')).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).completed), progressKey)).toEqual(['patterns-intro']);
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

test('忍冬卷草圆润红瓣：变化图的主区域与附加区域都渲染B', async ({ page }) => {
  const scrolls = allLevels.find(item => item.id === 'patterns-scrolls') as SpotDifferenceLevel;
  const changedAsset = assets.find(asset => asset.id === scrolls.editedAssetId)!;
  expect(changedAsset.path).toMatch(/patterns-scrolls-b-v002\.png$/);
  const petal = scrolls.differences.find(item => item.id === 'upper-red-petal-tip')!;
  expect(petal.additionalRegions).toHaveLength(3);
  const sourcePoints = [{ x: 516, y: 353 }, { x: 360, y: 515 }, { x: 890, y: 730 }, { x: 740, y: 885 }];
  const outsidePoint = { x: 1060, y: 150 };
  const assetRoute = `**${changedAsset.path}*`;
  // The real level keeps its five IDs and regions. A temporary solid B makes
  // omitted extra crops visible even when the phone renders the petals small.
  await page.route(assetRoute, async route => {
    await route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${changedAsset.width}" height="${changedAsset.height}"><rect width="100%" height="100%" fill="#ff00ff"/></svg>` });
  });
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ version: 1, completed: {}, settings: { reducedMotion: true } })), progressKey);
  await page.goto(`/#/play/${scrolls.id}`);
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
  const host = page.getByTestId('phaser-player');
  const canvas = host.locator('canvas');
  const sourcePosition = async (point: { x: number; y: number }, side: 'reference' | 'edited') => {
    const layout = JSON.parse((await host.getAttribute('data-layout'))!) as Layout;
    const image = layout[side];
    return { x: image.x + point.x / changedAsset.width * image.width,
      y: image.y + point.y / changedAsset.height * image.height };
  };
  const renderedSamples = await Promise.all([...sourcePoints, outsidePoint].map(point => sourcePosition(point, 'edited')));
  const screenshot = await canvas.screenshot({ scale: 'css', animations: 'disabled' });
  const pixels = await page.evaluate(async ({ png, points }) => {
    const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
    const surface = document.createElement('canvas'); surface.width = image.width; surface.height = image.height;
    const context = surface.getContext('2d')!; context.drawImage(image, 0, 0);
    return points.map(point => [...context.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data].slice(0, 3));
  }, { png: screenshot.toString('base64'), points: renderedSamples });
  for (const pixel of pixels.slice(0, 4)) expect(pixel).toEqual([255, 0, 255]);
  expect(pixels[4]).not.toEqual([255, 0, 255]);
});

test('忍冬卷草圆润红瓣：四边首次点击共用第五处且中央独立，五处可完成', async ({ page }, testInfo) => {
  const scrolls = allLevels.find(item => item.id === 'patterns-scrolls') as SpotDifferenceLevel;
  const changedAsset = assets.find(asset => asset.id === scrolls.editedAssetId)!;
  expect(changedAsset.path).toMatch(/patterns-scrolls-b-v002\.png$/);
  const sourcePoints = [{ x: 516, y: 353 }, { x: 360, y: 515 }, { x: 890, y: 730 }, { x: 740, y: 885 }];
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ version: 1, completed: {}, settings: { reducedMotion: true } })), progressKey);
  const actualImage = page.waitForResponse(response => new URL(response.url()).pathname === changedAsset.path && response.status() === 200);
  await page.goto(`/#/play/${scrolls.id}`);
  await actualImage;
  await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
  await expectDocumentFits(page);
  const host = page.getByTestId('phaser-player');
  const canvas = host.locator('canvas');
  const clickPoint = async (point: { x: number; y: number }, side: 'reference' | 'edited') => {
    const layout = JSON.parse((await host.getAttribute('data-layout'))!) as Layout;
    const image = layout[side];
    const position = { x: image.x + point.x / changedAsset.width * image.width,
      y: image.y + point.y / changedAsset.height * image.height };
    if (testInfo.project.name === 'mobile-chromium') await canvas.tap({ position });
    else await canvas.click({ position });
  };
  const center = scrolls.differences.find(item => item.id === 'central-flower')!.region;
  const centerPoint = { x: (center.x + center.width / 2) * changedAsset.width,
    y: (center.y + center.height / 2) * changedAsset.height };
  for (const [index, firstPoint] of sourcePoints.entries()) {
    if (index > 0) await page.getByRole('button', { name: '重新开始', exact: true }).click();
    await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(0, 5));
    const side = index % 2 ? 'reference' : 'edited';
    await clickPoint(firstPoint, side);
    await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(1, 5));
    await clickPoint(sourcePoints[(index + 1) % sourcePoints.length], side === 'edited' ? 'reference' : 'edited');
    await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(1, 5));
    await clickPoint(centerPoint, 'edited');
    await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(2, 5));
  }
  const remaining = scrolls.differences.filter(item => !['upper-red-petal-tip', 'central-flower'].includes(item.id));
  for (const [index, difference] of remaining.entries()) {
    const region = difference.region;
    await clickPoint({ x: (region.x + region.width / 2) * changedAsset.width,
      y: (region.y + region.height / 2) * changedAsset.height }, index % 2 ? 'reference' : 'edited');
    if (index < remaining.length - 1) await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(index + 3, 5));
  }
  await expect(page).toHaveURL(/#\/result\/patterns-scrolls$/);
  await expect(page.locator('.result-count')).toContainText('5');
  expect(await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).completed), progressKey)).toEqual([scrolls.id]);
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
    await inspectArtwork(page);
    await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', progressLabel(0));
    await page.getByRole('button', { name: '给我提示' }).click();
    await page.getByRole('button', { name: '给我提示' }).click();
    await expect(page.getByTestId('hint-status')).toContainText(level.differences[0].detailHint);
    await expectGameFits(page);
    await completeGame(page, testInfo.project.name === 'mobile-chromium');
    await inspectResultReference(page);
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
  for (const viewport of [{ width: 1000, height: 600 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('.theme-patterns').click();
    await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
    await page.getByRole('link', { name: '找不同', exact: true }).click();
    const seen = new Set<string>();
    for (let pageIndex = 0; pageIndex < 12; pageIndex++) {
      const cards = page.locator('.level-choice-card');
      await expect(cards.first()).toBeVisible();
      for (const card of await cards.all()) {
        await expectInsideViewport(page, card);
        if (await card.getAttribute('data-status') === 'planned') {
          await expect(card.getByRole('link')).toHaveCount(0);
          await expect(card).toContainText('筹备中');
          continue;
        }
        const links = card.getByRole('link');
        await expect(links).toHaveCount(3);
        const href = await links.first().getAttribute('href');
        for (const link of await links.all()) {
          await expectInsideViewport(page, link);
          await expect(link).toHaveAttribute('href', href!);
        }
        seen.add(href!);
      }
      await expectDocumentFits(page);
      const next = page.getByRole('button', { name: '下一页' });
      if (!await next.count() || !await next.isEnabled()) break;
      const pager = page.locator('.selection-pagination > span');
      const previousPage = await pager.textContent();
      await next.click();
      await expect(pager).not.toHaveText(previousPage!);
    }
    expect(seen.size).toBe(levels.length);
  }
});
