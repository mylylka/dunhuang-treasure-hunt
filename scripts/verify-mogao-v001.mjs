import {chromium,webkit,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const report={passed:false,checks:[],errors:[],states:{}},prefix='work/world/mogao-v001';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1279,height:925}});
page.on('pageerror',e=>report.errors.push(e.message));
const state=()=>page.evaluate(()=>window.__mogao.inspect());
async function open(view){await page.goto(`http://localhost:4202/?view=${view}#/`);await page.waitForFunction(()=>window.__mogao?.inspect().loaded);await page.locator('canvas').click({position:{x:640,y:450}});}
async function photo(id){await page.screenshot({path:`${prefix}-${id}.png`});report.states[id]=await state();}
try{
 await open('steps');await expect(page.getByTestId('world-interact')).toHaveCount(0);
 await page.keyboard.down('Shift');await page.keyboard.down('w');
 await page.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z< -81.4);
 await page.keyboard.up('w');await page.keyboard.up('Shift');
 await expect(page.getByTestId('world-interact')).toHaveText(/观看九色鹿故事/);await photo('arrival-trigger');
 // The former column is traversable; there must be no stale invisible collision.
 await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z< -96);await page.keyboard.up('w');await page.keyboard.up('Shift');
 expect((await state()).checkpoint.position.x).toBeCloseTo(122,1);report.checks.push('continuous stairs → doorway → chamber; early story prompt; former pillar location is unobstructed');
 await page.getByTestId('world-interact').click();await expect(page.getByTestId('world-story')).toBeVisible();
 const before=(await state()).checkpoint.position;await page.keyboard.press('w');expect((await state()).checkpoint.position).toEqual(before);
 await page.getByTestId('world-story-start').click();await page.keyboard.press('Space');await expect(page.getByTestId('world-story-step')).toHaveAttribute('data-index','1');await page.keyboard.press('Space');
 await expect(page.getByTestId('world-culture-choice')).toBeVisible();await expect(page.getByTestId('world-culture-choice').getByRole('button')).toHaveCount(2);await photo('story-choice');
 await page.getByTestId('world-choice-roam').click();expect((await state()).checkpoint.position).toEqual(before);expect((await state()).view).toBe('follow');
 await page.reload();await page.waitForFunction(()=>window.__mogao?.inspect().loaded);expect((await state()).checkpoint.position).toEqual(before);report.checks.push('story freeze, Space skip, shared two-choice dialog and reload retain cave position');
 for(const view of ['overview','distant','approach','entrance','interior','side','back']){await open(view);await page.waitForTimeout(400);await photo(`web-${view}`);}
 await open('interior');report.frameIntervals=await page.evaluate(()=>new Promise(resolve=>{const a=[];let previous=0;function frame(t){if(previous)a.push(t-previous);previous=t;if(a.length<90)requestAnimationFrame(frame);else resolve({median:a.sort((x,y)=>x-y)[45],p95:a[85]});}requestAnimationFrame(frame);}));
 await page.getByRole('link',{name:'直接选主题',exact:true}).first().click();await expect(page.locator('[data-world-canvas]')).toHaveCount(0);expect(await page.evaluate(()=>!!window.__mogao)).toBe(false);report.checks.push('leaving the scene releases the canvas and inspection hook');
 await page.route('**/mogao/v001/interior.glb',route=>route.fulfill({status:503,body:'unavailable'}));await page.goto('http://localhost:4202/?view=interior#/');await expect(page.getByTestId('world-error')).toBeVisible();
 await page.unroute('**/mogao/v001/interior.glb');await page.getByTestId('world-retry').click();await page.waitForFunction(()=>window.__mogao?.inspect().loaded);report.checks.push('failed cave GLB presents recoverable error; retry loads the same scene');
 expect(report.errors).toEqual([]);
}catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:`prefix-failure.png`.replace('prefix',prefix)});}
finally{await browser.close();}
// Serial WebKit/mobile smoke check: do not contend with a second WebGL browser.
if(!report.failure){
 const mobile=await webkit.launch();const p=await mobile.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>report.errors.push(e.message));
 try{
  await p.goto('http://localhost:4202/?view=interior#/');await p.waitForFunction(()=>window.__mogao?.inspect().loaded);
  await expect(p.getByTestId('world-interact')).toBeVisible();await p.screenshot({path:`${prefix}-web-mobile.png`});
  expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await p.setViewportSize({width:390,height:844});await expect(p.getByTestId('world-rotate')).toBeVisible();const before=await p.evaluate(()=>window.__mogao.inspect().checkpoint.position);
  await p.keyboard.press('w');expect(await p.evaluate(()=>window.__mogao.inspect().checkpoint.position)).toEqual(before);
  await p.setViewportSize({width:844,height:390});await expect(p.getByTestId('world-rotate')).toHaveCount(0);await expect(p.getByTestId('world-interact')).toBeVisible();
  report.checks.push('WebKit mobile landscape renders tall mural; portrait cover stops input and restores position');expect(report.errors).toEqual([]);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await p.screenshot({path:`${prefix}-mobile-failure.png`});}
 finally{await mobile.close();}
}
await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
