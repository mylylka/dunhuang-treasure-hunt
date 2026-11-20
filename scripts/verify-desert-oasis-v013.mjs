import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../src/services/first-gallery-entry.ts';
import { MUSIC_GALLERY_PROGRESS_KEYS } from '../src/services/music-gallery-progress.ts';
import { TERRAIN_ROUTES, TERRAIN_SPAWN } from '../src/content/world/terrain-layout-v001.ts';
import { groundRoadClearance } from '../src/content/world/environment-ground-v001.ts';
import { DESERT_OASIS_PLACEMENTS } from '../src/content/world/desert-oasis-layout-v013.ts';

const output = 'work/qa/desert-oasis-v013';
const origin = process.env.DUNHUANG_DESERT_ORIGIN ?? 'http://localhost:5174';
const refs = async dir => JSON.parse(await readFile('work/design-candidates/' + dir + '/views.json', 'utf8'));
const road = await refs('desert-oasis-v013');
const court = await refs('desert-oasis-v012');
const tower = await refs('desert-oasis-v010');
const ridge = await refs('desert-model-review-v008');
const firstGallery = await refs('desert-oasis-v007');
const cameras = [
  ['first-gallery-corner', '/', firstGallery.find(v => v.viewId === 'first-gallery-corner')],
  ['valley-road', '/', road['valley-road-v013']],
  ['music-court-front', '/first-gallery-v001.html', court['music-court-front-v012']],
  ['music-court-inside', '/first-gallery-v001.html', court['music-court-inside-v012']],
  ['tower-scale', '/first-gallery-v001.html', tower['tower-scale-25m']],
];
for (const stem of ['uphill', 'lake-reed-study-a']) {
  const ref = ridge.find(view => view.viewId === stem);
  cameras.push([stem, '/first-gallery-v001.html', ref]);
}
const screenshots = process.argv.includes('--screenshots');
const selected = process.argv.slice(2).filter(arg => arg !== '--screenshots');
const fullProgress = { version: 1, muralParts: ['lotus','bird','grapes'], caissonCompleted: true,
  coloringCompleted: true, ceremonySeen: true, introductionsSeen: ['mural','caisson','easel'],
  firstSuccessSeen: true, displayedArtworkId: 'qa', artworks: {qa: {artworkId:'qa', levelId:'coloring-feitian-lotus',
    artworkVersion:'v001', colors:{'1':'#d6a35d'}, materials:{}, submittedAt:'2026-11-20T00:00:00.000Z'}} };
const gateProfiles = ['gate-desktop', 'gate-mobile', 'gate-mobile-weak'];
const gateRoad = TERRAIN_ROUTES.find(route => route.id === 'courtyard-to-valley').points;
// This point is on the uphill straight after the first bend, about 23 m from spawn.
const finish = gateRoad.find(point => point.x >= TERRAIN_SPAWN.x + 22);

