import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = 'http://localhost:4221';
const work = 'work/world';
const output = 'outputs/water-study/v001';
await mkdir(work, { recursive: true });
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const state = () => page.evaluate(() => window.__waterStudy.inspect());
const record = (name, data = {}) => { checks.push({ name, ...data }); console.log(name); };
const imageFromCanvas = async name => {
  const url = await page.locator('.water-host canvas').evaluate(canvas => canvas.toDataURL('image/png'));
  await writeFile(`${output}/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
};
try {
  await page.goto(base);
  await page.waitForFunction(() => window.__waterStudy?.inspect().ready);
  await page.waitForTimeout(650);
  record('资源与材质加载', await state());
  for (const [view, label] of [['shore', '岸边近看'], ['low', '低处看倒影'], ['aerial', '高空俯瞰']]) {
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${work}/water-study-v001-reviewed-${view}.png` });
    await imageFromCanvas(`water-${view}`);
    record(`观察视角 ${view}`, { state: await state() });
  }
  await page.evaluate(() => window.__waterStudy.setView('texture'));
  await page.waitForTimeout(500);
  await imageFromCanvas('water-closeup');
  await page.screenshot({ path: `${work}/water-study-v001-reviewed-texture.png` });

  await page.getByRole('button', { name: '暂停波纹', exact: true }).click();
  const paused = await state();
  await page.waitForTimeout(450);
  assert.equal((await state()).time, paused.time);
  assert.equal(paused.paused, true);
  await page.getByRole('button', { name: '继续波纹', exact: true }).click();
  await page.waitForTimeout(400);
  assert.ok((await state()).time > paused.time);
  record('暂停与恢复波纹');

  const wind = page.getByRole('slider', { name: '微风强度' });
  await wind.fill('0.7');
  assert.equal((await state()).wind, 0.7);
  await wind.fill('0.22');
  record('微风强度');

  const beforeOrbit = (await state()).camera;
  await page.mouse.move(700, 450); await page.mouse.down();
  await page.mouse.move(860, 470, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(300);
  assert.notDeepEqual((await state()).camera, beforeOrbit);
  record('拖动观察');

  const normals = await page.evaluate(() => {
    const texture = window.__waterStudy.normalTexture();
    const canvas = document.createElement('canvas');
    canvas.width = texture.width; canvas.height = texture.height;
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(texture.data), texture.width, texture.height), 0, 0);
    return canvas.toDataURL('image/png');
  });
  await writeFile(`${output}/water-normal-256.png`, Buffer.from(normals.split(',')[1], 'base64'));

  for (const [width, height] of [[844, 390], [667, 375]]) {
    await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: '岸边近看', exact: true }).click();
    await page.waitForTimeout(450);
    const layout = await page.evaluate(() => ({
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      viewport: [innerWidth, innerHeight],
      controls: [...document.querySelectorAll('.water-views button,.water-tools button,.water-tools input')].map(el => {
        const rect = el.getBoundingClientRect(); return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      }),
    }));
    assert.deepEqual(layout.scroll, layout.viewport);
    for (const r of layout.controls) assert.ok(r.left >= 0 && r.top >= 0 && r.right <= width && r.bottom <= height);
    await page.screenshot({ path: `${work}/water-study-v001-${width}x${height}.png` });
    record(`横屏 ${width}×${height}`, layout);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.water-rotate').isVisible(), true);
  const portraitTime = (await state()).time;
  await page.waitForTimeout(300);
  assert.equal((await state()).time, portraitTime);
  record('竖屏提示与停动');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const reducedTime = (await state()).time;
  await page.waitForTimeout(300);
  assert.equal((await state()).time, reducedTime);
  record('系统减少动态效果');
  assert.deepEqual(errors, []);
  record('浏览器控制台、资源与着色器无报错');
} finally {
  await writeFile(`${work}/water-study-v001-verification.json`, JSON.stringify({ date: new Date().toISOString(), checks, errors }, null, 2));
  await browser.close();
}
