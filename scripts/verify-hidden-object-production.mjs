import { expect } from '@playwright/test';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const levelId = 'music-hidden-objects-intro';
const progressKey = 'dunhuang:progress:v1';
const imageLoadTimeout = 45_000;

/** Use an existing Playwright page and production server; never launches a browser. */
export async function verifyHiddenObjectProduction(page, baseUrl) {
  const base = new URL(baseUrl);
  base.hash = '';
  base.search = '';
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const playUrl = new URL(base);
  playUrl.hash = `/play/${levelId}`;
  const level = JSON.parse(await readFile(new URL(`../src/content/levels/${levelId}.json`, import.meta.url), 'utf8'));
  const levelDirectory = new URL('../src/content/levels/', import.meta.url);
  const catalogLevels = await Promise.all((await readdir(levelDirectory)).filter(name => name.endsWith('.json'))
    .map(async name => JSON.parse(await readFile(new URL(name, levelDirectory), 'utf8'))));
  const availableGameLinks = [...new Set(catalogLevels.filter(item => item.themeId === level.themeId)
    .map(item => `#/theme/${level.themeId}/games/${item.gameType}`))].sort();
  const totalItems = level.categoryQuotas.reduce((sum, quota) => sum + quota.count, 0);
  const initialSeconds = Math.ceil(level.timeLimitSeconds);
  const pool = JSON.parse(await readFile(new URL('../src/content/hidden-object/pool.json', import.meta.url), 'utf8'));
  const spriteDirectory = pool.sprites[0].path.slice(0, pool.sprites[0].path.lastIndexOf('/') + 1).replace(/^\//, '');
  const spritePrefix = new URL(spriteDirectory, base).href;
  const sprites = new Map(pool.sprites.map(sprite => [sprite.id, sprite]));
  const outputRoot = new URL('../outputs/', import.meta.url);
  const errors = [];
  const responses = [];
  const onPageError = error => errors.push(error.message);
  const onResponse = response => {
    if (/\/assets\/shared\/hidden-object\/v\d{3}\//.test(response.url())) {
      responses.push({ url: response.url(), status: response.status() });
    }
  };
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  const screen = page.locator('.hidden-object-screen');
  const host = page.getByTestId('phaser-player');
  const canvas = host.locator('canvas');
  const progress = page.getByTestId('hidden-object-progress');
  const taskCards = page.getByTestId('hidden-object-task');
  const timer = page.getByTestId('hidden-object-timer');
  const scrollbar = page.getByTestId('hidden-object-scrollbar');
  const readProgress = () => page.evaluate(key => {
    const value = localStorage.getItem(key);
    return value === null ? null : JSON.parse(value);
  }, progressKey);
  const readLayout = () => host.evaluate(node => {
    const raw = node.getAttribute('data-layout');
    return raw ? JSON.parse(raw) : null;
  });

  async function layout() {
    await expect.poll(async () => {
      const data = await readLayout();
      const bounds = await host.boundingBox();
      return !!bounds && data?.type === 'hidden-object'
        && data.width === Math.floor(bounds.width) && data.height === Math.floor(bounds.height)
        && data.items?.length === totalItems;
    }, { message: '找物画布布局应与当前视口一致', timeout: imageLoadTimeout }).toBe(true);
    return readLayout();
  }

  async function visibleInViewport(locator, label) {
    await expect(locator, label).toBeVisible();
    await expect(locator, label).toBeInViewport({ ratio: 0.999 });
    const bounds = await locator.boundingBox();
    const viewport = page.viewportSize();
    expect(bounds, `${label}应有实际尺寸`).not.toBeNull();
    expect(bounds.x, label).toBeGreaterThanOrEqual(-1);
    expect(bounds.y, label).toBeGreaterThanOrEqual(-1);
    expect(bounds.x + bounds.width, label).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds.y + bounds.height, label).toBeLessThanOrEqual(viewport.height + 1);
  }

  async function noPageScroll(label) {
    await expect.poll(() => page.evaluate(() => ({
      horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      vertical: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
      x: Math.abs(scrollX), y: Math.abs(scrollY),
    })), { message: `${label}不得出现页面滚动` }).toEqual({ horizontal: 0, vertical: 0, x: 0, y: 0 });
  }

  async function verifyExactTargetCopies(data) {
    expect(data.items, '物件实例数量应遵守关卡配额').toHaveLength(totalItems);
    expect(new Set(data.items.map(item => item.id)).size, '每个物件实例必须有独立ID').toBe(totalItems);
    const targets = data.items.filter(item => item.groupId);
    const targetSprites = new Set(targets.map(item => item.spriteId));
    const distractors = data.items.filter(item => !item.groupId);
    expect(new Set(distractors.map(item => item.spriteId)).size, '非目标素材不得重复').toBe(distractors.length);
    expect(distractors.every(item => !targetSprites.has(item.spriteId)), '目标原图不得混入未标记干扰').toBe(true);
    const groups = new Set(targets.map(item => item.groupId));
    expect(targetSprites.size, '每个任务组应独占一张精确目标图').toBe(groups.size);
    for (const groupId of groups) {
      const copies = targets.filter(item => item.groupId === groupId);
      expect(new Set(copies.map(item => item.spriteId)).size, `${groupId}的全部目标副本须为同一图片`).toBe(1);
      const sprite = sprites.get(copies[0].spriteId);
      expect(sprite?.groupIds, '目标图应属于正式任务分类').toContain(groupId);
      const expectedUrl = new URL(sprite.path.replace(/^\//, ''), base).href;
      await expect(page.locator(`.hidden-object-task[data-task-id="${groupId}"] img`), '任务卡必须引用目标原图')
        .toHaveJSProperty('src', expectedUrl);
      for (const copy of copies) {
        expect(new URL(sprites.get(copy.spriteId).path.replace(/^\//, ''), base).href,
          '每个目标副本的图片须与卡片路径完全一致').toBe(expectedUrl);
      }
    }
  }

  async function verifyPlayingScreen(label) {
    await expect(screen).toHaveAttribute('data-hidden-status', 'running');
    const data = await layout();
    const backing = await canvas.evaluate(element => ({ width: element.width, height: element.height,
      pixelRatio: Math.min(2, Math.max(1, window.devicePixelRatio || 1)) }));
    expect(backing.width, `${label}高清画布宽度`).toBe(Math.round(data.width * backing.pixelRatio));
    expect(backing.height, `${label}高清画布高度`).toBe(Math.round(data.height * backing.pixelRatio));
    await noPageScroll(label);
    await visibleInViewport(timer, `${label}计时`);
    await visibleInViewport(progress, `${label}发现进度`);
    await visibleInViewport(canvas, `${label}画布`);
    await visibleInViewport(scrollbar, `${label}长卷滚动条`);
    await expect(taskCards).toHaveCount(level.tasks.groupCount);
    for (let index = 0; index < level.tasks.groupCount; index++) await visibleInViewport(taskCards.nth(index), `${label}任务卡${index + 1}`);
    for (const name of ['暂停', '提示', '新一局']) {
      await visibleInViewport(page.getByRole('button', { name, exact: true }), `${label}${name}`);
    }
    for (const button of await page.getByRole('group', { name: '盘面缩放', exact: true }).getByRole('button').all()) {
      await visibleInViewport(button, `${label}缩放按钮`);
    }
    expect(data.scrollMax, `${label}长卷应可纵向浏览`).toBeGreaterThan(0);
    expect(data.scrollTop, `${label}长卷滚动位置`).toBeGreaterThanOrEqual(0);
    expect(data.scrollTop, `${label}长卷滚动位置`).toBeLessThanOrEqual(data.scrollMax + 1);
    const visible = data.items.filter(item => !item.found && item.displayRect.x < data.width
      && item.displayRect.y < data.height && item.displayRect.x + item.displayRect.width > 0
      && item.displayRect.y + item.displayRect.height > 0);
    expect(visible.length, `${label}当前窗口应有物件`).toBeGreaterThan(0);
    expect(visible.length, `${label}不得把长卷缩成一屏`).toBeLessThan(totalItems);
  }

  async function verifyReadyScreen(label) {
    await expect(screen).toHaveAttribute('data-hidden-status', 'ready');
    const ready = page.getByTestId('hidden-object-ready');
    await expect(ready).toHaveAccessibleName('本局寻找');
    await expect(ready).not.toContainText('造型');
    await expect(ready.locator('.hidden-object-ready-footer p')).toHaveCount(0);
    expect(await page.evaluate(async () => (await document.fonts.load('700 30px "Dunhuang Labels"', '琵琶鼓铃铛×12')).length),
      '标签须加载本地手写字体而非仅声明回退字体').toBeGreaterThan(0);
    expect(await page.evaluate(url => performance.getEntriesByType('resource').some(entry => entry.name === url),
      new URL('assets/shared/fonts/dunhuang-labels-v001.woff', base).href), '构建字体网址须遵守当前部署路径').toBe(true);
    await visibleInViewport(ready, `${label}准备页`);
    const data = await layout();
    const targets = data.items.filter(item => item.groupId);
    await expect(ready.locator('.hidden-object-ready-meta')).toHaveText(`${initialSeconds}秒·共${targets.length}件`);
    await expect(ready.getByTestId('hidden-object-ready-target')).toHaveCount(level.tasks.groupCount);
    for (const groupId of new Set(targets.map(item => item.groupId))) {
      const copies = targets.filter(item => item.groupId === groupId);
      const preview = ready.locator(`[data-task-id="${groupId}"]`);
      await expect(preview.locator('img')).toHaveJSProperty('src', new URL(sprites.get(copies[0].spriteId).path.replace(/^\//, ''), base).href);
      await expect(preview.locator('figcaption strong')).toHaveText(`×${copies.length}`);
      for (const element of [preview, preview.locator('img'), preview.locator('figcaption')]) {
        await visibleInViewport(element, `${label}目标图及数量`);
        const outer = await ready.boundingBox(), inner = await element.boundingBox();
        expect(inner.x).toBeGreaterThanOrEqual(outer.x);
        expect(inner.y).toBeGreaterThanOrEqual(outer.y);
        expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width);
        expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height);
      }
    }
    await visibleInViewport(ready.locator('.hidden-object-ready-meta'), `${label}时限`);
    await visibleInViewport(ready.getByRole('button', { name: '开始寻找', exact: true }), `${label}开始按钮`);
    const outer = await ready.boundingBox(), meta = await ready.locator('.hidden-object-ready-meta').boundingBox();
    const group = await ready.locator('.hidden-object-ready-targets').boundingBox();
    const button = await ready.getByRole('button', { name: '开始寻找', exact: true }).boundingBox();
    expect(meta.x, '时限总数应在浅色面右上方').toBeGreaterThan(outer.x + outer.width * .6);
    expect(meta.y + meta.height, '时限总数不应压住目标图').toBeLessThan(group.y);
    expect(button.y, '开始按钮应位于目标名称及数量下方并留出间距').toBeGreaterThan(group.y + group.height + 4);
    if (page.viewportSize().width === 1279) expect(button.y, '批注视口的开始按钮应下移').toBeGreaterThan(690);
    await expect(timer).toHaveAttribute('aria-label', `剩余 ${initialSeconds} 秒`);
    await noPageScroll(`${label}准备页`);
  }

  async function verifyLongScroll() {
    const before = await layout();
    const foundBefore = before.items.filter(item => item.found).map(item => item.id);
    const progressBefore = await progress.textContent();
    const bounds = await canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.wheel(0, Math.min(350, before.scrollMax / 2));
    await expect.poll(async () => (await layout()).scrollTop,
      { message: '画布滚轮应浏览长卷' }).toBeGreaterThan(before.scrollTop + 1);
    await scrollbar.evaluate(element => { element.scrollTop = (element.scrollHeight - element.clientHeight) / 2; });
    await expect.poll(async () => {
      const data = await layout();
      return Math.abs(data.scrollTop - data.scrollMax / 2);
    }, { message: '原生滚动条应可浏览长卷中段' }).toBeLessThanOrEqual(1);
    await screenshot('程序化找物-电脑中段预览.png');
    await scrollbar.focus();
    await scrollbar.press('End');
    await expect.poll(async () => {
      const data = await layout();
      return Math.abs(data.scrollTop - data.scrollMax);
    }, { message: '原生滚动条应可到达长卷底部' }).toBeLessThanOrEqual(1);
    await screenshot('程序化找物-电脑底部预览.png');
    await scrollbar.press('Home');
    await expect.poll(async () => (await layout()).scrollTop,
      { message: '原生滚动条应可返回长卷顶部' }).toBeLessThanOrEqual(1);
    const after = await layout();
    expect(after.seed).toBe(before.seed);
    expect(after.items.map(({ id, x, y, width, height, rotation }) => ({ id, x, y, width, height, rotation })),
      '滚动只平移观察窗口，不重新摆放或缩小物件').toEqual(before.items.map(({ id, x, y, width, height, rotation }) => ({ id, x, y, width, height, rotation })));
    expect(after.items.filter(item => item.found).map(item => item.id), '滚轮和滚动条不得误找物').toEqual(foundBefore);
    await expect(progress).toHaveText(progressBefore);
    await noPageScroll('长卷内部滚动');
  }

  async function screenshot(filename) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].filter(image => {
        const rect = image.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
          && rect.left < innerWidth && rect.top < innerHeight;
      }).map(image => image.decode()));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const path = fileURLToPath(new URL(filename, outputRoot));
    await page.screenshot({ path, fullPage: false, animations: 'disabled' });
    return path;
  }

  function checkHitPoint(data, item) {
    const sprite = sprites.get(item.spriteId);
    expect(sprite, `目标${item.spriteId}应存在于正式素材池`).toBeTruthy();
    expect(Number.isFinite(item.rotation), '布局应公开实际旋转角').toBe(true);
    const dx = (sprite.hitPoint.x - 0.5) * item.width;
    const dy = (sprite.hitPoint.y - 0.5) * item.height;
    const x = item.x + item.width / 2 + dx * Math.cos(item.rotation) - dy * Math.sin(item.rotation);
    const y = item.y + item.height / 2 + dx * Math.sin(item.rotation) + dy * Math.cos(item.rotation);
    expect(item.hitPoint.x, '旋转后的水平命中点').toBeCloseTo(data.origin.x + x * data.scale, 5);
    expect(item.hitPoint.y, '旋转后的纵向命中点').toBeCloseTo(data.origin.y + y * data.scale, 5);
  }

  async function findOne(foundCount, totalTargets) {
    const before = await layout();
    const target = before.items.find(item => item.groupId && !item.found);
    expect(target, '应有尚未找到的正式目标').toBeTruthy();
    // Use the public task ID to select the same group that getHintItem searches.
    const targetCard = page.locator(`.hidden-object-task[data-task-id="${target.groupId}"]`);
    await expect(targetCard).toHaveCount(1);
    await targetCard.click();
    await expect(targetCard).toHaveAttribute('aria-pressed', 'true');
    const previousProgress = await progress.textContent();
    await page.getByRole('button', { name: '提示', exact: true }).click();
    await expect(page.getByTestId('hidden-object-hint-status')).toHaveText('点击红框中的目标物件。');
    await expect.poll(async () => {
      const data = await layout();
      const item = data.items.find(candidate => candidate.id === target.id);
      return !!item && !item.found && item.hitPoint.x > 0 && item.hitPoint.y > 0
        && item.hitPoint.x < data.width && item.hitPoint.y < data.height;
    }, { message: '提示应把所选组的真实目标移入当前画布' }).toBe(true);
    const data = await layout();
    const item = data.items.find(candidate => candidate.id === target.id);
    await expect(progress, '提示只定位，不代替玩家找到目标').toHaveText(previousProgress);
    expect(data.items.filter(candidate => candidate.found)).toHaveLength(foundCount - 1);
    checkHitPoint(data, item);
    const position = { x: item.hitPoint.x, y: item.hitPoint.y };
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await canvas.tap({ position });
    else await canvas.click({ position });
    if (foundCount < totalTargets) {
      await expect(progress).toHaveText(`已找到 ${foundCount} / ${totalTargets}`);
      await expect.poll(async () => (await layout()).items.find(candidate => candidate.id === target.id)?.found,
        { message: '真实点击应只找到当前物件' }).toBe(true);
    } else {
      await expect(page.getByRole('heading', { name: '寻宝完成', exact: true })).toBeVisible();
    }
    return target.id;
  }

  try {
    await mkdir(outputRoot, { recursive: true });
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${base.href}#/theme/music`);
      const skip = page.getByRole('button', { name: '直接玩游戏', exact: true });
      await visibleInViewport(skip, '乐舞短导览跳过入口');
      await noPageScroll('乐舞短导览');
      await skip.click();
      await expect(page.locator('.game-choice-card')).toHaveCount(4);
      for (const card of await page.locator('.game-choice-card').all()) await visibleInViewport(card, '乐舞玩法卡片');
      await expect(page.locator('.game-choice-card[href]')).toHaveCount(availableGameLinks.length);
      expect((await page.locator('.game-choice-card[href]').evaluateAll(cards => cards.map(card => card.getAttribute('href')))).sort()).toEqual(availableGameLinks);
      await noPageScroll('乐舞玩法选择');
      await page.locator('a.game-choice-hidden-object').click();
      await expect(page.locator('.level-choice-card[data-status="available"]')).toHaveCount(1);
      await visibleInViewport(page.getByRole('link', { name: '开始找物', exact: true }), '找物首关入口');
      await noPageScroll('找物选关');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(playUrl.href);
    await page.bringToFront();
    await expect(screen).toHaveAttribute('data-hidden-status', 'ready', { timeout: imageLoadTimeout });
    await expect(page.getByRole('button', { name: '开始寻找', exact: true })).toBeEnabled();
    await expect(timer).toHaveAttribute('aria-label', `剩余 ${initialSeconds} 秒`);
    await expect(taskCards).toHaveCount(level.tasks.groupCount);
    const baselineProgress = await readProgress();
    const initial = await layout();
    await verifyExactTargetCopies(initial);
    const initialTargets = initial.items.filter(item => item.groupId).length;
    expect(initialTargets).toBeGreaterThanOrEqual(level.tasks.groupCount * level.tasks.minCount);
    expect(initialTargets).toBeLessThanOrEqual(level.tasks.groupCount * level.tasks.maxCount);
    expect(initial.items.filter(item => item.found)).toHaveLength(0);
    expect(initial.scrollTop, '长卷首屏应从顶部开始').toBe(0);
    expect(initial.scrollMax, '长卷不应按高度缩成一屏').toBeGreaterThan(0);
    expect(initial.items.filter(item => item.displayRect.y < initial.height
      && item.displayRect.y + item.displayRect.height > 0).length, '首屏只显示长卷中的部分物件').toBeLessThan(totalItems);

    await page.getByRole('button', { name: '新一局', exact: true }).click();
    await expect(screen).toHaveAttribute('data-hidden-status', 'ready', { timeout: imageLoadTimeout });
    await expect.poll(async () => (await readLayout())?.seed,
      { message: '新一局加载后应公开新的种子', timeout: imageLoadTimeout }).not.toBe(initial.seed);
    const round = await layout();
    await verifyExactTargetCopies(round);
    const targetTotal = round.items.filter(item => item.groupId).length;
    expect(targetTotal).toBeGreaterThanOrEqual(level.tasks.groupCount * level.tasks.minCount);
    expect(targetTotal).toBeLessThanOrEqual(level.tasks.groupCount * level.tasks.maxCount);
    const taskCounts = new Map();
    for (const item of round.items.filter(item => item.groupId)) taskCounts.set(item.groupId, (taskCounts.get(item.groupId) ?? 0) + 1);
    expect(taskCounts.size).toBe(level.tasks.groupCount);
    for (const [groupId, count] of taskCounts) {
      expect(count).toBeGreaterThanOrEqual(level.tasks.minCount);
      expect(count).toBeLessThanOrEqual(level.tasks.maxCount);
      await expect(page.locator(`.hidden-object-task[data-task-id="${groupId}"]`)).toHaveAttribute('aria-label', new RegExp(`已找到 0 件，共 ${count} 件`));
    }
    expect(round.seed, '新一局应更换种子').not.toBe(initial.seed);
    const spriteSet = data => data.items.map(item => item.spriteId).sort();
    expect(spriteSet(round), '新一局应重新抽取素材，不只是挪动旧图').not.toEqual(spriteSet(initial));
    expect(round.items.some(item => Math.abs(item.rotation) > 0.001), '散放物件应使用配置的旋转').toBe(true);
    await expect(timer).toHaveAttribute('aria-label', `剩余 ${initialSeconds} 秒`);
    expect((await readProgress())?.completed?.[levelId]).toBe(baselineProgress?.completed?.[levelId]);

    for (const view of [
      { width: 1440, height: 1000, filename: '找物开局-电脑预览.png' },
      { width: 1279, height: 925, filename: '找物开局-批注视口预览.png' },
      { width: 360, height: 640, filename: '找物开局-手机预览.png' },
      { width: 844, height: 390, filename: '找物开局-手机横屏预览.png' },
    ]) {
      await page.setViewportSize({ width: view.width, height: view.height });
      await verifyReadyScreen(`${view.width}×${view.height}`);
      await screenshot(view.filename);
      expect((await layout()).seed, '准备页切换窗口不得重新抽目标').toBe(round.seed);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.getByRole('button', { name: '开始寻找', exact: true }).click();
    await verifyPlayingScreen('电脑1440×1000');
    await expect.poll(async () => Number((await timer.getAttribute('aria-label'))?.match(/\d+/)?.[0]),
      { message: '主动开始后倒计时应按实际运行时间递减' }).toBeLessThan(initialSeconds);
    await verifyLongScroll();
    const screenshots = [await screenshot('程序化找物-电脑预览.png')];
    const foundIds = [await findOne(1, targetTotal)];
    const seed = round.seed;
    for (const view of [
      { width: 360, height: 640, label: '手机360×640', filename: '程序化找物-手机预览.png' },
      { width: 844, height: 390, label: '手机横屏844×390', filename: '程序化找物-手机横屏预览.png' },
    ]) {
      await page.setViewportSize({ width: view.width, height: view.height });
      await verifyPlayingScreen(view.label);
      const data = await layout();
      expect(data.seed, '旋转屏幕应保留种子').toBe(seed);
      expect(data.items.filter(item => item.found).map(item => item.id), '旋转屏幕应保留发现').toEqual(foundIds);
      expect(spriteSet(data), '旋转屏幕不得重新抽图').toEqual(spriteSet(round));
      await expect(progress).toHaveText(`已找到 1 / ${targetTotal}`);
      screenshots.push(await screenshot(view.filename));
    }
    for (let found = 2; found <= targetTotal; found++) foundIds.push(await findOne(found, targetTotal));
    expect(new Set(foundIds).size, '必须真实点击本局所有独立目标').toBe(targetTotal);
    await noPageScroll('寻宝完成页');
    await visibleInViewport(page.getByRole('link', { name: '返回关卡', exact: true }), '完成页返回关卡');
    await visibleInViewport(page.getByRole('button', { name: '再找一局', exact: true }), '完成页再找一局');
    const saved = await readProgress();
    expect(saved?.completed?.[levelId], '真实完成后应保存正式关卡记录').toEqual(expect.any(String));
    expect(Number.isFinite(Date.parse(saved.completed[levelId])), '完成时间应为有效日期').toBe(true);
    for (const [id, timestamp] of Object.entries(baselineProgress?.completed ?? {})) {
      expect(saved.completed[id], `旧关卡${id}的记录应保留`).toBe(timestamp);
    }
    if (baselineProgress?.settings) expect(saved.settings).toEqual(baselineProgress.settings);
    await page.reload();
    await expect(page.getByRole('heading', { name: '寻宝完成', exact: true })).toBeVisible();
    expect((await readProgress()).completed[levelId]).toBe(saved.completed[levelId]);
    const expectedSpriteUrls = new Set([...initial.items, ...round.items]
      .map(item => new URL(sprites.get(item.spriteId).path.replace(/^\//, ''), base).href));
    const loadedSpriteUrls = new Set(responses.map(response => response.url));
    expect([...loadedSpriteUrls].sort(), '两局用到的唯一贴纸应实际加载，目标副本共用纹理').toEqual([...expectedSpriteUrls].sort());
    for (const response of responses) {
      expect(response.url.startsWith(spritePrefix), '贴纸资源应遵守当前部署子路径').toBe(true);
      expect(response.status, response.url).toBeLessThan(400);
    }
    expect(errors, '找物生产页不应有未捕获错误').toEqual([]);
    return { levelId, seed, initialSeed: initial.seed, totalItems, uniqueSprites: new Set(round.items.map(item => item.spriteId)).size,
      targetTotal, timeLimitSeconds: level.timeLimitSeconds, foundIds, completedAt: saved.completed[levelId], screenshots,
      loadedSpriteUrls: loadedSpriteUrls.size };
  } finally {
    page.off('pageerror', onPageError);
    page.off('response', onResponse);
  }
}
