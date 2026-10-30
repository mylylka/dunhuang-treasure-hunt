import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { AssetDefinition, Level, PuzzleLevel, SpotDifferenceLevel } from '../../src/types';
import type { PieceLayout, PuzzleLayout } from '../../src/games/puzzle/rules';
import { puzzleRoadmap } from '../../src/content/level-roadmap';

const levels = readdirSync('src/content/levels').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level);
const puzzles = levels.filter((level): level is PuzzleLevel => level.gameType === 'puzzle');
const rotations = puzzles.filter(level => level.mode === 'rotation');
const jigsaws = puzzles.filter(level => level.mode === 'jigsaw');
const observations = levels.filter((level): level is SpotDifferenceLevel => level.gameType === 'spot-difference');
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const progressKey = 'dunhuang:progress:v1';
const learningKey = 'dunhuang:learning:v1';
const imageLoadTimeout = 45_000;
const puzzleDirectory = '/#/theme/patterns/games/puzzle';
test.setTimeout(60_000);

async function layout(page: Page): Promise<PuzzleLayout> {
  const raw = await page.getByTestId('phaser-player').getAttribute('data-layout');
  return JSON.parse(raw!);
}
async function layoutSettled(page: Page) {
  const host = page.getByTestId('phaser-player');
  await expect.poll(async () => {
    const bounds = await host.boundingBox();
    const current = JSON.parse((await host.getAttribute('data-layout'))!);
    return Boolean(bounds && current.width === Math.floor(bounds.width) && current.height === Math.floor(bounds.height));
  }).toBe(true);
}
async function fits(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    vertical: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
    x: scrollX, y: scrollY,
  }))).toEqual({ horizontal: 0, vertical: 0, x: 0, y: 0 });
}
async function startPuzzle(page: Page, level: PuzzleLevel) {
  await page.goto(`/#/play/${level.id}`);
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  const host = page.getByTestId('phaser-player');
  await expect(host).toHaveAttribute('data-game-type', 'puzzle');
  await expect(host.locator('canvas')).toHaveCount(1);
  await expect(host.locator('canvas')).toBeInViewport({ ratio: 0.999 });
  for (const name of ['查看原图', '重新拼图', '拼图提示']) await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 0.999 });
  const current = await layout(page);
  expect(current.pieces).toHaveLength(level.rows * level.columns);
  expect(current.board.width / current.board.height).toBeCloseTo(assets.find(asset => asset.id === level.imageAssetId)!.width / assets.find(asset => asset.id === level.imageAssetId)!.height, 6);
  await fits(page);
}
async function clickAt(page: Page, rectangle: { x: number; y: number; width: number; height: number }) {
  await page.getByTestId('phaser-player').locator('canvas').click({ position: {
    x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2,
  } });
}
async function dragPiece(page: Page, piece: PieceLayout, target = piece.targetRect) {
  const source = piece.displayRect!;
  const canvas = (await page.getByTestId('phaser-player').locator('canvas').boundingBox())!;
  await page.mouse.move(canvas.x + source.x + source.width / 2, canvas.y + source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvas.x + target.x + target.width / 2, canvas.y + target.y + target.height / 2, { steps: 6 });
  await page.mouse.up();
}
async function scrollTray(page: Page, offset: number) {
  const current = await layout(page);
  if (!current.tray || Math.abs(current.trayScroll - offset) <= 1) return;
  const canvas = (await page.getByTestId('phaser-player').locator('canvas').boundingBox())!;
  await page.mouse.move(canvas.x + current.tray.x + current.tray.width / 2,
    canvas.y + current.tray.y + current.tray.height / 2);
  const chromium = page.context().browser()?.browserType().name() === 'chromium';
  // In the Pixel 7 CDP emulation (DPR 2.625), a requested 27.1498px wheel
  // reaches the canvas as deltaY 10.34278px. Compensate only this coarse-pointer
  // Chromium input path; desktop Chrome and WebKit already deliver CSS pixels.
  const wheelScale = chromium ? await page.evaluate(() => matchMedia('(pointer: coarse)').matches ? devicePixelRatio : 1) : 1;
  await page.mouse.wheel(0, (offset - current.trayScroll) * wheelScale);
  await expect.poll(async () => Math.abs((await layout(page)).trayScroll - offset)).toBeLessThanOrEqual(1);
}
async function scrollTrayEdge(page: Page, bottom: boolean) {
  const current = await layout(page);
  await scrollTray(page, bottom ? current.trayMaxScroll : 0);
}
async function countIs(page: Page, count: number, level: PuzzleLevel) {
  await expect(page.getByTestId('puzzle-progress')).toHaveAttribute('aria-label', `已归位 ${count} 块，共 ${level.rows * level.columns} 块`);
}
async function noCompletion(page: Page, level: PuzzleLevel) {
  expect(await page.evaluate(({ key, id }) => Boolean(JSON.parse(localStorage.getItem(key) ?? '{"completed":{}}').completed[id]),
    { key: progressKey, id: level.id })).toBe(false);
}
async function solveRotation(page: Page, level: PuzzleLevel) {
  const initial = await layout(page);
  const unfinished = initial.pieces.filter(piece => piece.turns !== 0);
  for (const [index, piece] of unfinished.entries()) {
    const needed = (4 - piece.turns) % 4;
    for (let turn = 1; turn <= needed; turn++) {
      await clickAt(page, (await layout(page)).pieces[piece.id].targetRect);
      const last = index === unfinished.length - 1 && turn === needed;
      if (last) await expect(page).toHaveURL(new RegExp(`/#/result/${level.id}$`));
      else {
        await expect.poll(async () => (await layout(page)).pieces[piece.id].turns).toBe((piece.turns + turn) % 4);
        await noCompletion(page, level);
      }
    }
  }
}

