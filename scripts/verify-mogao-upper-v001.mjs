import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Targeted graybox inspection only. This never drives the 2D games or old session.
const folder = 'work/world/mogao-upper-browser-v001';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const errors = [], views = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.UPPER_PREVIEW_URL ?? 'http://localhost:4227/mogao-upper-v001.html';
try {
  for (const [view, look] of [['start', 0], ['ground', .85], ['upper-a', .65], ['upper-b', .35], ['hall-a', 0], ['hall-b', 0]]) {
    await page.goto(`${base}?view=${view}&look=${look}`);
    await page.waitForFunction(() => window.__terrain?.inspect().loaded, null, { timeout: 90000 });
    const resume = page.getByTestId('world-resume');
    if (await resume.isVisible()) await resume.click();
    await page.waitForTimeout(1100);
    const state = await page.evaluate(() => window.__terrain.inspect());
    views.push({ view, upper: state.upper, position: state.checkpoint.position, camera: state.camera, nearby: state.nearby, stats: state.stats });
    await page.screenshot({ path: `${folder}/${view}.png` });
    console.log(`${view}: ${state.upper?.label} ${state.upper?.height.toFixed(3)}m`);
    if (view === 'upper-b') {
      await page.reload();
      await page.waitForFunction(() => window.__terrain?.inspect().loaded, null, { timeout: 90000 });
      const restored = await page.evaluate(() => window.__terrain.inspect());
      if (restored.checkpoint.walkSurface !== state.checkpoint.walkSurface || Math.abs(restored.terrain.height - state.terrain.height) > .01) throw new Error('Upper refresh lost its floor');
    }
  }
  if(errors.length)throw new Error(errors.join('\n'));
} finally {
  await writeFile(`${folder}/report.json`, JSON.stringify({ views, errors }, null, 2));
  await browser.close();
}
