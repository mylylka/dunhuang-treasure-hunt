import {chromium,webkit,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const layout=JSON.parse(await readFile('src/content/world/music-pavilion-layout-v004.json','utf8'));
const prefix='work/world/music-pavilion-v004',report={passed:false,checks:[],errors:[],screens:[]};
const browser=await chromium.launch({channel:'chrome'});let page;
const state=()=>page.evaluate(()=>window.__musicPavilion.inspect());
async function load(view){
 if(page)await page.close();page=await browser.newPage({viewport:{width:1279,height:925}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(`http://localhost:4198/?view=${view}`);await page.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);await page.waitForTimeout(400);
}
async function photo(name){const path=`${prefix}-${name}.png`;await page.screenshot({path});report.screens.push({name,path,state:await state()});}
try{
 for(const view of ['approach','side-west','side-east','outside-back','steps']){await load(view);await photo(view);}
 // Exact camera position / target comparison on the shared road, outside both courts.
 await load('approach');const after=await state();await photo('comparison-after');
 const old=await browser.newPage({viewport:{width:1279,height:925}});
 await old.addInitScript(p=>{sessionStorage.setItem('dunhuang:music-pavilion-preview:v3',JSON.stringify({version:1,position:p,heading:0,cameraYaw:0,visitedEvents:[]}));sessionStorage.setItem('dunhuang:character-cinematics:v1',JSON.stringify({opening:true,hall:true}));},after.checkpoint.position);
 await old.goto('http://localhost:4196/');await old.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);await old.waitForTimeout(400);
 const before=await old.evaluate(()=>window.__musicPavilion.inspect());expect(before.camera).toEqual(after.camera);await old.screenshot({path:`${prefix}-comparison-before.png`});await old.close();report.checks.push('identical measured camera position and target before/after on approach road');
 await page.keyboard.down('w');await page.waitForTimeout(4800);await page.keyboard.up('w');expect((await state()).checkpoint.position.z).toBeLessThan(1);await photo('through-gate');report.checks.push('actual keyboard entry through sole courtyard gate');
 await load('steps');const start=await state(),head=s=>s.traveler.joints.find(j=>/Head$/.test(j.name)).position[1];
 await page.keyboard.down('w');await page.waitForTimeout(4400);await page.keyboard.up('w');await page.waitForTimeout(350);const top=await state();expect(top.checkpoint.position.z).toBeLessThan(-18);expect(head(top)-head(start)).toBeGreaterThan(1.6);expect(head(top)-head(start)).toBeLessThan(2.05);await photo('on-platform');
 await page.keyboard.down('s');await page.waitForTimeout(4400);await page.keyboard.up('s');await page.waitForTimeout(250);expect(head(await state())).toBeLessThan(head(top)-1.5);report.checks.push('real avatar climbs and descends 1.8 m platform with keyboard input');
 for(const [view,key,sign,bound] of [['outside-east','x',1,70.25],['outside-west','x',-1,23.75],['outside-back','z',-1,-28.9]]){
  await load(view);await page.keyboard.down('w');await page.waitForTimeout(3300);await page.keyboard.up('w');expect((await state()).checkpoint.position[key]*sign).toBeGreaterThan(bound*sign);
 }
 report.checks.push('cannot walk through left/right/rear perimeter');
 await load('mural');await photo('mural-gray');await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice?.playing);await photo('mural-speaking');
 await page.getByTestId('flying-pause').click();const t=(await state()).flying.time;expect((await state()).flyingVoice.playing).toBe(false);await page.waitForTimeout(200);expect((await state()).flying.time).toBe(t);
 await page.getByTestId('flying-pause').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await photo('mural-full-color');await page.keyboard.press('Escape');expect((await state()).flying.color).toBe(0);expect((await state()).flyingVoice.playing).toBe(false);
 await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice?.playing);await page.getByTestId('flying-replay').click();expect((await state()).flying.time).toBeLessThan(.5);await page.keyboard.press('Escape');report.checks.push('full mural observation, real voice, pause/resume/replay and gray restoration');
 await page.getByRole('link',{name:'直接选主题',exact:true}).click();expect(await page.evaluate(()=>!!window.__musicPavilion)).toBe(false);report.checks.push('world and audio released on leaving to themes');
 await page.close();page=null;
 const mobile=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),mp=await mobile.newPage();await mp.goto('http://localhost:4198/?view=mural');await mp.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);await mp.getByTestId('world-interact').tap();await mp.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await mp.screenshot({path:`${prefix}-mobile-mural.png`});for(const id of ['flying-pause','flying-replay','flying-exit']){const r=await mp.getByTestId(id).boundingBox();expect(r.y+r.height).toBeLessThanOrEqual(390);expect(r.x+r.width).toBeLessThanOrEqual(844);}await mp.getByTestId('flying-exit').tap();expect(await mp.evaluate(()=>window.__musicPavilion.inspect().flying.color)).toBe(0);await mobile.close();report.checks.push('mobile landscape full mural and controls');
 const bp=await browser.newPage(),requests=[];bp.on('request',r=>requests.push(r.url()));await bp.goto('http://localhost:4198/baseline.html');await expect(bp.getByTestId('world-host')).toHaveAttribute('data-ready','true');expect(requests.some(s=>s.includes('/music-pavilion/'))).toBe(false);await bp.close();report.checks.push('default world loads no pavilion assets');
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{await browser.close();await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,errors:report.errors,failure:report.failure}));}
if(report.passed){
 const safari=await webkit.launch(),p=await safari.newPage({viewport:{width:1279,height:925}});const result={passed:false,errors:[]};p.on('pageerror',e=>result.errors.push(e.message));
 try{await p.goto('http://localhost:4198/?view=mural');await p.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);await p.getByTestId('world-interact').click();await p.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice?.playing);await p.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await p.screenshot({path:`${prefix}-webkit-mural.png`});await p.getByTestId('flying-exit').click();expect(await p.evaluate(()=>window.__musicPavilion.inspect().flying.color)).toBe(0);expect(result.errors).toEqual([]);result.passed=true;}catch(e){result.failure=e.stack;process.exitCode=1;}finally{await safari.close();await writeFile(`${prefix}-webkit.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({webkit:result}));}
}
