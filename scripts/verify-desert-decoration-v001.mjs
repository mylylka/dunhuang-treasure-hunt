import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, devices } from 'playwright';
import { TERRAIN_ANCHORS, toTerrainPoint } from '../src/content/world/terrain-layout-v001.ts';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../src/services/first-gallery-entry.ts';
import { MUSIC_GALLERY_PROGRESS_KEYS } from '../src/services/music-gallery-progress.ts';

const origin = process.env.DUNHUANG_DESERT_ORIGIN ?? 'http://127.0.0.1:5174';
const beforeOrigin = process.env.DUNHUANG_DESERT_BEFORE_ORIGIN ?? origin;
const beforeDecoration = process.env.DUNHUANG_DESERT_BEFORE_DECORATION ?? '0';
const entry = process.env.DUNHUANG_DESERT_ENTRY ?? '/';
const traveler = process.env.DUNHUANG_DESERT_TRAVELER ?? 'classic';
const output = process.env.DUNHUANG_DESERT_REPORT ?? 'work/qa/desert-decoration-v001';
const screenshots = join(output, 'screenshots');
const label = process.env.DUNHUANG_DESERT_LABEL ?? 'default';
const args = new Set(process.argv.slice(2));
const runs = Number(process.env.DUNHUANG_DESERT_RUNS ?? 3);
const variant = args.has('--before-only') ? ['before'] : args.has('--after-only') ? ['after'] : ['before', 'after'];
const device = args.has('--desktop') ? 'desktop' : 'mobile';
const viewport = device === 'mobile' ? { width: 844, height: 390 } : { width: 1440, height: 810 };
const presets = {
  weak: { latency: 150, downloadThroughput: 200_000, uploadThroughput: 100_000, cpuRate: 4 },
  moderate: { latency: 55, downloadThroughput: 1_048_576, uploadThroughput: 524_288, cpuRate: 1 },
};
const profileName = process.env.DUNHUANG_DESERT_NETWORK ?? 'weak';
const profile = presets[profileName];
const mobile = device === 'mobile';
const variants = ['--startup', '--visual', '--failure', '--visibility', '--venue-sync'];
const assetSegment = '/assets/world/desert-decoration/';
const site = ({ x, z }, { x: toX, z: toZ }) => ({ x, z, heading: Math.atan2(x - toX, z - toZ) });
const viewpoints = {
  '13-dune-road': site({ x: 209, z: -2.0 }, { x: 147, z: 18 }),
  '14-road-close': site({ x: 276.9, z: 32.1 }, { x: 297, z: 37 }),
  '12-first-gallery-composition': site({ x: 124.8, z: 18.78 }, toTerrainPoint('courtyard', { x: -13, z: -7 })),
  '01-courtyard-approach': site({ x: 113, z: 19 }, { x: 116, z: 26 }),
  '02-uphill-turn': site({ x: 123, z: 21 }, { x: 129, z: 10 }),
  '03-first-lake-sight': site({ x: 146, z: 21 }, { x: 224, z: -22 }),
  '04-lake-and-pavilion': site({ x: 251, z: -4 }, { x: 216, z: -42 }),
  '05-cliff-rocks': site({ x: 273, z: 27 }, { x: 279, z: 40 }),
  '06-cliff-stairs': site({ x: 314, z: 59 }, TERRAIN_ANCHORS.cliffDoor),
  '07-music-court': site(toTerrainPoint('music', { x: 65, y: 0, z: -3 }),
    toTerrainPoint('music', { x: 68, y: 0, z: -9 })),
  '08-inner-bank': site({ x: 234.70, z: -63.73 }, { x: 245, z: -47 }),
  '15-crescent-pockets': site({ x: 282, z: -45 }, { x: 272.2, z: -34 }),
  '10-crescent-overlook': site({ x: 144, z: 21.7 }, { x: 258, z: 9 }),
  '16-pavilion-wall-corner': site(toTerrainPoint('music', { x: 32.5, z: 9 }),
    toTerrainPoint('music', { x: 32.5, z: 3.1 })),
  '11-pavilion-outer-wall': site(toTerrainPoint('music', { x: 52, y: 0, z: 9.0 }),
    toTerrainPoint('music', { x: 52, y: 0, z: .5 })),
  '09-courtyard-wall': site(toTerrainPoint('courtyard', { x: 6.0, y: 0, z: .7 }),
    toTerrainPoint('courtyard', { x: 1.9, y: 0, z: -12.7 })),
};
const restored = {
  'music-return': site({ x: 216, z: -21 }, TERRAIN_ANCHORS.musicGate),
  'cliff-return': site({ x: 314, z: 59 }, TERRAIN_ANCHORS.cliffDoor),
};
const worldData = {
  version: 1,
  muralParts: ['lotus', 'bird', 'grapes'],
  caissonCompleted: true,
  coloringCompleted: true,
  ceremonySeen: true,
  introductionsSeen: ['mural', 'caisson', 'easel'],
  firstSuccessSeen: true,
  displayedArtworkId: 'verification-work',
  artworks: {
    'verification-work': {
      artworkId: 'verification-work', levelId: 'coloring-feitian-lotus', artworkVersion: 'v001',
      colors: { '1': '#d6a35d' }, materials: {}, submittedAt: '2026-11-20T00:00:00.000Z',
    },
  },
};

