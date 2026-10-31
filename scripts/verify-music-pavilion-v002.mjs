import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='http://localhost:4195/',prefix='work/world/music-pavilion-v002';
const report={passed:false,errors:[],checks:[],screens:[]};
const hash=data=>createHash('sha256').update(data).digest('hex');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:1279,height:925},deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  const state=()=>page.evaluate(()=>window.__musicPavilion.inspect());
  const load=async view=>{await page.goto(`${base}?view=${view}`);await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded,undefined,{timeout:45000});};
  const photo=async name=>{const path=`${prefix}-${name}.png`;await page.screenshot({path});report.screens.push({name,path,state:await state()});};
  const check=name=>report.checks.push(name);
  const started=Date.now();await load('start');report.firstLoadMs=Date.now()-started;
  await page.waitForFunction(()=>window.__musicPavilion.inspect().cinematic?.id==='opening');await page.waitForFunction(()=>window.__musicPavilion.inspect().cinematic?.time>.4);await photo('opening');
  await page.waitForFunction(()=>!window.__musicPavilion.inspect().cinematic);check('approved opening still plays');

  await load('sidewalk');const p0=(await state()).checkpoint.position;await photo('sidewalk-before');
  await page.keyboard.down('d');await page.waitForTimeout(3000);await page.keyboard.up('d');const turned=await state();await photo('sidewalk-after');
  expect(turned.checkpoint.position.x-p0.x).toBeGreaterThan(4.5);expect(Math.abs(turned.checkpoint.position.z-p0.z)).toBeLessThan(.02);expect(Math.abs(turned.checkpoint.cameraYaw+Math.PI/2)).toBeLessThan(.08);
  await page.waitForTimeout(300);expect((await state()).checkpoint.position).toEqual(turned.checkpoint.position);check('held sideways movement turns camera without circling; release stops');
  await page.keyboard.down('q');await page.waitForTimeout(300);await page.keyboard.up('q');const manual=(await state()).checkpoint.cameraYaw;
  await page.keyboard.down('w');await page.waitForTimeout(550);await page.keyboard.up('w');expect(Math.abs((await state()).checkpoint.cameraYaw-manual)).toBeLessThan(.01);check('manual camera has priority over automatic follow');

  await load('mural');await photo('mural-follow-body-visible');expect((await state()).camera.position[2]).toBeLessThan(-8.4);expect((await state()).flying.color).toBe(0);
  await page.locator('canvas[data-world-canvas]').click();await page.waitForFunction(()=>window.__musicPavilion.recordingAudio());
  await page.evaluate(()=>{const stream=document.querySelector('canvas[data-world-canvas]').captureStream(24);for(const t of window.__musicPavilion.recordingAudio().getAudioTracks())stream.addTrack(t.clone());window.__chunks=[];window.__recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus'});window.__recorder.ondataavailable=e=>{if(e.data.size)window.__chunks.push(e.data);};window.__recorder.start();});
  await page.keyboard.press('f');await photo('mural-observation-gray');await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>.8);
  await page.getByTestId('flying-pause').click();const paused=await state();await page.waitForTimeout(400);const still=await state();
  expect(still.flying.time).toBe(paused.flying.time);expect(still.musicAudio.playing).toBe(false);expect(still.musicAudio.currentTime-paused.musicAudio.currentTime).toBeLessThan(.12);
  await page.getByTestId('flying-pause').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await photo('mural-color');
  await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>4.8);await photo('ribbon-frame-a');await page.waitForTimeout(1900);await photo('ribbon-frame-b');
  const bytes=await page.evaluate(()=>new Promise(resolve=>{window.__recorder.onstop=async()=>{resolve(Array.from(new Uint8Array(await new Blob(window.__chunks).arrayBuffer())));window.__recorder.stream.getTracks().forEach(t=>t.stop());};window.__recorder.stop();}));
  await writeFile(`${prefix}-flying-motion.webm`,Buffer.from(bytes));check('gray-to-color, visible ribbon animation and audio pause/resume');
  const observation=(await state()).checkpoint.position;await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');expect((await state()).checkpoint.position).toEqual(observation);check('observation prevents walking');
  await page.getByTestId('flying-exit').click();expect((await state()).flying.color).toBe(0);expect((await state()).checkpoint.visitedEvents).toContain('flying');await photo('mural-exit-gray');
  for(let cycle=0;cycle<2;cycle++){
    await page.keyboard.press('f');expect((await state()).flying.color).toBeLessThan(.02);await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);
    await page.getByTestId('flying-exit').click();expect((await state()).flying.color).toBe(0);
  }
  check('three complete observations each restore gray on exit while preserving participation');
  await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>1);await page.getByTestId('flying-replay').click();expect((await state()).flying.color).toBeLessThan(.02);await page.keyboard.press('Escape');expect((await state()).flying.color).toBe(0);check('replay and early Escape return to gray');
  await page.getByTestId('world-pause').click();await page.getByTestId('world-resume').click();await page.reload();await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
  expect((await state()).checkpoint.position).toEqual(observation);expect((await state()).flying.color).toBe(0);check('reload restores new-region position with a gray mural');
  await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await page.getByRole('link',{name:'直接选主题',exact:true}).click();await expect(page.getByTestId('world-host')).toHaveCount(0);
  expect(await page.evaluate(()=>!!window.__musicPavilion)).toBe(false);await page.getByTestId('world-return').click();await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);expect((await state()).flying.color).toBe(0);expect((await state()).checkpoint.position).toEqual(observation);check('2D unmount disposes world/audio and return stays gray');
  await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>.5);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.getByTestId('world-resume')).toBeVisible();const blur=await state();await page.waitForTimeout(250);expect((await state()).flying.time).toBe(blur.flying.time);expect((await state()).musicAudio.playing).toBe(false);await page.getByTestId('world-resume').click();await page.getByTestId('flying-exit').click();check('blur pauses animation and music until explicit resume');
  await load('porch');await photo('porch-camera');expect((await state()).checkpoint.position).toEqual({x:40,z:-19.2});
  await load('approach');await photo('pavilion-overview');await page.getByRole('button',{name:'路线',exact:true}).click();await photo('route-map');await page.getByRole('button',{name:'路线',exact:true}).click();check('porch and new spatial route map');
  report.performance=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last=performance.now();const tick=now=>{times.push(now-last);last=now;if(times.length<150)requestAnimationFrame(tick);else{times.sort((a,b)=>a-b);resolve({medianMs:times[75],p95Ms:times[142],stats:window.__musicPavilion.inspect().stats});}};requestAnimationFrame(tick);}));
  await context.close();

  const mobile=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const mp=await mobile.newPage();mp.on('pageerror',e=>report.errors.push(e.message));
  await mp.goto(`${base}?view=mural`);await mp.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);await mp.getByTestId('world-interact').tap();await mp.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await mp.screenshot({path:`${prefix}-mobile.png`});
  for(const id of ['flying-pause','flying-replay','flying-exit']){const rect=await mp.getByTestId(id).boundingBox();expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(844);expect(rect.y+rect.height).toBeLessThanOrEqual(390);}
  await mp.setViewportSize({width:390,height:844});await expect(mp.getByTestId('world-rotate')).toBeVisible();expect((await mp.evaluate(()=>window.__musicPavilion.inspect())).musicAudio.playing).toBe(false);await mp.setViewportSize({width:844,height:390});await mp.getByTestId('world-resume').tap();await mp.getByTestId('flying-exit').tap();expect((await mp.evaluate(()=>window.__musicPavilion.inspect())).flying.color).toBe(0);
  await mp.goto(`${base}?view=sidewalk`);await mp.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);const stick=await mp.getByRole('group',{name:'拖动摇杆行走'}).boundingBox(),cdp=await mobile.newCDPSession(mp);const initial=(await mp.evaluate(()=>window.__musicPavilion.inspect())).checkpoint.position;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+stick.width*.8,y:stick.y+stick.height*.5}]});await mp.waitForTimeout(1500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const end=await mp.evaluate(()=>window.__musicPavilion.inspect());expect(end.checkpoint.position.x).toBeGreaterThan(initial.x+2);expect(Math.abs(end.checkpoint.position.z-initial.z)).toBeLessThan(.05);expect(end.checkpoint.cameraYaw).toBeLessThan(-1.3);await mp.waitForTimeout(200);expect((await mp.evaluate(()=>window.__musicPavilion.inspect())).checkpoint.position).toEqual(end.checkpoint.position);check('mobile touch follow, stop, observation controls and rotation pause');await mobile.close();

  const reduced=await browser.newContext({reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto(`${base}?view=mural`);await rp.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);await rp.keyboard.press('f');await rp.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);expect((await rp.evaluate(()=>window.__musicPavilion.inspect())).flying.movement).toBe(0);await rp.keyboard.press('Escape');expect((await rp.evaluate(()=>window.__musicPavilion.inspect())).flying.color).toBe(0);check('reduced motion is respected without retaining mural color');await reduced.close();
  const audioFailure=await browser.newContext(),ap=await audioFailure.newPage();const audioPattern='**/music-pavilion/v002/arrival-plucks.wav';await audioFailure.route(audioPattern,r=>r.abort());await ap.goto(`${base}?view=mural`);await ap.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);await expect(ap.getByRole('button',{name:'重试乐声'})).toBeVisible();await audioFailure.unroute(audioPattern);await ap.getByRole('button',{name:'重试乐声'}).click();await ap.waitForFunction(()=>window.__musicPavilion.inspect().musicAudio.playing);check('missing music does not block exploration; explicit retry succeeds');await audioFailure.close();
  const muted=await browser.newContext(),mute=await muted.newPage();await mute.addInitScript(()=>localStorage.setItem('dunhuang:sound-settings:v1',JSON.stringify({version:1,enabled:false,volume:.4})));await mute.goto(`${base}?view=mural`);await mute.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);await mute.keyboard.press('f');await mute.waitForTimeout(400);expect((await mute.evaluate(()=>window.__musicPavilion.inspect())).musicAudio.gain).toBe(0);check('shared mute preference silences arrival music');await muted.close();
  for(const asset of ['music-pavilion.glb','mural-original.png','route-dune.glb']){
    const c=await browser.newContext(),p=await c.newPage(),pattern=`**/music-pavilion/v002/${asset}`;await c.route(pattern,r=>r.abort());await p.goto(base);await expect(p.getByTestId('world-error')).toBeVisible({timeout:45000});await c.unroute(pattern);await p.getByTestId('world-retry').click();await p.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);check(`missing ${asset} shows recoverable error`);await c.close();
  }
  const baseline=await browser.newContext(),bp=await baseline.newPage(),requested=[];bp.on('request',r=>requested.push(r.url()));await bp.addInitScript(()=>sessionStorage.setItem('dunhuang:world-session:v1',JSON.stringify({version:1,position:{x:-12,z:-17},heading:0,cameraYaw:0,visitedEvents:[]})));
  await bp.goto(`${base}baseline.html`);await expect(bp.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});await bp.keyboard.press('f');await expect(bp.getByTestId('world-observation')).toBeVisible();expect(requested.some(url=>url.includes('/music-pavilion/'))).toBe(false);check('default map still uses old assets and caisson event');await baseline.close();
  const protectedAssets=JSON.parse(await readFile('art-source/world/music-pavilion/v002/protected-assets.json','utf8'));for(const [path,sha] of Object.entries(protectedAssets))expect(hash(await readFile(path)),path).toBe(sha);report.protectedFiles=Object.keys(protectedAssets).length;
  expect(report.errors).toEqual([]);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack};console.error(error.message);process.exitCode=1;}
finally{await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,failure:report.failure?.message}));await browser.close();}
