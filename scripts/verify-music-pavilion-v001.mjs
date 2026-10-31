import { chromium, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base='http://localhost:4194/',prefix='work/world/music-pavilion-v001';
const layout=JSON.parse(await readFile('src/content/world/music-pavilion-layout.json','utf8'));
const report={passed:false,errors:[],checks:[],screens:[],videos:[]};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let browser;
try{
  browser=await chromium.launch({channel:'chrome',args:['--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1279,height:925},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
  const state=()=>page.evaluate(()=>window.__musicPavilion.inspect());
  async function load(view){await page.goto(`${base}${view?`?view=${view}`:''}`);await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded,undefined,{timeout:45000});}
  async function photo(name){const path=`${prefix}-${name}.png`;await page.screenshot({path});report.screens.push({name,path,state:await state()});}
  async function startVideo(){await page.evaluate(()=>{const stream=document.querySelector('canvas[data-world-canvas]').captureStream(24);window.__videoChunks=[];window.__recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});window.__recorder.ondataavailable=e=>{if(e.data.size)window.__videoChunks.push(e.data)};window.__recorder.start();});}
  async function stopVideo(name){const bytes=await page.evaluate(()=>new Promise(resolve=>{window.__recorder.onstop=async()=>{resolve(Array.from(new Uint8Array(await new Blob(window.__videoChunks).arrayBuffer())));window.__recorder.stream.getTracks().forEach(t=>t.stop());};window.__recorder.stop();}));const path=`${prefix}-${name}.webm`;await writeFile(path,Buffer.from(bytes));report.videos.push({name,path,bytes:bytes.length});}
  async function walkTo(x,z){
    const start=Date.now(),keys=new Set();await page.keyboard.down('Shift');
    while(Date.now()-start<15000){
      const p=(await state()).checkpoint.position,dx=x-p.x,dz=z-p.z;
      if(Math.hypot(dx,dz)<.23)break;
      const next=new Set();if(Math.abs(dx)>.13)next.add(dx>0?'d':'a');if(Math.abs(dz)>.13)next.add(dz>0?'s':'w');
      for(const key of keys)if(!next.has(key))await page.keyboard.up(key);
      for(const key of next)if(!keys.has(key))await page.keyboard.down(key);
      keys.clear();next.forEach(key=>keys.add(key));await page.waitForTimeout(65);
    }
    for(const key of keys)await page.keyboard.up(key);await page.keyboard.up('Shift');
    const p=(await state()).checkpoint.position;expect(Math.hypot(p.x-x,p.z-z),`walk to ${x},${z}; actual ${JSON.stringify(p)}`).toBeLessThan(.35);
  }
  const started=Date.now();await load('start');report.initialLoad={readyMs:Date.now()-started,resourceBytes:await page.evaluate(()=>performance.getEntriesByType('resource').reduce((sum,item)=>sum+item.encodedBodySize,0))};await page.waitForFunction(()=>window.__musicPavilion.inspect().cinematic?.id==='opening');await page.waitForFunction(()=>window.__musicPavilion.inspect().cinematic?.time>.5);await photo('opening');
  await page.waitForFunction(()=>!window.__musicPavilion.inspect().cinematic);report.checks.push({name:'approved-opening-preserved'});
  await load('courtyard');await photo('courtyard-departure');await startVideo();
  const route=layout.walkingRoute.slice(1);for(const [x,z]of route){await walkTo(x,z);if(x===10)await photo('road-approach');if(x===14&&z===-1)await photo('pavilion-front');}
  await stopVideo('courtyard-to-music');await photo('mural-before');
  expect((await state()).view).toBe('follow');expect((await state()).flying.color).toBe(0);await expect(page.getByTestId('world-interact')).toHaveText(/唤醒飞天/);
  report.checks.push({name:'real-keyboard-route-courtyard-to-mural-no-auto-event',state:await state()});
  await startVideo();await page.keyboard.press('f');await expect(page.getByTestId('world-flying-observation')).toBeVisible();await photo('mural-observation-gray');
  await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>.9);await page.getByTestId('flying-pause').click();const paused=await state();await page.waitForTimeout(350);expect((await state()).flying.time).toBe(paused.flying.time);await photo('mural-reveal-paused');
  await page.getByTestId('flying-pause').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await photo('mural-awakened');
  await page.waitForTimeout(600);await photo('ribbon-frame-a');await page.waitForTimeout(900);await photo('ribbon-frame-b');await stopVideo('flying-awakening');
  report.checks.push({name:'F-reveal-pause-resume-and-ribbon-motion',state:await state()});
  const observation=(await state()).checkpoint.position;await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');expect((await state()).checkpoint.position).toEqual(observation);
  report.checks.push({name:'observation-disables-walking'});
  await page.getByTestId('flying-replay').click();expect((await state()).flying.time).toBeLessThan(.25);await page.keyboard.press('Escape');await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view','follow');expect((await state()).checkpoint.position).toEqual(observation);expect((await state()).flying.awakened).toBe(true);
  await page.waitForTimeout(400);expect((await state()).view).toBe('follow');report.checks.push({name:'replay-escape-restores-same-position-no-auto-reopen'});
  await page.getByTestId('world-pause').click();await page.getByTestId('world-resume').click();await page.reload();await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);expect((await state()).view).toBe('follow');expect((await state()).flying.awakened).toBe(true);expect((await state()).checkpoint.position).toEqual(observation);report.checks.push({name:'reload-restores-independent-position-and-awakening'});

  // Check a fresh, incomplete observation does not count as completed.
  await load('mural');await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>.3);await page.keyboard.press('Escape');expect((await state()).flying.awakened).toBe(false);expect((await state()).checkpoint.visitedEvents).not.toContain('flying');report.checks.push({name:'early-exit-does-not-complete-event'});
  await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>.5);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.getByTestId('world-resume')).toBeVisible();const blur=await state();await page.waitForTimeout(300);expect((await state()).flying.time).toBe(blur.flying.time);await page.getByTestId('world-resume').click();await page.getByTestId('flying-exit').click();report.checks.push({name:'blur-freezes-observation-until-resumed'});

  for(const [x,z]of route.slice().reverse())await walkTo(x,z);await walkTo(-12,0);await photo('courtyard-return');report.checks.push({name:'real-keyboard-return-to-courtyard'});
  await load('porch');const porch=await state();expect(porch.checkpoint.position).toEqual({x:12,z:-13.2});await photo('porch-camera');await page.getByTestId('world-pause').click();await page.reload();await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);expect((await state()).checkpoint.position).toEqual(porch.checkpoint.position);report.checks.push({name:'porch-checkpoint-uses-region-colliders'});
  await load('mural');await page.keyboard.down('w');await page.waitForTimeout(2000);const contact=await state();await page.waitForTimeout(200);expect((await state()).checkpoint.position).toEqual(contact.checkpoint.position);await page.keyboard.up('w');expect(contact.checkpoint.position.z).toBeGreaterThan(-11);await photo('mural-collision');report.checks.push({name:'mural-wall-blocks-player'});
  await load('approach');await photo('pavilion-overview');await page.getByRole('button',{name:'路线',exact:true}).click();await expect(page.getByRole('heading',{name:'纹彩院 · 乐舞馆'})).toBeVisible();await photo('route-map');await page.getByRole('button',{name:'路线',exact:true}).click();
  // Preserve the real exploration checkpoint through 2D settings/theme navigation.
  const before2D=(await state()).checkpoint.position;await page.getByRole('link',{name:'直接选主题',exact:true}).click();await expect(page.getByTestId('world-host')).toHaveCount(0);await page.getByTestId('world-return').click();await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);expect((await state()).checkpoint.position).toEqual(before2D);report.checks.push({name:'2d-navigation-unmount-and-safe-return'});
  report.performance=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last=performance.now();const tick=now=>{samples.push(now-last);last=now;if(samples.length<150)requestAnimationFrame(tick);else{samples.sort((a,b)=>a-b);const resources=performance.getEntriesByType('resource');resolve({frameMedianMs:samples[75],frameP95Ms:samples[142],resourceBytes:resources.reduce((n,r)=>n+r.encodedBodySize,0),stats:window.__musicPavilion.inspect().stats});}};requestAnimationFrame(tick);}));
  await context.close();

  const mobile=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const mp=await mobile.newPage();mp.on('pageerror',e=>report.errors.push(e.message));
  await mp.goto(`${base}?view=mural`);await mp.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded,undefined,{timeout:45000});await mp.getByTestId('world-interact').tap();await mp.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await expect(mp.getByRole('heading',{name:'让视线跟随飘带'})).toBeVisible();await mp.screenshot({path:`${prefix}-mobile.png`});
  for(const id of ['flying-pause','flying-replay','flying-exit']){const rect=await mp.getByTestId(id).boundingBox();expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(844);expect(rect.y+rect.height).toBeLessThanOrEqual(390);}
  await mp.setViewportSize({width:390,height:844});await expect(mp.getByTestId('world-rotate')).toBeVisible();const rotate=await mp.evaluate(()=>window.__musicPavilion.inspect());await mp.waitForTimeout(200);expect((await mp.evaluate(()=>window.__musicPavilion.inspect())).flying.time).toBe(rotate.flying.time);
  await mp.setViewportSize({width:844,height:390});await mp.getByTestId('world-resume').tap();await mp.getByTestId('flying-exit').tap();const stick=await mp.getByRole('group',{name:'拖动摇杆行走'}).boundingBox();const cdp=await mobile.newCDPSession(mp);const p0=await mp.evaluate(()=>window.__musicPavilion.inspect().checkpoint.position);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+stick.width*.5,y:stick.y+stick.height*.8}]});await mp.waitForTimeout(350);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const p1=await mp.evaluate(()=>window.__musicPavilion.inspect().checkpoint.position);expect(p1.z).toBeGreaterThan(p0.z);await mp.waitForTimeout(200);expect((await mp.evaluate(()=>window.__musicPavilion.inspect().checkpoint.position))).toEqual(p1);
  report.checks.push({name:'mobile-touch-controls-orientation-and-stop',state:await mp.evaluate(()=>window.__musicPavilion.inspect())});await mobile.close();

  const reduce=await browser.newContext({viewport:{width:1279,height:925},reducedMotion:'reduce'});const rp=await reduce.newPage();await rp.goto(`${base}?view=mural`);await rp.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);await rp.keyboard.press('f');await rp.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);expect((await rp.evaluate(()=>window.__musicPavilion.inspect())).flying.color).toBe(1);await rp.screenshot({path:`${prefix}-reduced.png`});report.checks.push({name:'reduced-motion-immediate-color'});await reduce.close();

  for(const name of ['music-pavilion.glb','mural-original.png']){
    const failure=await browser.newContext();const fp=await failure.newPage();const pattern=`**/music-pavilion/v001/${name}`;await failure.route(pattern,route=>route.abort());await fp.goto(base);await expect(fp.getByTestId('world-error')).toBeVisible({timeout:45000});await failure.unroute(pattern);await fp.getByTestId('world-retry').click();await fp.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded,undefined,{timeout:45000});report.checks.push({name:`missing-${name}-retries`});await failure.close();
  }
  const baseline=await browser.newContext({viewport:{width:1279,height:925}});const bp=await baseline.newPage();const requested=[];bp.on('request',r=>requested.push(r.url()));bp.on('pageerror',e=>report.errors.push(e.message));
  await bp.addInitScript(()=>sessionStorage.setItem('dunhuang:world-session:v1',JSON.stringify({version:1,position:{x:-12,z:-17},heading:0,cameraYaw:0,visitedEvents:[]})));
  await bp.goto(`${base}baseline.html`);await expect(bp.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});await bp.keyboard.press('f');await expect(bp.getByTestId('world-observation')).toBeVisible();await bp.getByRole('button',{name:'继续漫游',exact:true}).click();
  expect(requested.some(url=>url.includes('/music-pavilion/v001/'))).toBe(false);expect(requested.some(url=>url.includes('/shared/v001/traveler.glb'))).toBe(true);report.checks.push({name:'default-entry-keeps-former-assets-and-caisson'});await baseline.close();
  const protectedFiles=JSON.parse(await readFile('art-source/world/music-pavilion/v001/protected-assets.json','utf8'));
  for(const [path,sha]of Object.entries(protectedFiles))expect(hash(await readFile(path)),path).toBe(sha);
  const model=JSON.parse(await readFile('art-source/world/models/music-pavilion/v001/export-manifest.json','utf8'));
  expect(model.layoutSha256).toBe(hash(await readFile('src/content/world/music-pavilion-layout.json')));
  expect(hash(Buffer.from(await (await fetch(`${base}assets/world/music-pavilion/v001/music-pavilion.glb`)).arrayBuffer()))).toBe(model.sha256);
  report.protectedFiles=Object.keys(protectedFiles).length;expect(report.errors).toEqual([]);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack};throw error;}
finally{await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2)+'\n');await browser?.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,failure:report.failure?.message}));}