async function verifyNextPuzzle(page: Page, level: PuzzleLevel) {
  const actualIds = new Set(puzzles.map(puzzle => puzzle.id));
  const orderedIds = puzzleRoadmap.filter(entry => actualIds.has(entry.id)).map(entry => entry.id);
  const nextId = orderedIds[orderedIds.indexOf(level.id) + 1];
  const next = page.getByRole('link', { name: '下一关', exact: true });
  if (!nextId) {
    await expect(next).toHaveCount(0);
    return;
  }
  await expect(next).toHaveAttribute('href', `#/play/${nextId}`);
  await expect(next).toBeInViewport({ ratio: 0.999 });
  await next.click();
  await expect(page).toHaveURL(new RegExp(`/#/play/${nextId}$`));
  const nextLevel = puzzles.find(puzzle => puzzle.id === nextId)!;
  await expect(page.getByRole('heading', { name: nextLevel.title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await noCompletion(page, nextLevel);
  await fits(page);
}

test('拼图目录有六个位置、三关实际内容，筹备位不可玩且手机分页可达', async ({ page }) => {
  expect(puzzles).toHaveLength(3);
  expect(rotations).toHaveLength(1);
  expect(jigsaws.map(level => level.rows * level.columns).sort((a, b) => a - b)).toEqual([12, 20]);
  expect(puzzleRoadmap).toHaveLength(6);
  const formalIds = new Set(puzzles.map(level => level.id));
  for (const viewport of [{ width: 1289, height: 930 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto(puzzleDirectory);
    await expect(page.getByRole('heading', { name: '拼图关卡', exact: true })).toBeVisible();
    await expect(page.locator('.level-select-screen')).toHaveAttribute('data-page-size', viewport.width === 1289 ? '6' : '2');
    await expect(page.getByTestId('level-catalog-summary')).toHaveText('共 6 关3 关开放');
    // Resizing preserves the selected page. Traverse back before auditing the complete directory.
    const previous = page.getByRole('button', { name: '上一页', exact: true });
    while (await previous.count() && await previous.isEnabled()) {
      const before = await page.locator('.level-choice-card').first().getAttribute('data-level-id');
      await previous.click();
      await expect(page.locator('.level-choice-card').first()).not.toHaveAttribute('data-level-id', before!);
    }
    await expect(page.locator('.level-choice-card').first()).toHaveAttribute('data-level-id', puzzleRoadmap[0].id);
    const seen = new Map<string, string>();
    for (let pageIndex = 0; pageIndex < puzzleRoadmap.length; pageIndex++) {
      const cards = page.locator('.level-choice-card');
      for (const card of await cards.all()) {
        const id = (await card.getAttribute('data-level-id'))!;
        const status = (await card.getAttribute('data-status'))!;
        seen.set(id, status);
        await expect(card).toBeInViewport({ ratio: 0.999 });
        if (formalIds.has(id)) {
          expect(status).toBe('available');
          await expect(card.locator('a')).toHaveCount(3);
          for (const link of await card.locator('a').all()) await expect(link).toHaveAttribute('href', `#/play/${id}`);
          await expect(card.locator('.selected-level-start')).toHaveText('开始拼图');
        } else {
          expect(status).toBe('planned');
          await expect(card.getByText('筹备中', { exact: true })).toBeVisible();
          await expect(card.locator('a')).toHaveCount(0);
        }
      }
      await fits(page);
      const next = page.getByRole('button', { name: '下一页', exact: true });
      if (!await next.count() || !await next.isEnabled()) break;
      const before = await cards.first().getAttribute('data-level-id');
      await next.click();
      await expect(cards.first()).not.toHaveAttribute('data-level-id', before!);
    }
    expect([...seen.keys()].sort()).toEqual(puzzleRoadmap.map(entry => entry.id).sort());
    expect([...seen.values()].filter(status => status === 'available')).toHaveLength(3);
  }
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
});

test('关卡封面和标题均可进入，已完成拼图的按钮仍为开始拼图', async ({ page }) => {
  const level = rotations[0]!;
  await page.addInitScript(({ key, id }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, completed: { [id]: '2026-10-29T00:00:00.000Z' }, settings: { reducedMotion: true } }));
  }, { key: progressKey, id: level.id });
  await page.goto(puzzleDirectory);
  const card = page.locator(`.level-choice-card[data-level-id="${level.id}"]`);
  await expect(card.locator('.completed-label')).toHaveText('已完成');
  await expect(card.locator('.selected-level-start')).toHaveText('开始拼图');
  await card.locator('.selected-level-cover-link').click();
  await expect(page.getByRole('heading', { name: level.title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await page.getByRole('button', { name: '返回拼图关卡', exact: true }).click();
  const title = page.locator(`.level-choice-card[data-level-id="${level.id}"] .selected-level-title-link`);
  await title.focus(); await title.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/#/play/${level.id}$`));
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await fits(page);
});

test('九块旋转以真实点击恢复，提示和查看原图不提前完成，存档与旧记录独立', async ({ page }) => {
  const level = rotations[0]!;
  const previousProgress = { version: 1, completed: { 'patterns-intro': '2026-10-28T00:00:00.000Z' }, settings: { reducedMotion: true } };
  const previousLearning = JSON.stringify({ version: 1, books: { 'existing-book': { contentVersion: 1, visitedIds: ['existing-unit'] } } });
  await page.addInitScript(({ progressKey, learningKey, previousProgress, previousLearning }) => {
    if (!localStorage.getItem(progressKey)) localStorage.setItem(progressKey, JSON.stringify(previousProgress));
    if (!localStorage.getItem(learningKey)) localStorage.setItem(learningKey, previousLearning);
  }, { progressKey, learningKey, previousProgress, previousLearning });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startPuzzle(page, level);
  const scrambled = (await layout(page)).pieces.map(piece => piece.turns);
  expect(scrambled.some(turn => turn !== 0)).toBe(true);
  await noCompletion(page, level);
  for (let attempt = 0; attempt < 3; attempt++) await page.getByRole('button', { name: '拼图提示', exact: true }).click();
  expect((await layout(page)).pieces.map(piece => piece.turns)).toEqual(scrambled);
  await noCompletion(page, level);
  await page.getByRole('button', { name: '查看原图', exact: true }).click();
  const reference = page.getByRole('dialog', { name: `${level.title} · 原图`, exact: true });
  await expect(reference.locator('img')).toBeInViewport({ ratio: 0.999 });
  await reference.getByRole('button', { name: '返回拼图', exact: true }).click();
  expect((await layout(page)).pieces.map(piece => piece.turns)).toEqual(scrambled);
  await solveRotation(page, level);
  await expect(page.getByRole('heading', { name: '拼图完成', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: '拼合完成的完整图像', exact: true })).toBeInViewport({ ratio: 0.999 });
  await expect(page.locator('.result-reference-link a')).toHaveAttribute('href', 'https://www.sina.cn/news/detail/5337906056003855.html');
  await expect(page.locator('.result-reference-link a')).toContainText('敦煌莫高窟北魏宝池莲花平棋临摹品');
  await expect(page.locator('.result-reference')).not.toContainText('可从中心、边带和重复排列观察');
  await expect(page.locator('.result-reference')).not.toContainText('保留原有来源水印');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey);
  expect(saved.completed['patterns-intro']).toBe(previousProgress.completed['patterns-intro']);
  expect(saved.completed[level.id]).toMatch(/^\d{4}-\d\d-\d\dT/);
  expect(saved.settings).toEqual(previousProgress.settings);
  expect(Object.keys(saved.completed).sort()).toEqual(['patterns-intro', level.id].sort());
  expect(await page.evaluate(key => localStorage.getItem(key), learningKey)).toBe(previousLearning);
  await page.reload();
  await expect(page.getByRole('heading', { name: '拼图完成', exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)).toEqual(saved);
  expect(await page.evaluate(key => localStorage.getItem(key), learningKey)).toBe(previousLearning);
  await verifyNextPuzzle(page, level);
});

for (const level of jigsaws) {
  test(`${level.title}用真实拖拽拼回全部${level.rows * level.columns}片，错误位置不计数`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startPuzzle(page, level);
    await countIs(page, 0, level);
    let current = await layout(page);
    const first = current.pieces.find(piece => !piece.placed && piece.fullyVisible && piece.displayRect)!;
    const wrong = current.pieces.find(piece => piece.id !== first.id)!;
    // A corner outside the curved sprite is transparent and must not select its rectangular bounding box.
    await page.getByTestId('phaser-player').locator('canvas').click({ position: { x: first.displayRect!.x + .5, y: first.displayRect!.y + .5 } });
    expect((await layout(page)).selectedPieceId).toBeNull();
    await dragPiece(page, first, wrong.targetRect);
    await countIs(page, 0, level);
    expect((await layout(page)).pieces.every(piece => !piece.placed)).toBe(true);
    await expect(page.getByTestId('puzzle-hint-status')).toContainText('还没对上');
    await page.getByRole('button', { name: '拼图提示', exact: true }).click();
    await countIs(page, 0, level);
    await noCompletion(page, level);
    const total = level.rows * level.columns;
    for (let count = 1; count <= total; count++) {
      await layoutSettled(page);
      // Alternate the native wheel between tray ends so offscreen pieces are used too.
      await scrollTrayEdge(page, count % 2 === 1);
      current = await layout(page);
      const piece = current.pieces.find(item => !item.placed && item.fullyVisible && item.displayRect)!;
      expect(piece).toBeTruthy();
      await dragPiece(page, piece);
      if (count < total) { await countIs(page, count, level); await noCompletion(page, level); }
      else await expect(page).toHaveURL(new RegExp(`/#/result/${level.id}$`));
    }
    await expect(page.getByRole('heading', { name: '拼图完成', exact: true })).toBeVisible();
    await fits(page);
    const completed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey);
    expect(Object.keys(completed)).toEqual([level.id]);
    expect(await page.evaluate(key => localStorage.getItem(key), learningKey)).toBeNull();
    await page.reload();
    await expect(page.getByRole('heading', { name: '拼图完成', exact: true })).toBeVisible();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).completed, progressKey)).toEqual(completed);
    await verifyNextPuzzle(page, level);
  });
}

