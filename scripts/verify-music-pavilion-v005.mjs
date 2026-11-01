import {chromium,expect,webkit} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const prefix='work/world/music-pavilion-v005';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1279,height:925}});
const report={passed:false,checks:[],errors:[],states:{}};page.on('pageerror',e=>report.errors.push(e.message));
const state=()=>page.evaluate(()=>window.__musicPavilion.inspect());
async function open(view){await page.goto(`http://localhost:4199/?view=${view}`);await page.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);}
async function photo(name){await page.screenshot({path:`${prefix}-${name}.png`});report.states[name]=await state();}
try{
 await open('music-road');await page.locator('canvas').click({position:{x:500,y:400}});expect((await state()).musicAudio.gain).toBe(0);
 await photo('road-before');await page.keyboard.down('w');await page.waitForFunction(()=>window.__musicPavilion.inspect().encounter?.id==='music');await page.keyboard.up('w');
 const stop=(await state()).checkpoint.position;await page.waitForFunction(()=>window.__musicPavilion.inspect().encounterVoice?.playing);
 await photo('road-question');expect((await state()).musicAudio.gain).toBeGreaterThan(0);
 await page.waitForTimeout(500);const stopped=await state();expect(stopped.checkpoint.position).toEqual(stop);expect(stopped.traveler.animation).toBe('LookAround');
 await page.waitForFunction(()=>!window.__musicPavilion.inspect().encounter);expect((await state()).checkpoint.position).toEqual(stop);report.checks.push('music silent before gate; real voice and LookAround; fixed position 2.8s');
 await open('mural');await page.locator('canvas').click({position:{x:500,y:400}});await page.waitForFunction(()=>window.__musicPavilion.inspect().encounter?.id==='mural');
 await expect(page.getByTestId('world-interact')).toHaveCount(0);await page.waitForFunction(()=>window.__musicPavilion.inspect().encounterVoice?.playing);await photo('admiration');
 await page.keyboard.press('Space');await expect(page.getByTestId('world-interact')).toBeVisible();expect((await state()).encounter).toBeNull();report.checks.push('admiration precedes awaken button; Space ends it immediately');
 await photo('flat-court');await page.getByTestId('world-interact').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>1.3);
 const transition=await state();expect(transition.flying.color).toBeLessThan(1);expect(transition.flyingVoice.playing).toBe(false);expect(transition.flyingVoice.currentTime).toBe(0);expect(transition.flying.mist.visible).toBe(true);await expect(page.getByTestId('flying-subtitle')).toHaveCount(0);await photo('awakening-mist');
 await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing);expect((await state()).flying.complete).toBe(true);expect((await state()).flying.mist.visible).toBe(false);await photo('goddess-speaking');
 // Focused replay must not activate when Space skips voice, even during a long press.
 await page.getByTestId('flying-replay').focus();await page.keyboard.down('Space');await page.keyboard.down('Space');await page.waitForTimeout(200);await page.keyboard.up('Space');
 const skipped=await state();expect(skipped.flyingVoice.ended).toBe(true);expect(skipped.flyingVoice.playing).toBe(false);expect(skipped.flying.time).toBeGreaterThan(3.6);report.checks.push('silent mist until complete; real goddess audio afterwards; held Space does not replay focused button');
 await page.getByTestId('flying-replay').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time>1);await page.getByTestId('flying-pause').click();const t=(await state()).flying.time;await page.waitForTimeout(400);expect((await state()).flying.time).toBe(t);await page.getByTestId('flying-pause').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing);
 await page.keyboard.press('Escape');expect((await state()).flying.color).toBe(0);expect((await state()).flyingVoice.playing).toBe(false);await expect(page.getByTestId('world-interact')).toBeVisible();expect((await state()).encounter).toBeNull();report.checks.push('pause/resume, replay, exit gray; same visit does not repeat admiration');
 // Walk out through the real gate, then return: no teleport or debug mutation.
 async function walkTo(x,z){
   let started=Date.now();await page.keyboard.down('Shift');
   while(Date.now()-started<24000){
     let s=await state(),p=s.checkpoint.position;if(s.encounter)break;if(Math.hypot(x-p.x,z-p.z)<.28)break;
     const yaw=Math.atan2(-(x-p.x),-(z-p.z)),delta=Math.atan2(Math.sin(yaw-s.checkpoint.cameraYaw),Math.cos(yaw-s.checkpoint.cameraYaw));
     await page.keyboard.up('w');await page.mouse.move(640,450);await page.mouse.down({button:'right'});await page.mouse.move(640-delta/.004,450,{steps:2});await page.mouse.up({button:'right'});await page.keyboard.down('w');await page.waitForTimeout(100);
   }await page.keyboard.up('w');await page.keyboard.up('Shift');if(!(await state()).encounter)expect(Math.hypot(x-(await state()).checkpoint.position.x,z-(await state()).checkpoint.position.z)).toBeLessThan(.6);
 }
 await walkTo(52.35,-5);await walkTo(40.2,-5);await walkTo(40.2,4.2);await walkTo(40.2,-5);await walkTo(50,-8.9);
 await page.waitForFunction(()=>window.__musicPavilion.inspect().encounter?.id==='mural',{},{timeout:15000});await photo('reentered-admiration');await page.keyboard.press('Space');report.checks.push('real gate exit and re-entry repeat admiration');
 await page.getByRole('link',{name:'直接选主题',exact:true}).click();expect(await page.evaluate(()=>!!window.__musicPavilion)).toBe(false);report.checks.push('unmount releases runtime and voice');
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:`${prefix}-failure.png`});}
finally{await browser.close();await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,errors:report.errors,failure:report.failure}));}
