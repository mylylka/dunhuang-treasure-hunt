import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, devices } from 'playwright';
import { TERRAIN_ANCHORS, TERRAIN_ROUTES, TERRAIN_SPAWN, toTerrainPoint } from '../src/content/world/terrain-layout-v001.ts';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../src/services/first-gallery-entry.ts';
import { MUSIC_GALLERY_PROGRESS_KEYS } from '../src/services/music-gallery-progress.ts';

const url = new URL(process.env.DUNHUANG_DESERT_ORIGIN ?? 'http://127.0.0.1:5174/');
const overlook = process.argv.includes('--overlook');
const output = process.env.DUNHUANG_DESERT_REPORT ?? (overlook ? 'work/qa/desert-oasis-v013' : 'work/qa/desert-decoration-v001');
const before = process.argv.includes('--before');
const mobile = process.argv.includes('--mobile');
const preview = process.argv.includes('--preview');
const reference = process.argv.includes('--reference-overlook');
if (before) url.searchParams.set('desertDecoration', process.env.DUNHUANG_DESERT_BEFORE_DECORATION ?? '0');
if (preview) url.hash = '/settings';
const routes = overlook ? TERRAIN_ROUTES.slice(0, 1) : TERRAIN_ROUTES;
const waypoints = routes.flatMap((route, index) => route.points.filter((_, point) =>
  point > (index === 0 ? 7 : 8) && (point % 6 === 0 || point === route.points.length - 1)));