assert(/^[a-z0-9-]+$/.test(label), 'Invalid report label');
assert(Number.isInteger(runs) && runs > 0, 'Run count must be a positive integer');
assert(profile || profileName === 'local', 'Unknown network profile');
await mkdir(output, { recursive: true });

function urlFor(state) {
  const url = new URL(entry, state === 'before' ? beforeOrigin : origin);
  if (state === 'before' && beforeDecoration) url.searchParams.set('desertDecoration', beforeDecoration);
  return url.href;
}

async function begin(browser, { state, fixture, blocked = false, cold = false, measured = false }) {
  const context = await browser.newContext({
    ...devices[mobile ? 'iPhone 13 landscape' : 'Desktop Chrome'],
    viewport,
    screen: viewport,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ fixture, worldData, musicKeys, checkpointKey, traveler }) => {
    localStorage.setItem('dunhuang:traveler-selection:v1', traveler);
    if (fixture) {
      localStorage.setItem('dunhuang:first-gallery:v1', JSON.stringify(worldData));
      for (const key of musicKeys) localStorage.setItem(key, 'yes');
      const { x, z, heading } = fixture;
      sessionStorage.setItem(checkpointKey, JSON.stringify({
        version: 1, position: { x, z }, heading, cameraYaw: heading, visitedEvents: [],
      }));
    }
    performance.setResourceTimingBufferSize(2000);
    window.desertVerification = { longTasks: [] };
    const marks = window.desertVerification;
    new MutationObserver(() => {
      const host = document.querySelector('[data-testid="world-host"]');
      if (host) marks.host ??= performance.now();
      if (host?.getAttribute('data-ready') === 'true') marks.ready ??= performance.now();
      if (document.querySelector('[data-testid="world-error"]')) marks.error ??= performance.now();
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ready'] });
    if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      new PerformanceObserver(list => {
        for (const item of list.getEntries()) marks.longTasks.push({ time: item.startTime, duration: item.duration });
      }).observe({ type: 'longtask', buffered: true });
    }
  }, { fixture, worldData, musicKeys: MUSIC_GALLERY_PROGRESS_KEYS, checkpointKey: FIRST_GALLERY_WORLD_SESSION_KEY, traveler });
  if (blocked) {
    await page.route('**' + assetSegment + '**', route => route.fulfill({ status: 404, body: 'verification fixture' }));
  }
  const cdp = await context.newCDPSession(page);
  const requests = new Map();
  cdp.on('Network.requestWillBeSent', ({ requestId, request, wallTime }) => {
    if (!/^https?:/.test(request.url)) return;
    requests.set(requestId, { path: new URL(request.url).pathname, epoch: wallTime * 1000 });
  });
  cdp.on('Network.responseReceived', ({ requestId, response }) => {
    const item = requests.get(requestId);
    if (!item) return;
    item.status = response.status;
    item.diskCache = response.fromDiskCache;
    item.encoding = Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'content-encoding')?.[1];
  });
  cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const item = requests.get(requestId);
    if (item) item.cdpBytes = encodedDataLength;
  });
  cdp.on('Network.loadingFailed', ({ requestId, canceled, errorText }) => {
    const item = requests.get(requestId);
    if (item) Object.assign(item, { canceled, errorText });
  });
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: cold });
  if (measured && profile) {
    const { cpuRate, ...network } = profile;
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...network });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  }
  try {
    await page.goto(urlFor(state), { waitUntil: 'commit', timeout: 300_000 });
    const readiness = await page.waitForFunction(() => {
      const error = document.querySelector('[data-testid="world-error"]');
      if (error) return { error: error.textContent };
      return window.desertVerification.ready ? { ready: true } : null;
    }, undefined, { timeout: 300_000 });
    const outcome = await readiness.jsonValue();
    const run = { context, page, cdp, requests, errors, bootError: outcome.error };
    if (!measured && !outcome.ready) {
      const data = await read(run);
      const failed = data.requests.filter(request => (request.status ?? 0) >= 400 || request.errorText);
      await report('unexpected-boot-failure-' + device + '-' + state, { fixture, error: outcome.error, ...data });
      throw new Error(outcome.error + ' ' + JSON.stringify(failed));
    }
    return run;
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function moveOnce({ page, cdp }) {
  const original = await page.evaluate(() => window.__terrain.inspect().checkpoint.position);
  await page.evaluate(() => { window.desertVerification.firstInput ??= performance.now(); });
  let finish;
  if (mobile) {
    const stick = await page.locator('.world-joystick').boundingBox();
    assert(stick, 'Touch joystick not visible');
    const x = stick.x + stick.width / 2;
    const y = stick.y + stick.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    finish = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x, y: y - stick.height * .24, id: 1 }],
    });
  } else {
    await page.keyboard.down('ArrowUp');
    finish = () => page.keyboard.up('ArrowUp');
  }
  try {
    await page.waitForFunction(initial => {
      const p = window.__terrain.inspect().checkpoint.position;
      if (Math.hypot(p.x - initial.x, p.z - initial.z) < .06) return false;
      window.desertVerification.move ??= performance.now();
      return true;
    }, original, { timeout: 15_000 });
  } finally {
    await finish();
  }
}

