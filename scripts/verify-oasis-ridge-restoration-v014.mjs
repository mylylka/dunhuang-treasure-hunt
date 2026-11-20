import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium, devices } from 'playwright';
import { LAKE_ORIGIN, TERRAIN_ROUTES } from '../src/content/world/terrain-layout-v001.ts';
import { DESERT_OASIS_PLACEMENTS } from '../src/content/world/desert-oasis-layout-v013.ts';
import { oasisModelV013 } from '../src/content/world/desert-oasis-assets-v013.ts';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../src/services/first-gallery-entry.ts';

const mobile = process.argv.includes('--mobile');
const before = process.argv.includes('--before');
const banks = process.argv.includes('--banks');
const device = mobile ? 'mobile' : 'desktop';
const output = 'work/qa/desert-oasis-v013';
const url = process.env.DUNHUANG_DESERT_ORIGIN ?? 'http://127.0.0.1:5174/';
const file = output + (banks?'/lake-banks-':'/ridge-locked-') + device + (before ? '-before' : '-sparse-outer-v014');
const viewport = mobile ? {width:844,height:390} : {width:1366,height:768};
const summit = TERRAIN_ROUTES[0].points.reduce((highest,p) => p.y > highest.y ? p : highest);
// The low dune behind the convex bank looks across the sparse shore to the inner reeds.
const position = banks ? {x:294,z:-110} : {x:summit.x,z:summit.z};
const lookAt = banks ? {x:250.6,z:-77.07} : LAKE_ORIGIN;
const yaw = Math.atan2(position.x-lookAt.x, position.z-lookAt.z);
const browser = await chromium.launch({channel:'chrome', args:['--enable-unsafe-swiftshader']});
try {
  const context = await browser.newContext({...devices[mobile?'iPhone 13 landscape':'Desktop Chrome'],
    viewport, screen:viewport, deviceScaleFactor:mobile?2:1, serviceWorkers:'block'});
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type()==='error' && /WebGLProgram|shader error/i.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if(r.status() >= 400 && r.url().includes('/desert-decoration/')) errors.push(r.url()); });
  await page.addInitScript(({position, yaw, key}) => {
    // Subscribe to Three's normal devtools observation so the measured meshes come
    // from the renderer's main-camera list, independent of the game's diagnostics.
    const scenes = [];
    let renderer, mainDraws;
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe', ({detail}) => {
      if (detail.isScene) scenes.push(detail);
      if (detail.isWebGLRenderer) {
        renderer=detail;
        const render=renderer.render.bind(renderer);
        renderer.render=(scene,camera)=>{
          const result=render(scene,camera);
          if (camera.isPerspectiveCamera && scene.getObjectByName('desert-oasis-v013')) {
            // A subsequent static-shadow update may replace Three's depth-zero list.
            // Capture our camera at the end of its render, before another pass starts.
            const l=renderer.renderLists.get(scene,0);
            mainDraws=[...l.opaque,...l.transparent,...l.transmissive].filter(it=>it.object.name.includes('oasis'))
              .map(({object,material})=>({object,material}));
          }
          return result;
        };
      }
    });
    localStorage.setItem('dunhuang:traveler-selection:v1','classic');
    sessionStorage.setItem(key,JSON.stringify({version:1,position,heading:yaw,cameraYaw:yaw,visitedEvents:[]}));
    performance.setResourceTimingBufferSize(3000);
    window.ridgeProbe = {scenes,get renderer(){return renderer;},get mainDraws(){return mainDraws;},frameCount:0,missed:0};
    function sample(now) {
      const data = window.__terrain?.inspect(), probe = window.ridgeProbe;
      if (data?.loaded) {
        const route = data.desertOasis.route;
        probe.first ??= {ms: Math.round(now), route, checkpoint:data.checkpoint};
        if (route.corridorReady && route.shoreReady) probe.firstReadyMs??=Math.round(now);
        probe.frameCount++;
        if (!route.corridorReady || !route.shoreReady
          || route.corridorOriginalInstances !== route.corridorPlacements || route.shoreVolumeInstances !== route.shorePlacements) probe.missed++;
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  },{position,yaw,key:FIRST_GALLERY_WORLD_SESSION_KEY});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ridgeProbe.first,undefined,{timeout:120_000});
  if (banks) {
    await page.waitForFunction(()=>window.ridgeProbe.firstReadyMs,undefined,{timeout:60_000});
  }
  await page.waitForTimeout(500);
  const first = await page.evaluate(()=>window.ridgeProbe.first);
  assert(Math.hypot(first.checkpoint.position.x-position.x,first.checkpoint.position.z-position.z)<.05);
  assert(Math.abs(first.checkpoint.cameraYaw-yaw)<.01);
  const inspectDraws = () => page.evaluate(() => {
    const state = window.__terrain.inspect(), {scenes,renderer,mainDraws}=window.ridgeProbe;
    const world = scenes.find(scene=>scene.getObjectByName('desert-oasis-v013'));

    const direction = state.terrain.scene.lighting.sunDirection;
    const sun = world.position.clone().fromArray(direction);
    const normals = {}, draws = [];
    for (const item of mainDraws??[]) {
      const mesh=item.object;
      if (!mesh.name.includes('oasis')) continue;
      const g=mesh.geometry, normal=g.getAttribute('normal');
      const tri=Math.min(g.index?.count??g.getAttribute('position').count,g.drawRange.count)/3;
      const count=mesh.isInstancedMesh?mesh.count:1;
      if (!tri || !count) continue;
      draws.push({name:mesh.name,count,trianglesPerInstance:tri,material:item.material.type,
        receivesSunShadow:mesh.receiveShadow,castsShadow:mesh.castShadow});
      if (!normal) continue;
      const transform=mesh.matrixWorld.clone();
      if(mesh.isInstancedMesh) {
        mesh.getMatrixAt(0,transform);
        transform.premultiply(mesh.matrixWorld);
      }
      const rotation=mesh.normalMatrix.clone().getNormalMatrix(transform);
      const v=mesh.position.clone();
      let facingSun=0, facingAway=0, samples=0;
      for(let i=0;i<normal.count;i+=Math.max(1,Math.floor(normal.count/256))) {
        const dot=v.fromBufferAttribute(normal,i).applyNormalMatrix(rotation).dot(sun);
        if(dot>.45) facingSun++;
        if(dot<-.15) facingAway++;
        samples++;
      }
      normals[mesh.name]={samples,facingSun,facingAway};
    }
    const gl=renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {route:state.desertOasis.route, camera:state.camera, lighting:direction,
      venueVisible:state.terrain.scene.streaming.musicBuildingVisible, towerVisible:state.terrain.scene.streaming.cliffTowerVisible,
      graphics:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null, draws, normals,
      progress:JSON.parse(localStorage.getItem('dunhuang:first-gallery:v1')??'null')};
  });
  const lake = await inspectDraws();
  assert.equal(lake.venueVisible,false); assert.equal(lake.towerVisible,false);
  assert(!lake.progress?.ceremonySeen);
  if (!before) {
    assert(first.route.corridorReady && first.route.shoreReady,'Restored shore or summit opened without its 3D cover: '+JSON.stringify(first.route));
    for (const layer of (banks ? ['volume'] : ['original','volume'])) {
      const batches = lake.draws.filter(d=>d.name.startsWith('oasis-ridge-'+layer+':'));
      assert(batches.length>0, 'Missing actual rendered '+layer+' batches at the summit '+JSON.stringify({submitted:lake.draws.map(d=>d.name),route:lake.route,camera:lake.camera,errors}));
      if (layer==='original') {
        const original = batches.filter(d=>['shrub-2','s04b','g02','r04','valley-cushion-shrub','valley-sage-branches'].includes(d.name.split(':')[1]));
        assert(original.length>0 && original.every(d=>d.trianglesPerInstance===oasisModelV013(d.name.split(':')[1]).triangles),
          'Submitted route geometry differs from accepted close-up GLBs');
      }
      assert(batches.every(d=>d.trianglesPerInstance>8 && d.material==='MeshStandardMaterial' && d.receivesSunShadow),
        'Expected actual PBR geometry receiving shadows for '+layer);
      assert(batches.some(d=>{const n=lake.normals[d.name];return n.facingSun>0 && n.facingAway>0;}),
        'Expected normals on both sides of the actual scene sun for '+layer);
    }
  }
  await page.screenshot({path:file+'.jpg',quality:91,type:'jpeg',scale:'css'});
  async function drag(delta) {
    const x=Math.round(viewport.width/2),y=Math.round(viewport.height*.52);
    if (mobile) {
      for (const [type,points] of [['touchStart',[{x,y,id:1}]],['touchMove',[{x:x+delta,y,id:1}]],['touchEnd',[]]]) {
        await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
      }
    } else {
      await page.mouse.move(x,y); await page.mouse.down({button:'right'});
      await page.mouse.move(x+delta,y,{steps:5}); await page.mouse.up({button:'right'});
    }
  }
  const pan = Math.round(viewport.width*.32);
  await drag(pan);
  await page.waitForFunction(initial=>Math.abs(window.__terrain.inspect().checkpoint.cameraYaw-initial)>.75,yaw);
  await drag(-pan);
  await page.waitForFunction(initial=>Math.abs(window.__terrain.inspect().checkpoint.cameraYaw-initial)<.025,yaw);
  await page.waitForTimeout(300);
  const originalPaths = [...new Set(DESERT_OASIS_PLACEMENTS.map(p=>'/'+oasisModelV013(p.id).url))];
  const check = await page.evaluate(paths=>{
    const {frameCount,missed,firstReadyMs}=window.ridgeProbe;
    const {camera,checkpoint,desertOasis:o}=window.__terrain.inspect();
    const resources=performance.getEntriesByType('resource').filter(e=>e.name.includes('/desert-decoration/v014/'))
      .map(e=>({name:new URL(e.name).pathname.split('/').at(-1),encodedBytes:e.encodedBodySize,ms:Math.round(e.duration)}));
    const originals = performance.getEntriesByType('resource').filter(r=>paths.includes(new URL(r.name).pathname))
      .map(r=>({name:new URL(r.name).pathname.split('/').at(-1),encodedBytes:r.encodedBodySize,ms:Math.round(r.duration)}));
    return {frameCount,missed,firstReadyMs,camera,checkpoint,route:o.route,resources,originals};
  },originalPaths);
  assert(check.frameCount>5); if (!before) assert.equal(check.missed,0,'Source meshes dropped during stationary pan');
  assert.deepEqual(check.checkpoint.position,first.checkpoint.position);
  assert.deepEqual(errors,[]);
  await writeFile(file+'.json',JSON.stringify({device,position,yaw,first,lake,afterPan:check},null,2)+'\n');
  console.log(JSON.stringify({file,firstPlayableMs:first.ms,frames:check.frameCount,missed:check.missed,
    gpuBatches:lake.draws.length,graphics:lake.graphics}));
} finally { await browser.close(); }