test('碎片区连续滚动、裁切命中、提示定位与触滑不会代替拼片', async ({ page }, testInfo) => {
  const level = jigsaws.find(item => item.rows * item.columns === 20)!;
  await page.setViewportSize({ width: 360, height: 640 });
  await startPuzzle(page, level);
  let current = await layout(page);
  expect(current.trayMaxScroll).toBeGreaterThan(0);
  const scrollbar = page.getByTestId('puzzle-tray-scrollbar');
  await expect(scrollbar).toBeInViewport({ ratio: 0.999 });
  await expect(page.getByRole('button', { name: '上一组', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '下一组', exact: true })).toHaveCount(0);
  const initialVisible = current.pieces.filter(piece => !piece.placed && piece.fullyVisible).map(piece => piece.id);
  // A fraction of a row must really clip sprites, rather than swap a whole page.
  await scrollTray(page, current.trayRowHeight / 2);
  current = await layout(page);
  expect(current.pieces.some(piece => !piece.placed && piece.visible && !piece.fullyVisible)).toBe(true);
  const tray = current.tray!;
  await page.getByTestId('phaser-player').locator('canvas').click({ position: { x: tray.x + tray.width / 2, y: tray.y - 2 } });
  expect((await layout(page)).selectedPieceId).toBeNull();
  await countIs(page, 0, level);

  // Keyboard scrolling exercises the real overflow element, including accessibility.
  await scrollbar.focus(); await scrollbar.press('End');
  await expect.poll(async () => { const state = await layout(page); return Math.abs(state.trayScroll - state.trayMaxScroll); }).toBeLessThanOrEqual(1);
  current = await layout(page);
  const bottomVisible = current.pieces.filter(piece => !piece.placed && piece.fullyVisible).map(piece => piece.id);
  expect(bottomVisible).not.toEqual(initialVisible);
  const selected = current.pieces.find(piece => !piece.placed && piece.fullyVisible && piece.displayRect)!;
  await clickAt(page, selected.displayRect!);
  await expect.poll(async () => (await layout(page)).selectedPieceId).toBe(selected.id);
  await scrollbar.focus(); await scrollbar.press('Home');
  await expect.poll(async () => (await layout(page)).trayScroll).toBeLessThanOrEqual(1);
  expect((await layout(page)).pieces[selected.id].fullyVisible).toBe(false);
  await page.getByRole('button', { name: '拼图提示', exact: true }).click();
  await expect.poll(async () => (await layout(page)).pieces[selected.id].fullyVisible).toBe(true);
  expect((await layout(page)).highlightedId).toBe(selected.id);
  await countIs(page, 0, level);

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: '重新拼图', exact: true }).click();
    await countIs(page, 0, level);
    current = await layout(page);
    const canvas = (await page.getByTestId('phaser-player').locator('canvas').boundingBox())!;
    const client = await page.context().newCDPSession(page);
    const x = canvas.x + current.tray!.x + 1;
    const startY = canvas.y + current.tray!.y + current.tray!.height - 8;
    const endY = canvas.y + current.tray!.y + 8;
    try {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
      for (let step = 1; step <= 6; step++) await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x, y: startY + (endY - startY) * step / 6 }],
      });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally { await client.detach(); }
    await expect.poll(async () => (await layout(page)).trayScroll).toBeGreaterThan(10);
    expect((await layout(page)).selectedPieceId).toBeNull();
    await countIs(page, 0, level);
  }
  await noCompletion(page, level);
  await fits(page);
});