async function read({ page, requests, errors }) {
  const data = await page.evaluate(() => {
    const state = window.__terrain?.inspect();
    return {
      timeOrigin: performance.timeOrigin,
      marks: window.desertVerification,
      checkpoint: state?.checkpoint,
      camera: state?.camera,
      stats: state?.stats,
      decoration: state?.desertDecoration,
      environment: state?.terrain?.scene?.lighting,
      streaming: state?.terrain?.scene?.streaming,
      assets: [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].map(resource => ({
        path: new URL(resource.name).pathname, start: resource.startTime, end: resource.responseEnd,
        encoded: resource.encodedBodySize, transfer: resource.transferSize,
      })),
    };
  });
  return {
    ...data, errors,
    requests: [...requests.values()].map(({ epoch, ...item }) => ({ ...item, start: epoch - data.timeOrigin })),
  };
}

function bootNumbers(data) {
  const { ready, move, error, firstInput } = data.marks;
  const cutoff = ready ?? error;
  const completed = data.assets.filter(asset => asset.end <= cutoff);
  const beforeReady = data.requests.filter(request => request.start < cutoff);
  const isHeavyDecoration = item => item.path.includes(assetSegment) || /\/(?:draco|basis|meshopt)[^/]*\.(?:wasm|js)$/.test(item.path);
  return {
    readyMs: ready === undefined ? null : Math.round(ready),
    firstMoveMs: move === undefined ? null : Math.round(move),
    errorMs: error === undefined ? null : Math.round(error),
    encodedBodyBytes: completed.reduce((sum, item) => sum + item.encoded, 0),
    wireBytes: completed.reduce((sum, item) => sum + item.transfer, 0),
    transferredGLBBytes: completed.filter(item => item.path.endsWith('.glb')).reduce((sum, item) => sum + item.transfer, 0),
    scriptBytes: completed.filter(item => /\.(?:[cm]?js|css)$/.test(item.path)).reduce((sum, item) => sum + item.transfer, 0),
    startedDecorationHeavy: beforeReady.filter(isHeavyDecoration).map(item => item.path),
    startedDecorationBeforeInput: data.requests.filter(item => item.start < (firstInput ?? cutoff) && isHeavyDecoration(item)).map(item => item.path),
    startedDecorationBeforeObservedMotion: data.requests.filter(item => item.start < move && isHeavyDecoration(item)).map(item => item.path),
    startedDecorationModule: beforeReady.filter(item => /desert-decoration-[^/]+\.js$/.test(item.path)).map(item => item.path),
  };
}

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[center] : (sorted[center - 1] + sorted[center]) / 2;
}
async function report(name, data) {
  await writeFile(join(output, name + '-' + label + '.json'), JSON.stringify(data, null, 2) + '\n');
}

