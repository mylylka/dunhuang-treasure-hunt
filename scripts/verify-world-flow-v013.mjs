import {chromium, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

// One isolated context and one page: no concurrent heavy-image browser tasks.
// Story progression uses real media ended events or visible player controls only.
const origin = process.env.WORLD_FLOW_URL ?? 'http://localhost:4220';
const prefix = 'work/world/world-flow-v013';
const report = {checks: [], errors: [], stories: [], layouts: [], passed: false};
const browser = await chromium.launch({channel: 'chrome'});
const context = await browser.newContext({viewport: {width: 1279, height: 925}});
const page = await context.newPage();
page.on('pageerror', error => report.errors.push({type: 'pageerror', message: error.message}));
page.on('response', response => {
  if (response.status() >= 400) report.errors.push({type: 'response', status: response.status(), url: response.url()});
});
page.on('requestfailed', request => {
  const message = request.failure()?.errorText;
  // Intentional navigation/unmount cancels in-flight media requests.
  if (message !== 'net::ERR_ABORTED') report.errors.push({type: 'requestfailed', message, url: request.url()});
});
const check = text => { report.checks.push(text); console.log(text); };
const inspect = () => page.evaluate(() => window.__mogao.inspect());
const story = () => page.getByTestId('world-story');
const control = name => story().getByRole('button', {name, exact: true});
const step = () => page.getByTestId('world-story-step');
const oldRecords = () => page.evaluate(() => Object.fromEntries(
  ['dunhuang:progress:v1', 'dunhuang:artworks:v1'].map(key => [key, localStorage.getItem(key)])));
const pose = async () => (await inspect()).checkpoint.position;

async function worldReady() {
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', {timeout: 45000});
  await page.waitForFunction(() => window.__mogao?.inspect().loaded, null, {timeout: 45000});
}
async function resumeIfNeeded() {
  const resume = page.getByTestId('world-resume');
  if (await resume.isVisible()) await resume.click();
}
async function open(view) {
  await page.goto(`${origin}/?view=${view}#/`);
  await worldReady();
  await page.waitForTimeout(2400); // Actual two-second hall arrival gate.
  await resumeIfNeeded();
}
async function startStory(view, id) {
  await open(view);
  await expect(page.getByTestId('world-interact')).toBeVisible();
  const position = await pose();
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'follow');
  await expect(story()).toHaveCount(0);
  await page.getByTestId('world-interact').click();
  await expect(story()).toHaveAttribute('data-story-id', id);
  await expect(story()).toHaveAttribute('data-phase', 'introduction');
  await expect(page.getByTestId('story-subtitle')).toBeVisible();
  await page.waitForFunction(() => {
    const media = document.querySelector('[data-testid="story-audio"]');
    return media && !media.paused && media.currentTime > .05;
  }, null, {timeout: 15000});
  return position;
}
async function firstNarration() {
  await expect(step()).toHaveAttribute('data-index', '0');
  await expect(story()).toHaveAttribute('data-phase', 'narration', {timeout: 15000});
}
async function skipEpisode(index) {
  await expect(step()).toHaveAttribute('data-index', String(index));
  await expect(story()).toHaveAttribute('data-phase', 'narration', {timeout: 15000});
  await control('跳过本段').click();
  await expect(step()).toHaveAttribute('data-index', String(index + 1), {timeout: 10000});
}
async function pauseAndReplay() {
  await control('暂停').click();
  await expect(control('继续播放')).toBeVisible();
  const before = await page.getByTestId('story-audio').evaluate(media => media.currentTime);
  await page.waitForTimeout(600);
  const after = await page.getByTestId('story-audio').evaluate(media => media.currentTime);
  expect(Math.abs(after - before)).toBeLessThan(.03);
  await control('继续播放').click();
  await control('重播').click();
  await expect(step()).toHaveAttribute('data-index', '0');
  await firstNarration();
  await page.waitForFunction(() => {
    const media = document.querySelector('[data-testid="story-audio"]');
    return media && !media.paused && media.currentTime > .05 && media.currentTime < 2;
  });
}
async function backFromStories(position, label) {
  await control('探索更多').click();
  await expect(page).toHaveURL(/#\/theme\/stories$/);
  await expect(page.locator('.unavailable-theme')).toContainText('主题尚未开放');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.locator('.unavailable-theme').getByRole('link', {name: '返回探索世界', exact: true}).click();
  await worldReady();
  expect(await pose()).toEqual(position);
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'follow');
  await expect(story()).toHaveCount(0);
  await page.reload();
  await worldReady();
  expect(await pose()).toEqual(position);
  await expect(story()).toHaveCount(0);
  check(`${label}: playing → stories unavailable page → exploration/reload preserves position and does not reopen the event`);
}
async function verifyPortrait(width, height, landscape, playingStory = false) {
  const position = await pose();
  await page.setViewportSize({width, height});
  await expect(page.getByTestId('world-rotate')).toBeVisible();
  const frame = playingStory ? await story().getAttribute('data-phase') : null;
  const index = playingStory ? await step().getAttribute('data-index') : null;
  const audioTime = playingStory ? await page.getByTestId('story-audio').evaluate(media => media.currentTime) : null;
  await page.keyboard.down('w');
  await page.waitForTimeout(650);
  await page.keyboard.up('w');
  expect(await pose()).toEqual(position);
  if (playingStory) {
    await expect(story()).toHaveAttribute('inert', '');
    expect(await story().getAttribute('data-phase')).toBe(frame);
    expect(await step().getAttribute('data-index')).toBe(index);
    expect(Math.abs(await page.getByTestId('story-audio').evaluate(media => media.currentTime) - audioTime)).toBeLessThan(.03);
  }
  await page.screenshot({path: `${prefix}-portrait-${width}x${height}.png`});
  await page.setViewportSize(landscape);
  await expect(page.getByTestId('world-rotate')).toHaveCount(0);
  await expect(page.getByTestId('world-resume')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await pose()).toEqual(position);
  await page.getByTestId('world-resume').click();
  if (playingStory) await expect(story()).not.toHaveAttribute('inert', '');
  check(`${width}×${height} portrait pauses ${playingStory ? 'story/audio' : 'walking'}; landscape requires explicit resume`);
}
async function verifyToolbar(width, height, label) {
  await page.setViewportSize({width, height});
  await resumeIfNeeded();
  await page.waitForTimeout(100);
  const layout = await page.evaluate(() => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return {text: element.textContent.trim(), x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height};
    };
    const toolbar = document.querySelector('.deer-story-toolbar');
    return {width: innerWidth, height: innerHeight,
      controls: [...toolbar.querySelectorAll('button')].map(rect),
      title: rect(toolbar.querySelector('.deer-story-label')),
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth ||
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) > innerHeight};
  });
  expect(layout.controls).toHaveLength(6);
  expect(layout.overflow).toBe(false);
  const boxes = [layout.title, ...layout.controls];
  for (const box of boxes) {
    expect(box.width, box.text).toBeGreaterThan(0);
    expect(box.height, box.text).toBeGreaterThan(0);
    expect(box.x, box.text).toBeGreaterThanOrEqual(0);
    expect(box.y, box.text).toBeGreaterThanOrEqual(0);
    expect(box.right, box.text).toBeLessThanOrEqual(width);
    expect(box.bottom, box.text).toBeLessThanOrEqual(height);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const overlap = Math.min(a.right, b.right) - Math.max(a.x, b.x) > .5 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > .5;
    expect(overlap, `${a.text} overlaps ${b.text}`).toBe(false);
  }
  report.layouts.push({label, ...layout});
  await page.screenshot({path: `${prefix}-${label}-${width}x${height}.png`});
  check(`${label}: ${width}×${height} story toolbar has six visible, nonoverlapping buttons and no page overflow`);
}
async function walkTo(target) {
  // Short actual key gestures keep automatic camera following from changing
  // the world bearing mid-gesture. No position or runtime command is injected.
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const state = await inspect();
    const dx = target.x - state.checkpoint.position.x, dz = target.z - state.checkpoint.position.z;
    if (Math.hypot(dx, dz) < .6) return;
    const yaw = state.checkpoint.cameraYaw;
    const x = dx * Math.cos(yaw) - dz * Math.sin(yaw), y = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const key = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'd' : 'a') : (y > 0 ? 's' : 'w');
    await page.keyboard.down('Shift');
    await page.keyboard.down(key);
    await page.waitForTimeout(140);
    await page.keyboard.up(key);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(75);
  }
  throw new Error(`Walking to ${JSON.stringify(target)} stopped at ${JSON.stringify(await pose())}`);
}

