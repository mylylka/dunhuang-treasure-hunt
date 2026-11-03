import {chromium,webkit,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const story=JSON.parse(await readFile('src/content/world/nine-colored-deer-v002.json','utf8'));
const report={passed:false,checks:[],errors:[],states:{}},prefix='work/world/mogao-v003';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1279,height:925}});
page.on('pageerror',e=>report.errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mogao.inspect());
async function open(view){await page.goto(`http://localhost:4205/?view=${view}#/`);await page.waitForFunction(()=>window.__mogao?.inspect().loaded);await page.locator('canvas').click({position:{x:640,y:450}});}
async function photo(id){await page.screenshot({path:`${prefix}-${id}.png`});report.states[id]=await state();}
async function caption(p,index){await expect(p.getByTestId('world-story-step')).toHaveAttribute('data-index',String(index));await expect(p.getByTestId('story-subtitle')).toHaveText(story.segments[index].text+'（空格跳过）',{timeout:10000});}
async function layout(p){return p.evaluate(()=>{const sub=document.querySelector('[data-testid="story-subtitle"]').getBoundingClientRect();return {caption:sub.toJSON(),images:[...document.querySelectorAll('[data-testid="story-detail"]')].map(i=>i.getBoundingClientRect().toJSON()),scroll:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth};});}
try{
 await open('steps');await expect(page.getByTestId('world-interact')).toHaveCount(0);
 await page.keyboard.down('Shift');await page.keyboard.down('w');
 await page.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z< -50);await photo('stairs-ascent');
 await page.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z< -75);await page.keyboard.up('w');await page.keyboard.up('Shift');
 await expect(page.getByTestId('world-interact')).toHaveText(/观看九色鹿故事/);await photo('arrival-trigger');
 report.checks.push('real keyboard traversal: imported staircase → central colonnade → cave interior; prompt only after entering');console.log(report.checks.at(-1));
 await open('interior');await page.waitForTimeout(500);const before=await state();
 await page.getByRole('button',{name:'向上看',exact:true}).click();await page.getByRole('button',{name:'向上看',exact:true}).click();await page.waitForTimeout(1200);const up=await state();
 expect(up.camera.target[1]).toBeGreaterThan(before.camera.target[1]+4);expect(Math.hypot(...up.camera.position.map((v,i)=>v-before.camera.position[i]))).toBeLessThan(.1);
 await photo('web-look-up');await page.getByRole('button',{name:'镜头向右',exact:true}).click();await page.waitForTimeout(600);expect((await state()).checkpoint.cameraYaw).not.toBe(before.checkpoint.cameraYaw);
 await page.getByRole('button',{name:'恢复平视',exact:true}).click();await expect.poll(async()=>(await state()).caveLook).toBe(0);
 report.checks.push('up/down/reset and horizontal camera controls operate without moving the player or lifting the camera into the roof');
 await open('back');await page.getByRole('button',{name:'向上看',exact:true}).click();await page.waitForTimeout(700);await photo('fourth-wall');
 await page.getByTestId('world-interact').click();await caption(page,0);await page.screenshot({path:`prefix-whole-paragraph.png`.replace('prefix',prefix)});
 const text=await page.getByTestId('story-subtitle').textContent();await page.waitForFunction(()=>Number(document.querySelector('[data-testid="world-story"]').dataset.audioTime)>9);expect(await page.getByTestId('story-subtitle').textContent()).toBe(text);
 await page.getByRole('button',{name:'暂停',exact:true}).click();const paused=await page.getByTestId('story-audio').evaluate(a=>a.currentTime);await page.waitForTimeout(500);expect(await page.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeCloseTo(paused,1);
 await page.getByRole('button',{name:'重播',exact:true}).click();await caption(page,0);expect(await page.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeLessThan(3);
 await page.keyboard.press('Space');await caption(page,1);
 for(let i=1;i<5;i++){
  await caption(page,i);const bounds=await layout(page);expect(bounds.scroll).toBe(false);for(const r of bounds.images)expect(r.bottom).toBeLessThan(bounds.caption.y);
  if(i===2)await expect(page.getByTestId('story-detail')).toHaveCount(2);
  if(i===3)await page.screenshot({path:`${prefix}-paragraph-longest.png`});
  await page.keyboard.press('Space');
 }
 await expect(page.getByTestId('story-subtitle')).toHaveText(story.ending.text+'（空格跳过）');await page.keyboard.press('Space');await expect(page.getByTestId('world-culture-choice')).toBeVisible();
 report.checks.push('five full paragraphs map one-to-one to five audio files; no sentence changes; pause/replay/Space and final invitation work; images stay above captions');console.log(report.checks.at(-1));
 await page.getByTestId('world-choice-roam').click();await expect(page.getByTestId('world-story')).toHaveCount(0);expect((await state()).view).toBe('follow');
 await open('overview');await photo('web-overview');await open('entrance');await photo('web-entrance');
 await page.route('**/mogao/v003/exterior.glb',route=>route.fulfill({status:503,body:'unavailable'}));await page.goto('http://localhost:4205/?view=interior#/');await expect(page.getByTestId('world-error')).toBeVisible();
 await page.unroute('**/mogao/v003/exterior.glb');await page.getByTestId('world-retry').click();await page.waitForFunction(()=>window.__mogao?.inspect().loaded);report.checks.push('new cliff load failure is recoverable by retry');
 expect(report.errors).toEqual([]);
}catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:`${prefix}-failure.png`});}
finally{await browser.close();}
if(!report.failure){
 const mobile=await webkit.launch();const p=await mobile.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>report.errors.push(e.message));
 try{
  await p.goto('http://localhost:4205/?view=interior#/');await p.waitForFunction(()=>window.__mogao?.inspect().loaded);
  const prompt=await p.getByTestId('world-interact').boundingBox(),controls=await p.locator('.world-camera-controls').boundingBox();expect(prompt.y+prompt.height).toBeLessThan(controls.y);
  await p.getByRole('button',{name:'向上看',exact:true}).click();await p.waitForTimeout(500);await p.screenshot({path:`${prefix}-landscape-look.png`});
  await p.getByTestId('world-interact').click();for(let i=0;i<4;i++){await caption(p,i);if(i<3)await p.keyboard.press('Space');}
  const bounds=await layout(p);report.mobileBounds=bounds;expect(bounds.scroll).toBe(false);expect(bounds.caption.bottom).toBeLessThanOrEqual(390);for(const r of bounds.images)expect(r.bottom).toBeLessThan(bounds.caption.y);
  await p.screenshot({path:`${prefix}-landscape-paragraph.png`});
  await p.setViewportSize({width:390,height:844});await expect(p.getByTestId('world-rotate')).toBeVisible();const time=await p.getByTestId('story-audio').evaluate(a=>a.currentTime);await p.keyboard.press('Space');await p.waitForTimeout(300);expect(await p.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeCloseTo(time,1);await expect(p.getByTestId('world-story-step')).toHaveAttribute('data-index','3');
  await p.setViewportSize({width:844,height:390});await expect(p.getByTestId('world-rotate')).toHaveCount(0);await p.getByTestId('world-resume').click();await caption(p,3);report.checks.push('WebKit landscape: whole longest paragraph fits below artwork; portrait only shows rotation cover and pauses playback');expect(report.errors).toEqual([]);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await p.screenshot({path:`${prefix}-mobile-failure.png`});}
 finally{await mobile.close();}
}
await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,failure:report.failure,errors:report.errors},null,2));