test('碎片可选片后点击归位，重开和退出重进重置，横竖屏切换保留本局', async ({ page }) => {
  const level = jigsaws[jigsaws.length - 1]!;
  await startPuzzle(page, level);
  const chosen = (await layout(page)).pieces.find(piece => !piece.placed && piece.fullyVisible && piece.displayRect)!;
  await clickAt(page, chosen.displayRect!);
  await expect.poll(async () => (await layout(page)).selectedPieceId).toBe(chosen.id);
  await clickAt(page, chosen.targetRect);
  await countIs(page, 1, level);
  for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await layoutSettled(page);
    await countIs(page, 1, level);
    await expect(page.getByTestId('phaser-player').locator('canvas')).toHaveCount(1);
    await expect(page.getByTestId('phaser-player').locator('canvas')).toBeInViewport({ ratio: 0.999 });
    const current = await layout(page);
    expect(current.pieces.find(piece => piece.id === chosen.id)!.placed).toBe(true);
    expect(current.trayMaxScroll).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: '上一组', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '下一组', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('puzzle-tray-scrollbar')).toBeInViewport({ ratio: 0.999 });
    await scrollTrayEdge(page, true);
    await countIs(page, 1, level);
    await scrollTrayEdge(page, false);
    await fits(page);
  }
  await page.getByRole('button', { name: '重新拼图', exact: true }).click();
  await countIs(page, 0, level);
  expect((await layout(page)).pieces.every(piece => !piece.placed)).toBe(true);
  const again = (await layout(page)).pieces.find(piece => !piece.placed && piece.fullyVisible && piece.displayRect)!;
  await clickAt(page, again.displayRect!); await clickAt(page, again.targetRect);
  await countIs(page, 1, level);
  await page.getByRole('button', { name: '返回拼图关卡', exact: true }).click();
  await expect(page.getByRole('heading', { name: '拼图关卡', exact: true })).toBeVisible();
  await startPuzzle(page, level);
  await countIs(page, 0, level);
  await noCompletion(page, level);
});