async function measureBoot(browser) {
  const rows = [];
  for (let index = 1; index <= runs; index++) {
    for (const state of variant) {
      const run = await begin(browser, { state, cold: true, measured: true });
      try {
        if (!run.bootError) await moveOnce(run);
        const data = await read(run);
        const metrics = bootNumbers(data);
        assert.deepEqual(metrics.startedDecorationHeavy, []);
        assert.deepEqual(metrics.startedDecorationModule, []);
        assert.deepEqual(metrics.startedDecorationBeforeInput, []);
        assert.deepEqual(metrics.startedDecorationBeforeObservedMotion, []);
        assert.deepEqual(data.errors, []);
        const name = ['startup', device, profileName, state, index].join('-');
        await report(name, { origin: urlFor(state), viewport, profile, bootError: run.bootError, metrics, ...data });
        rows.push({ state, index, ...metrics });
        console.log(JSON.stringify({ scenario: name, bootError: run.bootError, ...metrics }));
      } finally {
        await run.context.close();
      }
    }
  }
  const summary = variant.map(state => {
    const samples = rows.filter(row => row.state === state);
    const playable = samples.filter(row => row.firstMoveMs !== null);
    const failed = samples.filter(row => row.errorMs !== null);
    return {
      state, n: samples.length,
      playable: playable.length,
      readyMs: playable.length ? median(playable.map(row => row.readyMs)) : null,
      firstMoveMs: playable.length ? median(playable.map(row => row.firstMoveMs)) : null,
      errorMs: failed.length ? median(failed.map(row => row.errorMs)) : null,
      wireBytes: median(samples.map(row => row.wireBytes)),
      transferredGLBBytes: median(samples.map(row => row.transferredGLBBytes)),
      scriptBytes: median(samples.map(row => row.scriptBytes)),
    };
  });
  await report(['startup', device, profileName, 'summary', ...variant].join('-'), { profile, viewport, summary });
  console.log(JSON.stringify({ device, profileName, summary }));
}

async function stableFrames(page) {
  return page.evaluate(() => new Promise(resolve => {
    const intervals = [];
    let previous;
    function frame(timestamp) {
      if (previous !== undefined) intervals.push(timestamp - previous);
      previous = timestamp;
      if (intervals.length < 45) requestAnimationFrame(frame);
      else {
        intervals.sort((a, b) => a - b);
        resolve({ samples: intervals.length, median: intervals[22], p95: intervals[42], max: intervals.at(-1) });
      }
    }
    requestAnimationFrame(frame);
  }));
}

async function settleDecoration(page, mustMount) {
  await page.waitForFunction(required => {
    const options = window.__terrain.inspect().desertDecoration;
    if (!options || required && !options.mounted) return false;
    const marks = window.desertVerification;
    const signature = JSON.stringify([options.mounted, options.pending, options.resident]);
    const now = performance.now();
    if (signature !== marks.decorationSignature) {
      marks.decorationSignature = signature;
      marks.decorationStableSince = now;
    }
    return !options.pending && now - marks.decorationStableSince >= 2_100;
  }, mustMount, { timeout: 35_000, polling: 200 });
}

