import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base='http://localhost:4193/', prefix='work/world/character-cinematics-v001';
const report={passed:false,errors:[],checks:[],screens:[],videos:[]};
const hash=b=>createHash('sha256').update(b).digest('hex');
const protectedFiles=JSON.parse(await readFile('art-source/world/models/traveler-tripo/v002/export-manifest.json','utf8')).protectedAssets;
let browser;
try {
  browser=await chromium.launch({channel:'chrome',args:['--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1279,height:925},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
  page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
  const snap=()=>page.evaluate(()=>window.__characterCinematics.inspect());
  async function load(shot){await page.goto(`${base}${shot?`?shot=${shot}`:''}`);await page.waitForFunction(()=>window.__characterCinematics?.inspect()?.loaded,undefined,{timeout:45000});}
  async function at(id,time){await page.waitForFunction(({id,time})=>{const s=window.__characterCinematics.inspect();return s.cinematic?.id===id&&s.cinematic.time>=time},{id,time},{timeout:6000});}
  const done=()=>page.waitForFunction(()=>!window.__characterCinematics.inspect().cinematic,undefined,{timeout:6000});
  async function photo(name){const path=`${prefix}-${name}.png`;await page.screenshot({path});report.screens.push({name,path,state:await snap()});}
  async function startVideo(){await page.evaluate(()=>{const stream=document.querySelector('canvas[data-world-canvas]').captureStream(30);window.__recorded=[];window.__recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});window.__recorder.ondataavailable=e=>{if(e.data.size)window.__recorded.push(e.data)};window.__recorder.start();});}
  async function endVideo(name){const bytes=await page.evaluate(()=>new Promise(resolve=>{window.__recorder.onstop=async()=>{const blob=new Blob(window.__recorded,{type:'video/webm'});resolve(Array.from(new Uint8Array(await blob.arrayBuffer())));window.__recorder.stream.getTracks().forEach(t=>t.stop());};window.__recorder.stop();}));const path=`${prefix}-${name}.webm`;await writeFile(path,Buffer.from(bytes));report.videos.push({name,path,bytes:bytes.length});}
  await load('opening');await startVideo();await at('opening',.52);await photo('opening-greeting');
  const waveA=await snap();await at('opening',.84);const waveB=await snap();
  expect(waveA.traveler.animation).toBe('Greeting');expect(waveA.traveler.joints).not.toEqual(waveB.traveler.joints);
  await at('opening',1.4);await photo('opening-turn');await done();await photo('opening-follow');await endVideo('opening');
  const openingEnd=await snap();expect(openingEnd.checkpoint.position.z).toBeCloseTo(17.7,3);expect(openingEnd.view).toBe('follow');
  report.checks.push({name:'opening-completes-with-bounded-step',state:openingEnd});
  await page.reload();await page.waitForFunction(()=>window.__characterCinematics?.inspect()?.loaded);expect((await snap()).cinematic).toBeNull();
  report.checks.push({name:'reload-does-not-replay'});

  for(const [key,time] of [['w',.2],['d',1.3],['q',.3],['Escape',.4]]){
    await load('opening');await at('opening',time);const before=await snap();await page.keyboard.down(key);await page.waitForTimeout(160);const after=await snap();await page.keyboard.up(key);
    expect(after.cinematic).toBeNull();expect(after.view).toBe('follow');
    if(key==='w')expect(after.checkpoint.position.z).toBeLessThan(before.checkpoint.position.z-.1);
    if(key==='d')expect(after.checkpoint.position.x).toBeGreaterThan(before.checkpoint.position.x+.1);
    if(key==='q')expect(after.checkpoint.cameraYaw).not.toBe(before.checkpoint.cameraYaw);
    if(key==='Escape')expect(after.paused).toBe(false);
    report.checks.push({name:`interrupt-${key}`,before,after});
  }
  await load('opening');await at('opening',.3);await page.getByTestId('world-cinematic-skip').click();expect((await snap()).cinematic).toBeNull();
  report.checks.push({name:'skip-button'});
  await load('opening');await at('opening',.2);await page.getByTestId('world-pause').click();const paused=await snap();expect(paused.cinematic).toBeNull();expect(paused.paused).toBe(true);
  await page.getByTestId('world-resume').click();await page.waitForTimeout(250);const resumed=await snap();expect(resumed.checkpoint.position).toEqual(paused.checkpoint.position);expect(resumed.cinematic).toBeNull();
  report.checks.push({name:'pause-resume-clears-presentation-and-input'});

  await load('hall');await at('hall',.1);await startVideo();await at('hall',.6);await photo('hall-browsing');const lookA=await snap();
  await at('hall',1.8);await photo('hall-looking-up');const lookB=await snap();expect(lookB.traveler.animation).toBe('HallLookUp');expect(lookA.traveler.joints).not.toEqual(lookB.traveler.joints);
  await done();await photo('hall-follow');await endVideo('hall');const hallEnd=await snap();expect(hallEnd.view).toBe('follow');expect(hallEnd.checkpoint.visitedEvents).toEqual([]);expect(hallEnd.checkpoint.position).toEqual({x:-12,z:-17});
  await expect(page.getByTestId('world-interact')).toBeVisible();report.checks.push({name:'hall-completes-without-entering-observation',state:hallEnd});
  await page.waitForTimeout(500);expect((await snap()).cinematic).toBeNull();
  await load('hall');await at('hall',.7);await page.keyboard.press('f');await expect(page.getByTestId('world-observation')).toBeVisible();expect((await snap()).view).toBe('caisson');expect((await snap()).cinematic).toBeNull();
  await page.getByRole('button',{name:'继续漫游',exact:true}).click();await page.waitForTimeout(600);expect((await snap()).cinematic).toBeNull();report.checks.push({name:'F-directly-enters-observation-once'});

  await load('approach');await page.keyboard.down('w');await page.waitForFunction(()=>window.__characterCinematics.inspect().checkpoint.position.z < -15.6,undefined,{timeout:10000});const entering=await snap();expect(entering.cinematic).toBeNull();expect(entering.nearby).toBe('caisson');await page.keyboard.up('w');
  await at('hall',.1);await photo('hall-trigger-after-walking');await page.keyboard.down('s');await page.waitForTimeout(200);expect((await snap()).cinematic).toBeNull();await page.keyboard.up('s');report.checks.push({name:'enter-walking-stop-triggers-move-interrupts'});

  await load('opening');await at('opening',.2);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.getByTestId('world-resume')).toBeVisible();expect((await snap()).cinematic).toBeNull();await page.getByTestId('world-resume').click();expect((await snap()).cinematic).toBeNull();report.checks.push({name:'blur-cancels-no-replay'});
  await load('opening');await at('opening',.3);await page.mouse.move(640,460);await page.mouse.down({button:'right'});await page.mouse.move(700,460);await page.mouse.up({button:'right'});expect((await snap()).cinematic).toBeNull();report.checks.push({name:'mouse-look-interrupts'});
  await load('hall');await at('hall',.4);await page.getByRole('link',{name:'直接选主题',exact:true}).click();await page.waitForTimeout(200);await page.goto(base);await page.waitForFunction(()=>window.__characterCinematics?.inspect()?.loaded);await page.waitForTimeout(450);expect((await snap()).cinematic).toBeNull();report.checks.push({name:'leaving-and-returning-does-not-replay'});
  await load('opening');await page.keyboard.down('w');await page.waitForFunction(()=>window.__characterCinematics.inspect().checkpoint.position.z<=13.1,undefined,{timeout:12000});await page.keyboard.up('w');
  await page.keyboard.down('d');await page.waitForFunction(()=>window.__characterCinematics.inspect().checkpoint.position.x>2.6,undefined,{timeout:6000});await page.waitForTimeout(600);const treeContact=await snap();await page.waitForTimeout(200);expect((await snap()).checkpoint.position).toEqual(treeContact.checkpoint.position);await page.keyboard.up('d');
  expect(Math.hypot(treeContact.checkpoint.position.x-4.8,treeContact.checkpoint.position.z-13)).toBeGreaterThanOrEqual(1.9);report.checks.push({name:'approved-sample-tree-uses-its-actual-clearance',state:treeContact});
  await context.close();

  const reduced=await browser.newContext({viewport:{width:1279,height:925},reducedMotion:'reduce'});const rp=await reduced.newPage();await rp.goto(base);await rp.waitForFunction(()=>window.__characterCinematics?.inspect()?.loaded);expect(await rp.evaluate(()=>window.__characterCinematics.inspect().cinematic)).toBeNull();report.checks.push({name:'system-reduced-motion-skips'});await reduced.close();

  const mobile=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const mp=await mobile.newPage();await mp.goto(`${base}?shot=hall`);await mp.waitForFunction(()=>window.__characterCinematics?.inspect()?.cinematic?.id==='hall',undefined,{timeout:45000});
  await mp.waitForFunction(()=>window.__characterCinematics.inspect().cinematic?.time>=1.4);await mp.screenshot({path:`${prefix}-mobile-hall.png`});
  const stick=await mp.getByRole('group',{name:'拖动摇杆行走'}).boundingBox();const cdp=await mobile.newCDPSession(mp);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+stick.width/2,y:stick.y+stick.height*.2}]});await mp.waitForTimeout(220);
  const touched=await mp.evaluate(()=>window.__characterCinematics.inspect());expect(touched.cinematic).toBeNull();expect(touched.checkpoint.position.z).toBeLessThan(-17);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mp.waitForTimeout(200);const stopped=await mp.evaluate(()=>window.__characterCinematics.inspect());await mp.waitForTimeout(250);expect((await mp.evaluate(()=>window.__characterCinematics.inspect())).checkpoint.position).toEqual(stopped.checkpoint.position);
  await mp.screenshot({path:`${prefix}-mobile.png`});report.checks.push({name:'mobile-touch-interrupts-and-release-stops',state:stopped});await mp.goto(`${base}?shot=opening`);await mp.waitForFunction(()=>window.__characterCinematics?.inspect()?.cinematic?.id==='opening');
  await mp.setViewportSize({width:390,height:844});await expect(mp.getByTestId('world-rotate')).toBeVisible();expect((await mp.evaluate(()=>window.__characterCinematics.inspect())).cinematic).toBeNull();
  await mp.setViewportSize({width:844,height:390});await expect(mp.getByTestId('world-resume')).toBeVisible();await mp.getByTestId('world-resume').click();expect((await mp.evaluate(()=>window.__characterCinematics.inspect())).cinematic).toBeNull();report.checks.push({name:'orientation-change-cancels-without-resuming-auto-step'});await mobile.close();

  const failure=await browser.newContext();const fp=await failure.newPage();const pattern='**/traveler-tripo/v002/traveler.glb';await failure.route(pattern,r=>r.abort());await fp.goto(base);await expect(fp.getByTestId('world-error')).toBeVisible({timeout:45000});await failure.unroute(pattern);await fp.getByTestId('world-retry').click();await fp.waitForFunction(()=>window.__characterCinematics?.inspect()?.loaded,undefined,{timeout:45000});report.checks.push({name:'missing-gesture-asset-retry-recovers'});await failure.close();
  const baseline=await browser.newContext({viewport:{width:1279,height:925}});const bp=await baseline.newPage();const baselineErrors=[],baselineRequests=[];
  bp.on('pageerror',e=>baselineErrors.push(e.message));bp.on('request',r=>{if(r.url().endsWith('.glb'))baselineRequests.push(r.url())});
  await bp.addInitScript(()=>sessionStorage.setItem('dunhuang:world-session:v1',JSON.stringify({version:1,position:{x:-12,z:-17},heading:0,cameraYaw:0,visitedEvents:[]})));
  await bp.goto(`${base}baseline.html`);await expect(bp.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});
  await expect(bp.getByTestId('world-cinematic-skip')).toHaveCount(0);
  expect(baselineRequests.some(url=>url.endsWith('/shared/v001/traveler.glb'))).toBe(true);
  expect(baselineRequests.some(url=>url.includes('traveler-tripo'))).toBe(false);
  await bp.keyboard.down('w');await expect(bp.locator('canvas[data-world-canvas]')).toHaveAttribute('data-animation','Walk');await bp.keyboard.up('w');
  await bp.keyboard.press('f');await expect(bp.getByTestId('world-observation')).toBeVisible();await bp.getByRole('button',{name:'继续漫游',exact:true}).click();
  await expect(bp.getByTestId('world-screen')).toHaveAttribute('data-view','follow');expect(baselineErrors).toEqual([]);
  report.checks.push({name:'default-game-keeps-original-actor-and-existing-observation',requests:baselineRequests});await baseline.close();
  for(const [path,sha] of Object.entries(protectedFiles))expect(hash(await readFile(path)),path).toBe(sha);
  report.protectedFiles=Object.keys(protectedFiles).length;expect(report.errors).toEqual([]);report.passed=true;
}catch(error){report.failure={message:error.message,stack:error.stack};throw error;}
finally{await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2)+'\n');await browser?.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors,failure:report.failure?.message}));}