test('旋转拼图转动状态在横竖屏间保持，重开恢复本关初始乱序', async ({ page }) => {
  const level = rotations[0]!;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startPuzzle(page, level);
  const initial = (await layout(page)).pieces.map(piece => piece.turns);
  await clickAt(page, (await layout(page)).pieces[0].targetRect);
  const edited = (await layout(page)).pieces.map(piece => piece.turns);
  expect(edited[0]).toBe((initial[0] + 1) % 4);
  for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await layoutSettled(page);
    await expect.poll(async () => (await layout(page)).pieces.map(piece => piece.turns)).toEqual(edited);
    await expect(page.getByTestId('phaser-player').locator('canvas')).toHaveCount(1);
    await expect(page.getByTestId('phaser-player').locator('canvas')).toBeInViewport({ ratio: 0.999 });
    await fits(page);
  }
  await page.getByRole('button', { name: '重新拼图', exact: true }).click();
  await expect.poll(async () => (await layout(page)).pieces.map(piece => piece.turns)).toEqual(initial);
  await noCompletion(page, level);
});

test('图片加载失败保留真实重试入口，恢复后不用刷新页面', async ({ page }) => {
  const level = rotations[0]!;
  const asset = assets.find(item => item.id === level.imageAssetId)!;
  await page.route(`**${asset.path}*`, route => route.abort());
  await page.goto(`/#/play/${level.id}`);
  await expect(page.getByRole('alert')).toContainText('拼图图片暂时未能加载', { timeout: imageLoadTimeout });
  const retry = page.getByRole('button', { name: '重新加载拼图', exact: true });
  await expect(retry).toBeInViewport({ ratio: 0.999 });
  await page.unroute(`**${asset.path}*`);
  await retry.click();
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('phaser-player').locator('canvas')).toHaveCount(1);
  const before = (await layout(page)).pieces[0].turns;
  await clickAt(page, (await layout(page)).pieces[0].targetRect);
  await expect.poll(async () => (await layout(page)).pieces[0].turns).toBe((before + 1) % 4);
});