async function takeVisuals(browser) {
  await mkdir(screenshots, { recursive: true });
  const points = process.env.DUNHUANG_DESERT_VIEW?.split(',') ?? Object.keys(viewpoints);
  for (const name of points) {
    const fixture = viewpoints[name];
    assert(fixture, 'Unknown viewpoint: ' + name);
    for (const state of variant) {
      const run = await begin(browser, { state, fixture });
      try {
        const initial = await read(run);
        assert(Math.hypot(initial.checkpoint.position.x - fixture.x, initial.checkpoint.position.z - fixture.z) < 1,
          'Checkpoint did not restore: ' + name + ' ' + JSON.stringify(initial.checkpoint.position));
        await moveOnce(run);
        if (state === 'after' || beforeDecoration === 'v004') await settleDecoration(run.page, !['03-first-lake-sight', '06-cliff-stairs', '10-crescent-overlook'].includes(name));
        if (name === '10-crescent-overlook') await run.page.waitForFunction(() => {
          const buildings = window.__terrain.inspect().terrain?.scene?.streaming;
          return buildings?.musicBuildingVisible && buildings?.cliffTowerVisible;
        });
        const frames = await stableFrames(run.page);
        const tag = ['visual', device, name, state].join('-');
        await run.page.screenshot({ path: join(screenshots, tag + '-' + label + '.jpg'), type: 'jpeg', quality: 88 });
        const data = await read(run);
        const incoming = data.assets.filter(asset => asset.path.includes(assetSegment) && asset.transfer > 0);
        const decorationTransferBytes = incoming.reduce((sum, asset) => sum + asset.transfer, 0);
        if (mobile && data.decoration) {
          assert(data.decoration.visibleDraws <= 20, 'View exceeded the draw-call budget');
          assert(data.decoration.visibleTriangles <= 30_000, 'View exceeded the visible-triangle budget');
          assert(data.decoration.textureBytes <= 32 * 1024 * 1024, 'View exceeded the estimated texture budget');
        }
        await report(tag, { fixture, frames, decorationTransferBytes, ...data });
        console.log(JSON.stringify({ scenario: tag, frames, stats: data.stats, decorationTransferBytes, draws: data.decoration?.visibleDraws, triangles: data.decoration?.visibleTriangles }));
        if (name === '04-lake-and-pavilion') {
          await run.page.evaluate(() => window.__terrain.overview(true));
          await stableFrames(run.page);
          await run.page.screenshot({ path: join(screenshots, 'overview-' + device + '-' + state + '-' + label + '.jpg'), type: 'jpeg', quality: 88 });
        }
      } finally {
        await run.context.close();
      }
    }
  }
}

