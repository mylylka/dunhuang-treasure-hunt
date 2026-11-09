import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, devices } from 'playwright';

const output = process.env.DUNHUANG_STARTUP_REPORT_DIR ?? 'work/world/mogao-exhibit-v001';
const base = process.env.DUNHUANG_PLAYTEST_ORIGIN ?? 'http://127.0.0.1:4230';
const baseline = process.env.DUNHUANG_BASELINE_ORIGIN ?? 'http://127.0.0.1:4231';
const cases = {
  'hall-b': [base, 'mogao-exhibit-v001.html?view=hall-b'],
  'stairs-start': [base, 'mogao-exhibit-v001.html?view=start'],
  'first-gallery': [base, 'first-gallery-v001.html'],
  'music-companion': [base, 'music-companion-v002.html'],
  terrain: [base, 'terrain-v013.html'],
  'hall-b-before': [baseline, 'mogao-upper-v002.html?view=hall-b'],
  'stairs-start-before': [baseline, 'mogao-upper-v002.html?view=start'],
};
const viewport = { width: 667, height: 375 };
const keys = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const fast = process.argv.includes('--fast');
const coldOnly = process.argv.includes('--cold-only');
const profile = fast ? null : { latency: 55, downloadThroughput: 1024 * 1024, uploadThroughput: 512 * 1024, cpuRate: 4 };
const paths = keys.length ? keys : ['hall-b', 'stairs-start', 'first-gallery', 'music-companion', 'terrain'];
const label = process.env.DUNHUANG_STARTUP_LABEL ?? '';
assert(/^[a-z0-9-]*$/.test(label), 'Invalid report label');
const results = [];
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  for (const key of paths) {
    assert(cases[key], `Unknown startup case ${key}`);
    const [origin, route] = cases[key];
    const previous = key.endsWith('-before');
    const url = new URL(route, origin).href;
    const context = await browser.newContext({ ...devices['iPhone 13 landscape'], viewport, screen: viewport });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        performance.setResourceTimingBufferSize(1000);
        window.playtestBoot = {};
        new MutationObserver(() => {
          const host = document.querySelector('[data-testid="world-host"]');
          if (host) window.playtestBoot.host ??= performance.now();
          if (host?.getAttribute('data-ready') === 'true') window.playtestBoot.ready ??= performance.now();
          if (document.querySelector('[data-testid="world-error"]')) window.playtestBoot.error ??= performance.now();
        }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ready'] });
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      if (profile) {
        const { cpuRate, ...network } = profile;
        await cdp.send('Network.emulateNetworkConditions', { offline: false, ...network });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
      }
      let requests = [];
      cdp.on('Network.requestWillBeSent', ({ request, wallTime }) => {
        if (/^https?:/.test(request.url)) requests.push({ path: new URL(request.url).pathname, epoch: wallTime * 1000 });
      });
      for (const cache of coldOnly || previous ? ['cold'] : ['cold', 'warm']) {
        requests = [];
        errors.length = 0;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 75_000 });
        await page.waitForFunction(() => window.playtestBoot?.ready || window.playtestBoot?.error, undefined, { timeout: 75_000 });
        if (await page.evaluate(() => !!window.playtestBoot.ready)) {
          const at = await page.evaluate(() => window.__terrain.inspect().checkpoint.position);
          const stick = await page.locator('.world-joystick').boundingBox();
          assert(stick, 'Touch movement control missing');
          const touch = (x, y) => ({ x, y, id: 1 });
          const x = stick.x + stick.width / 2, y = stick.y + stick.height / 2;
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(x, y)] });
          try {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(x, y - stick.height * .33)] });
            await page.waitForFunction(at => {
              const next = window.__terrain.inspect().checkpoint.position;
              if (Math.hypot(at.x - next.x, at.z - next.z) < .06) return false;
              window.playtestBoot.move ??= performance.now();
              return true;
            }, at, { timeout: 6000 });
          } finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
        }
        const measured = await page.evaluate(() => {
          const state = window.__terrain?.inspect();
          return {
            timeOrigin: performance.timeOrigin, boot: window.playtestBoot, checkpoint: state?.checkpoint,
            streaming: state?.terrain?.scene?.streaming,
            error: document.querySelector('[data-testid="world-error"]')?.textContent,
            assets: [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].map(asset => ({
              path: new URL(asset.name).pathname, start: asset.startTime, end: asset.responseEnd,
              transfer: asset.transferSize, encoded: asset.encodedBodySize,
            })),
          };
        });
        const report = { key, cache, url, profile, viewport, ...measured, errors: [...errors],
          requests: requests.map(({ path, epoch }) => ({ path, start: epoch - measured.timeOrigin })) };
        const ready = report.boot.ready ?? report.boot.error;
        report.beforeReadyBytes = report.assets.filter(asset => asset.end <= ready).reduce((sum, asset) => sum + asset.transfer, 0);
        const startedBeforeReady = report.requests.filter(request => request.start < ready);
        report.bootModels = [...new Set(startedBeforeReady.map(item => item.path).filter(path => /\.glb$/.test(path)))];
        await writeFile(`${output}/startup-${key}-${cache}${fast ? '-fast' : ''}${label ? `-${label}` : ''}.json`, JSON.stringify(report, null, 2) + '\n');
        results.push({ key, cache, readyMs: report.boot.ready, moveMs: report.boot.move, errorMs: report.boot.error, bytes: report.beforeReadyBytes, models: report.bootModels });
        console.log(JSON.stringify(results.at(-1)));
        if (previous) continue;
        assert(report.boot.ready && report.boot.move, `Scene not playable: ${report.error}`);
        assert.deepEqual(report.errors, []);
        assert(!startedBeforeReady.some(asset => /(?:-thumb|reward-scroll)\.webp$/.test(asset.path)), 'Reward art started during boot');
        assert(!startedBeforeReady.some(asset => /\/assets\/shared\/bg-(?:portrait|landscape)-/.test(asset.path)), '2D backdrop started during 3D boot');
        if (key === 'hall-b') {
          assert.deepEqual(report.bootModels.sort(), ['/assets/world/mogao-upper/v003/upper.glb', '/assets/world/traveler-tripo/v002/traveler.glb']);
          if (!fast && cache === 'cold') assert(report.boot.move < 15_000, `Hall B cold: ${report.boot.move} ms`);
        }
        if (key === 'hall-b' || key === 'stairs-start' || key === 'first-gallery') {
          assert(!report.requests.some(asset => /\/assets\/world\/(?:music-pavilion|music-interior|music-three-wall-mural)\//.test(asset.path)), 'Unrelated music room asset requested');
        }
        if (key === 'music-companion') {
          assert(!startedBeforeReady.some(asset => /\/assets\/world\/(?:mogao[^/]*|first-gallery)\/|\/courtyard\/[^/]+\/[^/]+\.glb$/.test(asset.path)), 'Unrelated exhibit asset requested');
          assert(!startedBeforeReady.some(asset => /music-balcony-ensemble|music-three-wall-mural|music-instrument-display|mural-original\.png/.test(asset.path)), 'Music detail started before its approach');
        }
      }
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