test('四关找不同使用清晰HTML标签，坐标与画布布局一致且没有重复实例', async ({ page }) => {
  expect(observations).toHaveLength(4);
  for (const level of observations) {
    await page.goto(`/#/play/${level.id}`);
    await expect(page.getByRole('button', { name: '给我提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
    const host = page.getByTestId('phaser-player');
    await expect(host.locator('canvas')).toHaveCount(1);
    for (const viewport of [{ width: 1289, height: 930 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await layoutSettled(page);
      const bounds = (await host.boundingBox())!;
      const current = JSON.parse((await host.getAttribute('data-layout'))!);
      for (const [id, text, point] of [
        ['reference-label', '参照图 A', current.referenceLabel], ['edited-label', '变化图 B', current.editedLabel],
      ] as const) {
        const label = page.getByTestId(id);
        await expect(label).toHaveCount(1); await expect(label).toHaveText(text);
        await expect(label).toBeInViewport({ ratio: 0.999 });
        const presentation = await label.evaluate(element => {
          const style = getComputedStyle(element);
          return { tag: element.tagName, html: element instanceof HTMLElement, size: parseFloat(style.fontSize), transform: style.transform };
        });
        expect(presentation.tag).toBe('SPAN'); expect(presentation.html).toBe(true);
        expect(presentation.size).toBeGreaterThanOrEqual(13); expect(presentation.transform).toBe('none');
        await expect.poll(async () => {
          const measured = (await label.boundingBox())!;
          return Math.abs(measured.x - bounds.x - point.x) < 1 && Math.abs(measured.y - bounds.y - point.y - 2) < 1;
        }).toBe(true);
      }
      await fits(page);
    }
  }
});

test('玩法封面横版铺满，填色图像不再留下两侧空背景', async ({ page }) => {
  for (const viewport of [{ width: 1289, height: 930 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/#/theme/patterns/games');
    const coloring = page.getByRole('link', { name: '填色', exact: true });
    await expect(coloring).toBeVisible();
    const picture = coloring.locator('.game-choice-picture');
    await expect(picture).toBeInViewport({ ratio: 0.999 });
    const frame = (await picture.boundingBox())!;
    expect(frame.width / frame.height).toBeCloseTo(1.5, 3);
    // The cover intentionally crops its source and gray overlay. Validate the complete visible
    // frame and full-frame image geometry, rather than requiring a clipped overlay to be whole.
    for (const image of await picture.locator('img').all()) {
      const presentation = await image.evaluate(async element => {
        const image = element as HTMLImageElement; await image.decode();
        const bounds = image.getBoundingClientRect();
        return { fit: getComputedStyle(image).objectFit, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, naturalWidth: image.naturalWidth };
      });
      expect(presentation.fit).toBe('cover');
      expect(presentation.naturalWidth).toBeGreaterThan(0);
      expect(Math.abs(presentation.x - frame.x)).toBeLessThan(1);
      expect(Math.abs(presentation.y - frame.y)).toBeLessThan(1);
      // WebKit rounds a percentage-sized image and its aspect-ratio frame independently.
      expect(Math.abs(presentation.width - frame.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(presentation.height - frame.height)).toBeLessThanOrEqual(1);
    }
    await fits(page);
  }
});