async function testVenueSync(browser) {
  const fixture = viewpoints['10-crescent-overlook'];
  const run = await begin(browser, { state: 'after', fixture });
  try {
    await run.page.evaluate(() => {
      const rows = [];
      window.desertVerification.venueFrames = rows;
      function sample() {
        const scene = window.__terrain?.inspect();
        const buildings = scene?.terrain?.scene?.streaming;
        const decoration = scene?.desertDecoration;
        if (buildings && decoration) {
          const row = { music: buildings.musicBuildingVisible, cliff: buildings.cliffTowerVisible,
            vegetation: decoration.venues, overviewTriangles: decoration.overviewTriangles };
          const previous = rows.at(-1);
          if (!previous || JSON.stringify(previous) !== JSON.stringify(row)) rows.push(row);
          if (row.music && row.cliff) return;
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await run.page.waitForFunction(() => {
      const row = window.desertVerification.venueFrames?.at(-1);
      return row?.music && row.cliff;
    }, undefined, { timeout: 55_000 });
    const data = await read(run);
    for (const row of data.marks.venueFrames) {
      assert.equal(row.vegetation.music, row.music);
      assert.equal(row.vegetation.cliff, row.cliff);
      assert(row.overviewTriangles > 0, 'The walkable landscape was empty');
    }
    assert.equal(data.decoration.mounted, 0);
    assert.equal(data.decoration.treeImpostors.ready, true, 'Inline tree captures did not decode');
    assert(data.decoration.treeImpostors.visibleTrees > 0, 'No rendered tree silhouettes at the overlook');
    assert(!data.requests.some(request => request.path.includes(assetSegment)), 'Detail fetched before actual movement');
    assert.deepEqual(data.errors, []);
    await report('venue-sync-' + device, data);
    console.log(JSON.stringify({ scenario: 'venue-sync', observedStates: data.marks.venueFrames }));
  } finally {
    await run.context.close();
  }
}

async function testFailure(browser) {
  const run = await begin(browser, { state: 'after', fixture: viewpoints['01-courtyard-approach'], blocked: true });
  try {
    await moveOnce(run);
    await run.page.waitForFunction(() => performance.getEntriesByType('resource').some(entry =>
      new URL(entry.name).pathname.includes('/assets/world/desert-decoration/')), undefined, { timeout: 55_000 });
    await moveOnce(run);
    const data = await read(run);
    assert(data.decoration.overviewTriangles > 0, 'Failed detail requests hid the overview');
    assert.equal(data.decoration.treeImpostors.ready, true, 'Blocked GLBs disabled tree silhouettes');
    assert(!await run.page.getByTestId('world-error').isVisible(), 'Decoration 404 caused a fatal world error');
    assert.deepEqual(data.errors, []);
    const blocked = data.requests.filter(request => request.path.includes(assetSegment) && request.status === 404);
    assert(blocked.length, 'No decoration request was blocked');
    await run.page.goto(new URL('/#/themes', origin).href);
    await run.page.waitForFunction(() => !window.__terrain);
    await report('failure-' + device, { blocked, ...data });
    console.log(JSON.stringify({ scenario: 'blocked', blocked: blocked.length, movable: true, runtimeUnmounted: true }));
  } finally {
    await run.context.close();
  }
}

async function testRestored(browser) {
  for (const [name, fixture] of Object.entries(restored)) {
    const run = await begin(browser, { state: 'after', fixture, cold: true });
    try {
      const initial = await read(run);
      await moveOnce(run);
      const data = await read(run);
      const metrics = bootNumbers(data);
      assert.deepEqual(metrics.startedDecorationHeavy, []);
      const restoredDistance = Math.hypot(initial.checkpoint.position.x - fixture.x, initial.checkpoint.position.z - fixture.z);
      assert(restoredDistance < 18, 'Checkpoint restored outside selected landmark approach');
      await report(name + '-' + device, { fixture, restoredDistance, metrics, ...data });
      console.log(JSON.stringify({ scenario: name, restoredDistance, ...metrics }));
    } finally {
      await run.context.close();
    }
  }
}

async function testVisibility(browser) {
  const run = await begin(browser, { state: 'after', fixture: viewpoints['01-courtyard-approach'] });
  try {
    await run.page.route('**' + assetSegment + '**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue().catch(() => {});
    });
    const first = run.page.waitForRequest(request => new URL(request.url()).pathname.includes(assetSegment));
    await moveOnce(run);
    await first;
    await run.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await run.page.waitForFunction(() => window.__terrain.inspect().desertDecoration?.pending === null);
    const count = () => [...run.requests.values()].filter(request => request.path.includes(assetSegment)).length;
    const whileHidden = count();
    await new Promise(resolve => setTimeout(resolve, 1800));
    assert.equal(count(), whileHidden, 'Decoration requests continued while the world was hidden');
    await run.page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const resume = run.page.getByTestId('world-resume');
    if (await resume.isVisible()) await resume.click();
    await run.page.waitForFunction(() => window.__terrain.inspect().desertDecoration?.mounted > 0);
    await report('visibility-' + device, { canceledOrSettled: whileHidden, ...await read(run) });
    console.log(JSON.stringify({ scenario: 'visibility', hiddenRequestsAdded: 0, resumed: true }));
  } finally {
    await run.context.close();
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  if (args.has('--startup') || !variants.some(arg => args.has(arg)) && !args.has('--restores')) await measureBoot(browser);
  if (args.has('--visual')) await takeVisuals(browser);
  if (args.has('--failure')) await testFailure(browser);
  if (args.has('--venue-sync')) await testVenueSync(browser);
  if (args.has('--restores')) await testRestored(browser);
  if (args.has('--visibility')) await testVisibility(browser);
} finally {
  await browser.close();
}