async function checkGateRun(browser, name) {
  const mobile = name !== 'gate-desktop';
  const viewport = mobile ? {width: 844, height: 390} : {width: 1440, height: 810};
  const context = await browser.newContext({viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block'});
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('/desert-decoration/')) errors.push(r.url()); });
    if (name.endsWith('-weak')) {
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditionsByRule', {offline: false, matchedNetworkConditions: [{
        urlPattern: new URL('/assets/world/desert-decoration/*', origin).href, latency: 150,
        downloadThroughput: 200000, uploadThroughput: 200000,
      }]});
    }
    // Watch before character selection so even a single playable frame with missing scenery is caught.
    await page.addInitScript(() => {
      // The dev entry imports more resources than Chrome's default timing buffer retains.
      performance.setResourceTimingBufferSize(2048);
      let confirmed;
      document.addEventListener('click', event => {
        if (event.target.closest?.('.traveler-selection-enter')) confirmed = performance.now();
      }, {capture: true});
      function captureFirstFrame() {
        const state = window.__terrain?.inspect();
        if (!state?.loaded) {
          requestAnimationFrame(captureFirstFrame);
          return;
        }
        const {models, visibleInstances, visibleDraws, visibleTriangles,route} = state.desertOasis;
        window.__gateFirstFrame = {checkpoint: state.checkpoint, models, visibleInstances, visibleDraws, visibleTriangles,
          ridgeDraws:route?.ridgeDraws ?? 0, ridgeTriangles:route?.ridgeTriangles ?? 0,
          fromConfirmMs: confirmed === undefined ? null : Math.round(performance.now() - confirmed),
          seedRequests: performance.getEntriesByType('resource')
            .filter(r => /desert-decoration.*(?:shrub-2-far|loose-rocks-far)\.glb$/.test(r.name))
            .map(r => ({file:new URL(r.name).pathname.split('/').at(-1), ms:Math.round(r.duration)}))};
      }
      requestAnimationFrame(captureFirstFrame);
    });
    await page.goto(origin + '/', {waitUntil:'domcontentloaded'});
    await page.locator('.traveler-selection-enter').click();
    await page.waitForFunction(() => window.__gateFirstFrame, undefined, {timeout: 90000});
    const opening = await page.evaluate(() => window.__gateFirstFrame);
    assert(Math.hypot(opening.checkpoint.position.x - TERRAIN_SPAWN.x, opening.checkpoint.position.z - TERRAIN_SPAWN.z) < .05);
    function assertGround(models, phase) {
      for (const id of ['R05_碎石小群', 'shrub-2']) {
        assert(models.some(m => m.id === id && m.count > 0), name + ' ' + phase + ' missing visible ' + id);
      }
    }
    assertGround(opening.models, 'first playable frame');
    if (name.endsWith('-weak')) {
      assert.equal(opening.seedRequests.length, 2);
      assert(opening.seedRequests.every(r => r.ms >= 130), 'Seed requests missed the exterior network throttle');
    }
    await page.waitForTimeout(1500);
    const still = await page.evaluate(() => {
      const state = window.__terrain.inspect();
      return {position: state.checkpoint.position, models: state.desertOasis.models};
    });
    assert.deepEqual(still.position, opening.checkpoint.position);
    assertGround(still.models, 'without input');

    // Rotate toward the path with normal camera controls, then hold run through the bend in one gesture.
    const desiredYaw = Math.atan2(TERRAIN_SPAWN.x - finish.x, TERRAIN_SPAWN.z - finish.z);
    let drag = (opening.checkpoint.cameraYaw - desiredYaw) / .004;
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: points});
    const x = Math.ceil(viewport.width * .51), y = Math.round(viewport.height * .48);
    while (Math.abs(drag) > 1) {
      const delta = Math.sign(drag) * Math.min(Math.abs(drag), viewport.width * .37);
      if (mobile) {
        await touch('touchStart', [{x,y}]);
        await touch('touchMove', [{x:x+delta,y}]);
        await touch('touchEnd', []);
      } else {
        await page.mouse.move(x,y); await page.mouse.down({button:'right'});
        await page.mouse.move(x+delta,y,{steps:6}); await page.mouse.up({button:'right'});
      }
      drag -= delta;
    }
    const yaw = await page.evaluate(() => window.__terrain.inspect().checkpoint.cameraYaw);
    assert(Math.abs(yaw - desiredYaw) < .04, name + ' did not turn toward the first bend');
    if (mobile) {
      const stick = await page.getByRole('group', {name:'拖动摇杆行走'}).boundingBox();
      assert(stick, 'Mobile joystick is missing');
      const cx = stick.x + stick.width / 2, cy = stick.y + stick.height / 2;
      await touch('touchStart', [{x:cx,y:cy}]);
      await touch('touchMove', [{x:cx,y:cy-stick.height*.43}]);
    } else {
      await page.keyboard.down('Shift'); await page.keyboard.down('w');
    }
    const samples = [];
    try {
      for (let n = 0; n < 90; n++) {
        const sample = await page.evaluate(() => {
          const {checkpoint,desertOasis:o} = window.__terrain.inspect();
          return {position:checkpoint.position, elapsed:performance.now(), instances:o.visibleInstances,
            triangles:o.visibleTriangles, draws:o.visibleDraws, ridgeDraws:o.route?.ridgeDraws ?? 0, ridgeTriangles:o.route?.ridgeTriangles ?? 0, forward:o.forwardModels,
            ground:o.models.filter(m => m.count > 0 && (m.lod === 'lod' || m.lod === 'near')).map(m => m.id)};
        });
        samples.push(sample);
        if (sample.position.x >= finish.x - .4) break;
        await page.waitForTimeout(90);
      }
    } finally {
      if (mobile) await touch('touchEnd', []);
      else { await page.keyboard.up('w'); await page.keyboard.up('Shift'); }
    }
    const end = samples.at(-1);
    assert(Math.hypot(end.position.x - finish.x, end.position.z - finish.z) < 1.5, name+' did not reach the uphill straight');
    assert(samples.every(s => groundRoadClearance(s.position.x,s.position.z) <= .5), name+' departed the stone path');
    assert(samples.every(s => s.instances > 0), name+' had a blank running sample');
    const predicted = new Set();
    let drewPredictedModel = false;
    for (const sample of samples) {
      if (sample.ground.some(id => predicted.has(id))) drewPredictedModel = true;
      for (const key of sample.forward ?? []) predicted.add(key.split(':')[0]);
    }
    assert(predicted.size > 0, name+' did not look ahead while running');
    assert(drewPredictedModel, name+' did not draw any previously anticipated route model');
    if (mobile) assert([opening,...samples].every(s => (s.triangles ?? s.visibleTriangles) - s.ridgeTriangles <= 28000 &&
      (s.draws ?? s.visibleDraws) - s.ridgeDraws <= 18), name+' exceeded the mobile streaming budget outside the fixed real meshes');
    const saved = await page.evaluate(() => window.__terrain.inspect().checkpoint);
    await page.waitForFunction(({key,point}) => {
      const c=JSON.parse(sessionStorage.getItem(key));
      return c && Math.hypot(c.position.x-point.x,c.position.z-point.z) < .05;
    }, {key:FIRST_GALLERY_WORLD_SESSION_KEY,point:saved.position}, {timeout:6000});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.__gateFirstFrame, undefined, {timeout:90000});
    const restored = await page.evaluate(() => window.__gateFirstFrame.checkpoint);
    assert(Math.hypot(restored.position.x-saved.position.x,restored.position.z-saved.position.z) < .05);
    assert(Math.abs(restored.cameraYaw-saved.cameraYaw) < .04);
    assert.deepEqual(errors, []);
    console.log(name, JSON.stringify({confirmToPlayableMs:opening.fromConfirmMs, seedRequests:opening.seedRequests, firstModels:opening.models,
      stillVisible:still.models.reduce((count,m)=>count+m.count,0), runMetres:Math.round(Math.hypot(end.position.x-TERRAIN_SPAWN.x,end.position.z-TERRAIN_SPAWN.z)),
      samples:samples.length, minVisible:Math.min(...samples.map(s=>s.instances)), maxDraws:Math.max(...samples.map(s=>s.draws)),
      maxTriangles:Math.max(...samples.map(s=>s.triangles)), forwardModels:[...new Set(samples.flatMap(s=>s.forward))],
      restoredAt:restored.position}));
  } finally { await context.close(); }
}