if (overlook) waypoints.push(toTerrainPoint('music', {x:40.2, z:-2}));

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({
    ...devices[mobile ? 'iPhone 13 landscape' : 'Desktop Chrome'],
    viewport: mobile ? { width: 844, height: 390 } : { width: 1080, height: 607 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const badRequests = [];
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/desert-decoration/')) badRequests.push(response.url());
  });
  if (overlook && mobile) {
    const cdp = await context.newCDPSession(page);
    let active = false, box;
    await page.exposeFunction('steerRouteJoystick', async (x, y) => {
      const send = (type, points) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: points});
      if (x === 0 && y === 0) {
        if (active) await send('touchEnd', []);
        active = false;
        return;
      }
      box ??= await page.getByRole('group', {name: '拖动摇杆行走'}).boundingBox();
      assert(box, 'Missing landscape joystick');
      const center = {x: box.x + box.width / 2, y: box.y + box.height / 2};
      if (!active) await send('touchStart', [{...center, id: 1}]);
      active = true;
      await send('touchMove', [{x: center.x + x * box.width * .39, y: center.y + y * box.height * .39, id: 1}]);
    });
  }
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && /shader error|WebGLProgram/i.test(msg.text())) errors.push(msg.text()); });
  await page.addInitScript(({ musicKeys, checkpointKey, start, preview }) => {
    localStorage.setItem('dunhuang:traveler-selection:v1', 'classic');
    if (preview) return;
    const id = 'route-test';
    localStorage.setItem('dunhuang:first-gallery:v1', JSON.stringify({
      version: 1, muralParts: ['lotus', 'bird', 'grapes'],
      caissonCompleted: true, coloringCompleted: true, ceremonySeen: true,
      introductionsSeen: ['mural', 'caisson', 'easel'], firstSuccessSeen: true, displayedArtworkId: id,
      artworks: {
        [id]: {
          artworkId: id, levelId: 'coloring-feitian-lotus', artworkVersion: 'v001',
          colors: { '1': '#D6A35D' }, materials: {}, submittedAt: '2026-11-20T00:00:00.000Z',
        },
      },
    }));
    for (const key of musicKeys) localStorage.setItem(key, 'yes');
    if (start) sessionStorage.setItem(checkpointKey, JSON.stringify({
      version: 1, position: start, heading: -1.3, cameraYaw: -1.3, visitedEvents: [],
    }));
  }, {
    musicKeys: overlook ? [] : MUSIC_GALLERY_PROGRESS_KEYS, checkpointKey: FIRST_GALLERY_WORLD_SESSION_KEY,
    start: overlook ? null : { x: waypoints[0].x, z: waypoints[0].z }, preview,
  });
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  if (preview) {
    await page.getByRole('button', { name: '一键解锁所有场馆' }).click();
    await page.getByTestId('world-return').click();
  }
  await page.waitForFunction(() => window.__terrain?.inspect()?.loaded, undefined, { timeout: 90_000 });
  const spawn = await page.evaluate(() => window.__terrain.inspect().checkpoint.position);
  if (overlook) assert(Math.hypot(spawn.x - TERRAIN_SPAWN.x, spawn.z - TERRAIN_SPAWN.z) < .1);
  const result = await page.evaluate(async ({points, overlook, exitPoint, gate}) => {
    const state = () => window.__terrain.inspect();
    const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const steps = [], frames = [];
    const downhillFrames = [];
    let worstDownhillFrame;
    let crestSamples = 0, downhillSamples = 0, firstGap, crest, gateArrival, detailReady;
    let started = performance.now(), track = true, lastFrame;
    function tick(now) {
      if (!track) return;
      const frameMs = lastFrame === undefined ? 0 : now-lastFrame;
      if (frameMs > 0) frames.push(frameMs);
      lastFrame = now;
      if (overlook) {
        const {checkpoint, desertOasis: oasis} = state();
        const p = checkpoint.position, r = oasis.route;
        const record = () => ({ms: Math.round(performance.now()-started), position:p, route:r});
        if (!detailReady && r.corridorReady && r.shoreReady) detailReady = record();
        if (p.x >= 135) {
          downhillSamples++;
          if (frameMs>0) {
            downhillFrames.push(frameMs);
            if (!worstDownhillFrame || frameMs>worstDownhillFrame.ms) worstDownhillFrame={ms:frameMs,position:p,stage:r.stage};
          }
          if (p.x <= 145) { crestSamples++; crest ??= record(); }
          if (!gateArrival && distance(p, gate) < 2) gateArrival = record();
          if (!firstGap && (!r.corridorReady || !r.shoreReady
            || r.corridorOriginalInstances !== r.corridorPlacements || r.shoreVolumeInstances !== r.shorePlacements
            || r.corridorPlacements <= 0 || r.shorePlacements <= 0
            || (r.stage==='ridge-to-lake' && r.visibleInstances!==0))) firstGap = record();
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    async function runTo(target) {
      const start = performance.now();
      let tries = 0, stagnant = 0, closest = Infinity;
      const measuredDistance = () => {
        const d = distance(state().checkpoint.position,target);
        closest = Math.min(closest,d);
        return d;
      };
      while (measuredDistance() > 1.7 && performance.now() - start < 45_000) {
        const { position, cameraYaw } = state().checkpoint;
        const dx = target.x - position.x, dz = target.z - position.z;
        const x = dx * Math.cos(cameraYaw) - dz * Math.sin(cameraYaw);
        const y = dx * Math.sin(cameraYaw) + dz * Math.cos(cameraYaw);
        const axis = Math.round(Math.atan2(y, x) / (Math.PI / 4));
        const keys = [];
        if (Math.abs(axis) < 2) keys.push('KeyD');
        if (Math.abs(axis) > 2) keys.push('KeyA');
        if (axis > 0 && axis < 4) keys.push('KeyS');
        if (axis < 0 && axis > -4) keys.push('KeyW');
        if (window.steerRouteJoystick) {
          const length = Math.hypot(x,y);
          await window.steerRouteJoystick(x/length,y/length);
        } else {
          key('keydown', 'ShiftLeft');
          for (const code of keys) key('keydown', code);
        }
        await delay(distance(position, target) < 3 ? 135 : 230);
        if (!window.steerRouteJoystick) {
          for (const code of keys) key('keyup', code);
          key('keyup', 'ShiftLeft');
        }
        tries++;
        if (distance(position, state().checkpoint.position) < .025) {
          stagnant++;
          if (window.steerRouteJoystick) await window.steerRouteJoystick(0,0);
          const dismissGuide = document.querySelector('[data-testid="music-guide-invitation"] button:last-child');
          if (dismissGuide?.textContent === '先自己逛逛') dismissGuide.click();
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true }));
        }
        await delay(25);
      }
      if (window.steerRouteJoystick) await window.steerRouteJoystick(0,0);
      const snapshot = state(), position = snapshot.checkpoint.position;
      return {
        target: { x: target.x, z: target.z }, position, within: Math.min(closest,distance(position,target)), stoppedAtDistance:distance(position,target),
        tries, stagnant, area: snapshot.location, entry: snapshot.previewEntry,
        resident: snapshot.desertDecoration?.resident, draws: snapshot.desertDecoration?.visibleDraws,
        triangles: snapshot.desertDecoration?.visibleTriangles, textureBytes: snapshot.desertDecoration?.textureBytes,
        ...(overlook && {route: snapshot.desertOasis.route, oasisDraws: snapshot.desertOasis.visibleDraws, oasisTriangles: snapshot.desertOasis.visibleTriangles}),
      };
    }

    const legs = [['out', points]];
    if (!overlook) legs.push(['back', [...points].reverse()]);
    for (const [direction, targets] of legs) {
      for (const target of targets) {
        const step = await runTo(target);
        steps.push({ direction, ...step });
        if (step.within > 3) break;
      }
      if (steps.at(-1).within > 3) break;
    }
    track = false;
    let court, afterExit;
    if (overlook && state().currentGallery === 'music') {
      const limit = performance.now() + 90_000;
      while (performance.now() < limit) {
        const i = state(), route = i.desertOasis.route;
        if (route.courtWarmup.length && route.backgroundModels.every(key => route.backgroundReady.includes(key))) {
          court = {route, area:i.currentGallery, mountain:i.terrain.scene.streaming.cliffMountainAsset};
          break;
        }
        await delay(250);
      }
      await runTo(points[points.length-2]);
      const step = await runTo(exitPoint);
      // Wait beyond the 12-second normal mesh retention period after leaving.
      await delay(13_000);
      const i = state();
      afterExit = {within:step.within, area:i.currentGallery ?? 'outdoors', ready:i.desertOasis.route.backgroundReady};
    }
    frames.sort((a, b) => a - b);
    downhillFrames.sort((a,b)=>a-b);
    return {
      steps, frameCount: frames.length, p50FrameMs: frames[Math.floor(frames.length * .5)],
      p95Frames: frames[Math.floor(frames.length * .95)], p99FrameMs: frames[Math.floor(frames.length * .99)],
      longestFrameMs: frames.at(-1),
      ...(overlook && {crestSamples, downhillSamples, firstGap, crest, gateArrival, detailReady,
        downhillP95Ms:downhillFrames[Math.floor(downhillFrames.length*.95)], worstDownhillFrame, court, afterExit}),
      final: state().checkpoint.position,
    };
  }, {points:waypoints, overlook, gate:TERRAIN_ANCHORS.musicGate, exitPoint:toTerrainPoint('music', {x:40.2, z:16})});
  if (overlook) {
    const last = result.steps.at(-1);
    assert(result.steps.length===waypoints.length && last.within<=3,
      'Interrupted route '+JSON.stringify({steps:result.steps.length,target:last.target,position:last.position,distance:last.within,
        tries:last.tries,stagnant:last.stagnant,area:last.area,entry:last.entry,stage:last.route.stage,
        ready:result.detailReady?.position,firstGap:result.firstGap,errors,badRequests}));
    const phases = result.steps.map(step => step.route.stage);
    assert(phases.indexOf('ridge-to-lake') >= 0 && phases.indexOf('ridge-to-lake') < phases.indexOf('lake-to-cliff-landmarks'));
    assert.equal(phases.at(-1), 'lake-to-cliff-complete');
    assert(result.crestSamples >= 8, 'Too few samples across the crest');
    assert(result.downhillSamples > result.crestSamples, 'Missing the descent to the second gate');
    if (!reference) {
      assert.equal(result.firstGap, undefined, 'Incomplete detailed geometry along the route: '+JSON.stringify(result.firstGap));
      assert(result.detailReady && result.detailReady.position.x < 135, 'Models arrived after the crest');
    }
    assert(result.gateArrival, 'Did not sample the real second-gallery gate');
    assert.equal(result.court?.area, 'music');
    assert(result.court.route.backgroundReady.length > 0);
    assert(result.afterExit.within <= 3);
    assert.equal(result.afterExit.area, 'outdoors');
    assert.deepEqual(result.afterExit.ready, result.court.route.backgroundReady);
  }
  if (preview) {
    result.storedProgress = await page.evaluate(({ progressKeys, checkpointKey }) => ({
      first: localStorage.getItem('dunhuang:first-gallery:v1'),
      music: progressKeys.filter(key => /:(chapter:|instrument:|outfit$|award$)/.test(key) && localStorage.getItem(key)),
      checkpoint: sessionStorage.getItem(checkpointKey),
    }), { progressKeys: MUSIC_GALLERY_PROGRESS_KEYS, checkpointKey: FIRST_GALLERY_WORLD_SESSION_KEY });
  }
  await mkdir(output, { recursive: true });
  const file = join(output, `${overlook ? (reference ? 'ridge-to-gate-reference' : 'ridge-to-gate-sparse-outer-v014') : 'continuous-route'}-${mobile ? 'mobile' : 'desktop'}${before ? '-before' : ''}${preview ? '-preview' : ''}.json`);
  const last = result.steps.at(-1);
  console.log(JSON.stringify({ steps: result.steps.length, end: last.position, p95Frames: result.p95Frames, file }));
  assert.equal(result.steps.length, waypoints.length * (overlook ? 1 : 2), 'The real player failed to travel the complete route');
  assert(last.within <= 3, 'The real player failed to reach the last waypoint');
  assert.deepEqual(errors, []);
  assert.deepEqual(badRequests, []);
  if (preview) assert.deepEqual(result.storedProgress, { first: null, music: [], checkpoint: null });
  if (mobile && !before && !overlook) {
    assert(result.steps.some(step => (step.draws ?? 0) > 0), 'The mobile traversal did not reach any decoration');
    assert(result.steps.every(step => (step.draws ?? 0) <= 20 && (step.triangles ?? 0) <= 30_000
      && (step.textureBytes ?? 0) <= 32 * 1024 ** 2), 'The mobile route exceeded its incremental render budget');
  }

  await writeFile(file, JSON.stringify(result, null, 2) + '\n');
} finally {
  await browser.close();
}
