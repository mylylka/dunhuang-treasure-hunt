import {chromium,webkit,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const layout=JSON.parse(await readFile('src/content/world/music-pavilion-layout-v003.json','utf8'));
const prefix='work/world/music-pavilion-v003',report={passed:false,checks:[],errors:[],screens:[]};
const browser=await chromium.launch({channel:'chrome'});
let page;
async function load(view,version='v003'){
  if(page)await page.close();page=await browser.newPage({viewport:{width:1279,height:925}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({v,pose})=>{
    const [x,z,yaw]=pose;sessionStorage.setItem(`dunhuang:music-pavilion-preview:${v==='v003'?'v3':'v2'}`,JSON.stringify({version:1,position:{x,z},heading:yaw,cameraYaw:yaw,visitedEvents:[]}));
    sessionStorage.setItem('dunhuang:character-cinematics:v1',JSON.stringify({opening:true,hall:true}));
  },{v:version,pose:layout.views[view]});
  await page.goto(`http://localhost:${version==='v003'?4196:4195}/`);await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
  await page.waitForTimeout(800);return page;
}
const state=()=>page.evaluate(()=>window.__musicPavilion.inspect());
async function photo(name){const path=`${prefix}-${name}.png`;await page.screenshot({path});report.screens.push({name,path,state:await state()});}
try{
  for(const view of ['outside-front','outside-east','outside-west','outside-back','approach']){
    await load(view,'v002');await photo(`before-${view}`);
    await load(view);await photo(view);
  }
  report.checks.push('same-position front/side/rear screenshots from preserved v002 and new v003');
  for(const [view,axis,predicate] of [['outside-east','x',value=>value>55.45],['outside-west','x',value=>value<36.55],['outside-back','z',value=>value< -30.75]]){
    await load(view);const start=(await state()).checkpoint.position;
    await page.keyboard.down('w');await page.waitForTimeout(3500);await page.keyboard.up('w');
    const end=(await state()).checkpoint.position;expect(predicate(end[axis])).toBe(true);expect(Math.hypot(start.x-end.x,start.z-end.z)).toBeGreaterThan(.3);
  }
  report.checks.push('real input cannot cross either side or the rear perimeter');
  await load('approach');await page.keyboard.down('w');await page.waitForTimeout(6000);await page.keyboard.up('w');
  expect((await state()).checkpoint.position.z).toBeLessThan(-12);await photo('inside-gate');
  report.checks.push('actual gate entry remains open with the raised walls');
  await load('mural');await photo('mural-gray');
  await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await photo('mural-color');
  expect((await state()).musicAudio.playing).toBe(true);await page.keyboard.press('Escape');expect((await state()).flying.color).toBe(0);await photo('mural-exit');
  report.checks.push('raised observation camera sees full mural; exit still restores gray');
  await load('porch');await photo('porch');
  await page.getByRole('button',{name:'路线',exact:true}).click();await photo('route-map');
  await page.close();page=null;
  const mobile=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const mp=await mobile.newPage();await mp.goto('http://localhost:4196/?view=mural');await mp.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
  await mp.getByTestId('world-interact').click();await mp.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await mp.screenshot({path:`${prefix}-mobile-mural.png`});
  await mp.getByTestId('flying-exit').click();expect(await mp.evaluate(()=>window.__musicPavilion.inspect().flying.color)).toBe(0);await mobile.close();
  report.checks.push('mobile landscape mural observation and return');
  const original=JSON.parse(await readFile('art-source/world/music-pavilion/v002/protected-assets.json','utf8'));
  for(const [path,hash] of Object.entries(original))expect(createHash('sha256').update(await readFile(path)).digest('hex'),path).toBe(hash);
  report.checks.push('37 protected previous assets remain unchanged');
  expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.message;process.exitCode=1;}
finally{await browser.close();await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks,errors:report.errors,failure:report.failure}));}
if(report.passed){
  const safari=await webkit.launch(),p=await safari.newPage({viewport:{width:1279,height:925}});
  const result={passed:false,errors:[]};p.on('pageerror',e=>result.errors.push(e.message));
  try{await p.goto('http://localhost:4196/?view=mural');await p.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);await p.getByTestId('world-interact').click();await p.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await p.screenshot({path:`${prefix}-webkit-mural.png`});await p.getByTestId('flying-exit').click();expect(await p.evaluate(()=>window.__musicPavilion.inspect().flying.color)).toBe(0);expect(result.errors).toEqual([]);result.passed=true;}
  catch(e){result.failure=e.message;process.exitCode=1;}
  finally{await safari.close();await writeFile(`${prefix}-webkit.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({webkit:result}));}
}