try {
  await open('start');
  const recordsBefore = await oldRecords();
  expect(await page.locator('#root').getAttribute('data-flow-revision')).toBe('v013');
  await verifyPortrait(1024, 1366, {width: 1366, height: 1024});
  await page.setViewportSize({width: 1279, height: 925});

  const deerPosition = await startStory('deer', 'nine-colored-deer-v002');
  await expect(control('上一段')).toBeDisabled();
  await page.keyboard.press('Space');
  await firstNarration();
  await skipEpisode(0);
  await expect(story()).toHaveAttribute('data-phase', 'narration', {timeout: 15000});
  await control('上一段').click();
  await firstNarration();
  await pauseAndReplay();
  await verifyPortrait(390, 844, {width: 844, height: 390}, true);
  await control('暂停').click();
  await verifyToolbar(844, 390, 'deer');
  await verifyToolbar(667, 375, 'deer');
  await page.setViewportSize({width: 1279, height: 925});
  await backFromStories(deerPosition, 'Deer');
  report.stories.push({id: 'nine-colored-deer-v002', position: deerPosition, controls: 'intro/Space/next/previous/pause/replay/explore/return/reload'});

  const novicePosition = await startStory('novice', 'novice-precepts');
  // Observe a genuine HTMLMediaElement ended event. No currentTime assignment,
  // playbackRate change or synthetic event is used to abbreviate playback.
  const natural = await page.getByTestId('story-audio').evaluate(media => new Promise((resolve, reject) => {
    const startedAt = performance.now(), duration = media.duration, initialTime = media.currentTime;
    const timeout = setTimeout(() => reject(new Error('Natural narration did not end')), Math.max(20000, duration * 1000 + 10000));
    media.addEventListener('ended', () => {
      clearTimeout(timeout);
      resolve({duration, initialTime, elapsedSeconds: (performance.now() - startedAt) / 1000, ended: media.ended, finalTime: media.currentTime});
    }, {once: true});
  }));
  expect(natural.ended).toBe(true);
  expect(natural.finalTime).toBeCloseTo(natural.duration, 1);
  expect(natural.elapsedSeconds).toBeGreaterThan(natural.duration - natural.initialTime - .5);
  report.naturalAudio = natural;
  await firstNarration();
  check('Novice introduction naturally reaches the media ended event and advances into the first episode');
  await skipEpisode(0);
  await expect(story()).toHaveAttribute('data-phase', 'narration', {timeout: 15000});
  await control('上一段').click();
  await firstNarration();
  await pauseAndReplay();
  await control('暂停').click();
  await verifyToolbar(844, 390, 'novice');
  await verifyToolbar(667, 375, 'novice');
  await page.setViewportSize({width: 1279, height: 925});
  await backFromStories(novicePosition, 'Novice');
  report.stories.push({id: 'novice-precepts', position: novicePosition, controls: 'natural-intro/next/previous/pause/replay/explore/return/reload'});

  await startStory('novice', 'novice-precepts');
  await page.keyboard.press('Space');
  await firstNarration();
  for (let index = 0; index < 5; index++) await skipEpisode(index);
  await expect(story()).toHaveAttribute('data-phase', 'invitation', {timeout: 15000});
  await control('跳过本段').click();
  await expect(page.getByTestId('world-culture-choice')).toBeVisible();
  await page.getByTestId('world-choice-replay').click();
  await expect(story()).toHaveAttribute('data-phase', 'introduction');
  await page.keyboard.press('Space');
  await firstNarration();
  for (let index = 0; index < 5; index++) await skipEpisode(index);
  await expect(story()).toHaveAttribute('data-phase', 'invitation', {timeout: 15000});
  await control('跳过本段').click();
  await expect(page.getByTestId('world-culture-choice')).toBeVisible();
  await page.getByTestId('world-choice-roam').click();
  await expect(story()).toHaveCount(0);
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'follow');
  expect(await pose()).toEqual(novicePosition);
  check('Story ending choice opens after visible skip controls; replay restarts the introduction, continue roaming resumes at the same position');

  await open('start');
  for (const [x, z] of [[0, 12], [-1.9, 9.8], [-6, 9], [-10.1, 8.2], [-12, 6], [-12, 1], [-12, -17]]) await walkTo({x, z});
  await expect(page.getByTestId('world-interact')).toContainText('抬头看看');
  await page.getByTestId('world-interact').click();
  await expect(page.getByTestId('world-culture-choice')).toBeVisible({timeout: 15000});
  await page.getByTestId('world-enter-theme').click();
  await expect(page).toHaveURL(/#\/theme\/patterns$/);
  await expect(page.getByTestId('teaching-screen')).toBeVisible();
  await page.getByRole('button', {name: '直接玩游戏', exact: true}).click();
  await page.locator('.game-choice-spot-difference').click();
  await page.locator('[data-level-id="patterns-intro"] .selected-level-start').click();
  await expect(page.getByTestId('game-progress')).toContainText('5');
  await expect(page.locator('.game-loading')).toHaveCount(0, {timeout: 30000});
  await page.screenshot({path: `${prefix}-patterns-mini-game.png`});
  await page.getByRole('link', {name: '返回找不同关卡', exact: true}).click();
  await expect(page).toHaveURL(/#\/theme\/patterns\/games\/spot-difference$/);
  await page.getByTestId('world-return').click();
  await worldReady();
  const returned = await pose();
  expect(returned.x).toBeCloseTo(-12, 2);
  expect(returned.z).toBeCloseTo(-13, 2);
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'follow');
  await expect(page.getByTestId('world-culture-choice')).toHaveCount(0);
  await page.reload();
  await worldReady();
  expect(await pose()).toEqual(returned);
  await page.screenshot({path: `${prefix}-patterns-return.png`});
  expect(await oldRecords()).toEqual(recordsBefore);
  check('Actual courtyard walk → caisson → patterns guide → existing mini-game → level list → world/reload preserves safe return and old game/artwork records');
  const baselineModels = [];
  page.on('response', response => {
    if (response.url().endsWith('.glb')) baselineModels.push(response.url());
  });
  await page.goto(`${origin}/baseline.html#/`);
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', {timeout: 45000});
  expect(baselineModels.some(url => /mogao\/|mogao-massing\/|music-pavilion\//.test(url))).toBe(false);
  await page.getByRole('link', {name: '直接选主题', exact: true}).click();
  await expect(page.getByTestId('world-host')).toHaveCount(0);
  await expect(page.getByTestId('theme-choice-grid')).toBeVisible();
  await page.goto(`${origin}/baseline.html#/theme/stories`);
  await expect(page.locator('.unavailable-theme').getByRole('link', {name: '返回首页', exact: true})).toHaveAttribute('href', '#/themes');
  expect(await oldRecords()).toEqual(recordsBefore);
  check('Default map stays original; direct theme navigation and the original unavailable-theme return remain available');
  expect(report.errors).toEqual([]);
  report.passed = true;
} catch (error) {
  report.failure = error.stack ?? String(error);
  process.exitCode = 1;
  await page.screenshot({path: `${prefix}-failure.png`}).catch(() => {});
  console.error(error);
} finally {
  await context.close();
  await browser.close();
  await writeFile(`${prefix}-verification.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({passed: report.passed, checks: report.checks, errors: report.errors, failure: report.failure}));