const records = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const profiles = selected.length ? gateProfiles.filter(name => selected.includes(name)) : gateProfiles.slice(0,2);
  for (const name of profiles) await checkGateRun(browser,name);
  for (const [name, entry, view] of cameras.filter(([name]) => !selected.length || selected.includes(name))) {
    const reference = view.checkpoint;
    const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, serviceWorkers: 'block' });
    try {
      const page = await context.newPage();
      const errors = [], loadedUrls = new Set(), bad = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', msg => { if (msg.type() === 'error' && /shader|program link|WebGLProgram/i.test(msg.text())) errors.push(msg.text()); });
      page.on('request', req => loadedUrls.add(new URL(req.url()).pathname));
      page.on('response', res => { if (res.status() >= 400 && /desert-decoration/.test(res.url())) bad.push([res.status(), res.url()]); });
      await page.addInitScript(({ key, checkpoint, music, first, locked }) => {
        localStorage.setItem('dunhuang:traveler-selection:v1','tripo');
        if (!locked) {
          localStorage.setItem('dunhuang:first-gallery:v1', JSON.stringify(first));
          for (const k of music) localStorage.setItem(k, 'yes');
        }
        sessionStorage.setItem(key, JSON.stringify(checkpoint));
      }, { key: FIRST_GALLERY_WORLD_SESSION_KEY, checkpoint: reference, music: MUSIC_GALLERY_PROGRESS_KEYS, first: fullProgress, locked: name==='first-gallery-corner' });
      await page.goto(origin + entry, {waitUntil:'domcontentloaded'});
      await page.waitForFunction(() => window.__terrain?.inspect().loaded, undefined, {timeout: 75000});
      const initial = await page.evaluate(() => window.__terrain.inspect().checkpoint);
      assert(Math.hypot(initial.position.x-reference.position.x,initial.position.z-reference.position.z) < .12, name+' restored an unexpected position');
      await page.keyboard.down('ArrowUp');
      try {
        await page.waitForFunction(p => { const {position}=window.__terrain.inspect().checkpoint;
          return Math.hypot(position.x-p.x,position.z-p.z) > .5;
        }, initial.position, {timeout:10000});
      } finally { await page.keyboard.up('ArrowUp'); }
      // Restore the review angle with the normal wheel and drag controls.
      // Looking up matters here: the court's crown rises well above the roof.
      const targetView = view.camera;
      const camera = await page.evaluate(() => window.__terrain.inspect().camera);
      const horizontal = (a,b) => Math.hypot(a[0]-b[0],a[2]-b[2]);
      const pitch = c => Math.atan2(c.target[1]-c.position[1],horizontal(c.target,c.position));
      await page.mouse.move(710,460);
      let zoom = targetView.zoomOffset ?? (horizontal(targetView.position,[reference.position.x,0,reference.position.z])
        -horizontal(camera.position,camera.target))*1.04;
      zoom=Math.max(-4,Math.min(10,zoom));
      while (Math.abs(zoom)>.02) {
        const step=Math.max(-2,Math.min(2,zoom));
        await page.mouse.wheel(0,step*100);
        await page.waitForTimeout(100);
        zoom-=step;
      }
      await page.waitForTimeout(400);
      const currentCamera=await page.evaluate(()=>window.__terrain.inspect().camera);
      const pitchDrag=(pitch(targetView)-pitch(currentCamera))/.004;
      await page.mouse.down({button:'right'});
      await page.mouse.move(710,460-pitchDrag,{steps:8});
      await page.mouse.up({button:'right'});
      await page.waitForFunction(expected=>{
        const {target:t,position:p}=window.__terrain.inspect().camera;
        return Math.abs(Math.atan2(t[1]-p[1],Math.hypot(t[0]-p[0],t[2]-p[2]))-expected)<.04;
      },pitch(targetView),{timeout:10000});
      await page.waitForFunction(() => {
        const o=window.__terrain.inspect().desertOasis;
        return o?.visibleInstances>0 && (o.pending?.length??o.pending??0)===0;
      }, undefined, {timeout:90000});
      let lastSignature = '', stable = 0, snapshot;
      // Streaming is scheduled in batches. Require several consecutive independent
      // snapshots so that the image is taken after the last queued geometry.
      for (let i=0;i<120 && stable<5;i++) {
        await page.waitForTimeout(300);
        snapshot = await page.evaluate(() => {
          const i=window.__terrain.inspect();
          return { checkpoint:i.checkpoint, oasis:i.desertOasis, venue:i.terrain.scene.streaming,
            camera:i.camera, progress:JSON.parse(localStorage.getItem('dunhuang:first-gallery:v1'))?.displayedArtworkId ?? null };
        });
        const o=snapshot.oasis;
        const sig=JSON.stringify([o.visibleInstances,o.visibleTriangles,o.models,o.pending,o.resident]);
        if (sig===lastSignature && !o.pending && o.wanted.every(key=>o.resident.includes(key))) stable++;
        else stable=0;
        lastSignature=sig;
      }
      if (name==='first-gallery-corner') {
        assert.equal(snapshot.progress,null);
        assert(!snapshot.oasis.landmarks.some(tree => tree.id==='大树9'));
      } else assert.equal(snapshot.progress,'qa');
      if (name.startsWith('music-court')) {
        assert(snapshot.oasis.landmarks.some(tree => tree.id === '大树9' && Math.abs(tree.height-26.68748)<.02
          && tree.gradeVertices>0 && tree.castShadow), 'Courtyard tree missing its scale or shading');
      }
      if (name==='tower-scale') {
        assert(snapshot.oasis.landmarks.some(tree=> tree.id.startsWith('T02') && Math.abs(tree.height-25)<.01),
          'The 25 metre curved poplar is missing at the tower');
      }
      assert(stable>=5, 'Did not settle '+name);
      assert.equal(snapshot.oasis.failed?.length??snapshot.oasis.failed??0, 0);
      assert.equal(snapshot.oasis.placements, DESERT_OASIS_PLACEMENTS.length);
      assert.deepEqual(errors, []); assert.deepEqual(bad, []);
      assert([...loadedUrls].some(url=>url.includes('/desert-decoration/v013/')));
      assert(![...loadedUrls].some(url=>/work\/design-candidates|__design_assets__|\/Downloads\//.test(url)));
      if (screenshots) await page.screenshot({path:output+'/'+name+'.jpg',type:'jpeg',quality:90});
      records.push({name,entry,...snapshot,initialCheckpoint:initial,requests:[...loadedUrls].filter(s=>s.includes('/desert-decoration/'))});
      console.log(name,snapshot.oasis.visibleInstances,snapshot.oasis.visibleTriangles,snapshot.oasis.visibleDraws);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
assert.equal(records.length, selected.length ? selected.filter(name => !gateProfiles.includes(name)).length : cameras.length);
if (records.length) await writeFile(output+'/'+(selected.length?selected.join('-')+'-':'')+'desktop.json',JSON.stringify(records,null,2)+'\n');
