import {chromium,webkit,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const report={passed:false,checks:[],errors:[]},prefix='work/world/music-pavilion-v006';
async function verify(kind,options,tag){
 const browser=await kind.launch(kind===chromium?{channel:'chrome'}:{}),context=await browser.newContext(options),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 try{
  await page.goto('http://localhost:4200/?view=mural-left#/');await page.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);await page.getByTestId('world-encounter').getByRole('button').click();await page.getByTestId('world-interact').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing);await expect(page.getByTestId('flying-subtitle')).toBeVisible();await page.screenshot({path:`${prefix}-${tag}-subtitle.png`});
  const r=await page.getByTestId('flying-subtitle').boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(options.viewport.width);expect(r.y+r.height).toBeLessThanOrEqual(options.viewport.height);
  await page.getByTestId('flying-subtitle').getByRole('button').click();await expect(page.getByTestId('world-culture-choice')).toBeVisible();await expect(page.locator('.world-subtitle')).toHaveCount(0);
  expect(await page.getByTestId('world-host').evaluate(e=>getComputedStyle(e).filter)).toContain('blur');await page.screenshot({path:`${prefix}-${tag}-choice.png`});
  for(const id of ['world-choice-roam','world-enter-theme']){const b=await page.getByTestId(id).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(options.viewport.height);expect(b.x+b.width).toBeLessThanOrEqual(options.viewport.width);}
  await page.getByTestId('world-choice-roam').click();expect(await page.evaluate(()=>window.__musicPavilion.inspect().flying.color)).toBe(0);
  await page.getByTestId('world-interact').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing);await page.keyboard.press('Space');await expect(page.getByTestId('world-culture-choice')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByTestId('world-culture-choice')).toHaveCount(0);expect(await page.evaluate(()=>window.__musicPavilion.inspect().view)).toBe('follow');
  report.checks.push(`${tag}: subtitle only, touch/Space skip, blurred two choices, buttons fit, Esc returns to roaming`);
  if(tag==='mobile'){
   await page.goto('http://localhost:4200/?view=story#/');await page.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);await page.getByTestId('world-interact').click();await page.getByTestId('world-story-start').click();
   await page.getByTestId('world-subtitle').getByRole('button').click();await page.getByTestId('world-subtitle').getByRole('button').click();await expect(page.getByTestId('world-culture-choice')).toBeVisible();await expect(page.locator('.world-subtitle')).toHaveCount(0);await page.screenshot({path:`${prefix}-mobile-story-choice.png`});report.checks.push('mobile story subtitles removed before the shared choice');
  }
 }finally{await browser.close();}
}
try{
 await verify(chromium,{viewport:{width:844,height:390},isMobile:true,hasTouch:true},'mobile');
 await verify(webkit,{viewport:{width:1279,height:925}},'webkit');
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1279,height:925}});
 try{
  await p.goto('http://localhost:4200/?view=music-road#/');await p.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);await p.keyboard.down('w');await p.waitForFunction(()=>window.__musicPavilion.inspect().musicAudio.gain>0);await p.getByTestId('world-pause').click();await p.keyboard.up('w');await p.waitForTimeout(2200);await p.getByTestId('world-resume').click();expect(await p.evaluate(()=>window.__musicPavilion.inspect().encounter)).toBeNull();await p.waitForTimeout(700);expect(await p.evaluate(()=>window.__musicPavilion.inspect().encounter)).toBeNull();await p.waitForFunction(()=>window.__musicPavilion.inspect().encounter?.id==='music');await p.keyboard.press('Space');report.checks.push('pause freezes the two-second music lead-in');
 }finally{await b.close();}
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await writeFile(`${prefix}-access-check.json`,JSON.stringify(report,null,2));console.log(report);}
