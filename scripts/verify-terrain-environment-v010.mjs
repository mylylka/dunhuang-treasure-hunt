import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

// Focused visual/integration smoke check, not the 2D/full-world regression suite.
const out='work/world/terrain-environment-v010';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:850},deviceScaleFactor:1});
const errors=[],shots=[],requests=new Set();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);if(r.url().includes('/environment-world/'))requests.add(r.url());});
await page.addInitScript(()=>{const next=sessionStorage.getItem('environment-capture-next');if(next){sessionStorage.setItem('dunhuang:terrain-preview:v3',next);sessionStorage.removeItem('environment-capture-next');}});
async function ready(){
 await page.waitForFunction(()=>window.__terrain?.inspect().loaded,null,{timeout:90000});
 if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();
 await page.evaluate(()=>window.__characterCinematics?.skip());
 await page.waitForTimeout(600);
}
async function shot(id){
 await page.addStyleTag({content:'.world-hud{visibility:hidden!important}'});
 await page.screenshot({path:`${out}/${id}.png`});
 const state=await page.evaluate(()=>window.__terrain.inspect());
 shots.push({id,state});console.log(JSON.stringify({shot:id,position:state.checkpoint.position,lighting:{status:state.terrain?.scene?.lighting?.status,staticPasses:state.terrain?.scene?.lighting?.staticPasses},stats:state.stats}));
}
async function seed(x,z,yaw){
 await page.evaluate(p=>sessionStorage.setItem('environment-capture-next',JSON.stringify(p)),{version:1,position:{x,z},heading:yaw,cameraYaw:yaw,visitedEvents:[]});
 await page.reload();await ready();
}
const look=(x,z,tx,tz)=>Math.atan2(-(tx-x),-(tz-z));
const landscapeOnly=process.argv.includes('--landscape');
try{
 await page.goto('http://localhost:4223/?view=start#/');await ready();
 if(!landscapeOnly){
 await shot('start');
 const before=await page.evaluate(()=>window.__terrain.inspect());
 await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');await page.keyboard.up('Shift');
 await page.keyboard.down('q');await page.waitForTimeout(500);await page.keyboard.up('q');
 const after=await page.evaluate(()=>window.__terrain.inspect());
 if(before.terrain.scene.lighting.staticPasses!==after.terrain.scene.lighting.staticPasses)errors.push('Static shadows rebaked while moving');
 console.log(JSON.stringify({movement:{before:before.checkpoint,after:after.checkpoint}}));
 }
 await page.evaluate(()=>window.__terrain.overview(true));await page.waitForTimeout(900);await shot('overview');
 if(!process.argv.includes('--pilot')){
  await seed(136.5,22,look(136.5,22,205,237));await shot('crest-caravan');
  if(!landscapeOnly){await seed(163,43,look(163,43,205,237));await shot('valley-caravan');}
  await seed(351,40,look(351,40,545,90));await shot('east-rocks');
  if(!landscapeOnly){await page.goto('http://localhost:4223/?view=hall-center#/');await ready();await shot('hall');}
 }
}catch(error){errors.push(String(error));console.error(error);}finally{
 await writeFile(`${out}/${landscapeOnly?'landscape-report':process.argv.includes('--pilot')?'pilot-report':'report'}.json`,JSON.stringify({shots,errors,environmentRequests:[...requests]},null,2));
 await browser.close();
}
if(errors.length){console.error(JSON.stringify(errors));process.exitCode=1;}
