import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Camera capture for the terrain-v009 game. Interactions are reached through
// the real on-screen controls; no fabricated subtitle or story state is used.
// Keep files directly in the existing work/world directory until the album is
// assembled. This script must not run alongside other browser capture jobs.
const base = process.env.DECORATION_CAPTURE_URL ?? 'http://localhost:4222';
const prefix = 'work/world/decoration-interaction';
const report = { source: base, viewport: [1280, 720], deviceScaleFactor: 2, shots: [], failures: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });

async function open(view) {
  await page.goto(`${base}/?view=${view}#/`);
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  await page.waitForFunction(() => window.__terrain?.inspect().loaded, null, { timeout: 60000 });
  const resume = page.getByTestId('world-resume');
  if (await resume.isVisible()) await resume.click();
  // A genuine click unlocks browser audio and does not alter game state.
  await page.locator('[data-world-canvas]').click({ position: { x: 640, y: 360 } });
  await page.waitForTimeout(700);
}

async function photo(id, description) {
  const path = `${prefix}-${id}.png`;
  await page.screenshot({ path });
  const state = await page.evaluate(() => {
    const s = window.__terrain?.inspect();
    return s ? { position: s.checkpoint?.position, cameraYaw: s.checkpoint?.cameraYaw, view: s.view,
      nearby: s.nearby, encounter: s.encounter?.id, hallArrival: s.hallArrival } : null;
  });
  report.shots.push({ id, description, path, state });
  console.log(`${id}: ${description}`);
}

async function section(name, fn) {
  try { await fn(); }
  catch (error) {
    report.failures.push({ section: name, message: String(error) });
    console.error(`${name}: ${error}`);
  }
}

try {
  await section('music', async () => {
    await open('flying');
    // Retain the ordinary arrival subtitle if it is active; otherwise show
    // the authentic interaction prompt when it becomes available.
    const encounter = page.getByTestId('world-encounter');
    if (!await encounter.isVisible()) await expect(page.getByTestId('world-interact')).toBeVisible({ timeout: 15000 });
    await photo('m15-before', '飞天壁画唤醒前的实际画面');
    if (await encounter.isVisible()) await encounter.getByRole('button').click();
    const interact = page.getByTestId('world-interact');
    await expect(interact).toBeVisible({ timeout: 15000 });
    await interact.click();
    await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view', 'flying');
    await page.waitForFunction(() => window.__terrain?.inspect().flying?.time > 1.2, null, { timeout: 15000 });
    await photo('m16-awakening', '飞天壁画唤醒过程');
    const subtitle = page.getByTestId('flying-subtitle');
    await expect(subtitle).toBeVisible({ timeout: 20000 });
    await photo('m17-dialogue', '飞天讲解对白');
    await subtitle.getByRole('button').click();
    await expect(page.getByTestId('world-culture-choice')).toBeVisible({ timeout: 15000 });
    await photo('m18-choice', '飞天讲解结束后的选择');
  });

  await section('buddha', async () => {
    await open('interior');
    const directions = page.getByRole('navigation', { name: '洞窟观赏方向' });
    await expect(directions).toBeVisible({ timeout: 15000 });
    await photo('t18-arrival', '洞窟入厅后的观赏方向提示');
    await page.getByRole('button', { name: '抬头欣赏' }).click();
    // The follow camera starts just outside the statue's gaze range. Walk
    // forward a little so the real gaze and narration can activate.
    await page.keyboard.down('w');
    await page.waitForTimeout(240);
    await page.keyboard.up('w');
    await expect(page.getByTestId('buddha-subtitle')).toBeVisible({ timeout: 20000 });
    await photo('t19-buddha', '抬头欣赏大佛时的讲解');
  });

  await section('deer', async () => {
    await open('deer');
    await page.waitForTimeout(2500);
    const interact = page.getByTestId('world-interact');
    await expect(interact).toBeVisible({ timeout: 15000 });
    await interact.click();
    const story = page.getByTestId('world-story');
    await expect(story).toHaveAttribute('data-story-id', 'nine-colored-deer-v002', { timeout: 15000 });
    await expect(story).toHaveAttribute('data-phase', 'introduction', { timeout: 15000 });
    await story.getByRole('button', { name: '跳过本段', exact: true }).click();
    await expect(story).toHaveAttribute('data-phase', 'narration', { timeout: 15000 });
    await expect(page.getByTestId('story-detail').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('story-subtitle')).toBeVisible();
    await photo('t20-deer', '九色鹿壁画故事播放器示例');
    const step = page.getByTestId('world-story-step');
    for (let index = 0; index < 5; index++) {
      await expect(step).toHaveAttribute('data-index', String(index), { timeout: 15000 });
      await expect(story).toHaveAttribute('data-phase', 'narration', { timeout: 15000 });
      await story.getByRole('button', { name: '跳过本段', exact: true }).click();
      await expect(step).toHaveAttribute('data-index', String(index + 1), { timeout: 15000 });
    }
    await expect(story).toHaveAttribute('data-phase', 'invitation', { timeout: 15000 });
    await story.getByRole('button', { name: '跳过本段', exact: true }).click();
    await expect(page.getByTestId('world-culture-choice')).toBeVisible({ timeout: 15000 });
    await photo('t21-story-choice', '九色鹿故事结束后的选择');
  });
} finally {
  await browser.close();
  await writeFile(`${prefix}-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ shots: report.shots.length, failures: report.failures, errors: report.errors }));
}
