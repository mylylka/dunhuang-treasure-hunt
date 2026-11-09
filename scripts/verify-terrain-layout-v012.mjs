import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {TERRAIN_ANCHORS,toTerrainPoint} from '../src/content/world/terrain-layout-v001.ts';

// Only this revision's overview, entrance, rock material and caravan sightlines.
const detailsOnly=process.argv.includes('--details');
const out='work/world/terrain-layout-v012';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
const errors=[],shots=[],assets=new Set();
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);if(response.url().includes('bactrian-caravan'))assets.add(response.url());});
await page.addInitScript(()=>{const next=sessionStorage.getItem('layout-next');if(next){sessionStorage.setItem('dunhuang:terrain-preview:v3',next);sessionStorage.removeItem('layout-next');}});
async function ready(){
 await page.waitForFunction(()=>window.__terrain?.inspect().loaded,null,{timeout:90000});
 if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();
 await page.evaluate(()=>window.__characterCinematics?.skip());
 await page.waitForTimeout(450);
}
async function shot(id){
 await page.addStyleTag({content:'.world-hud{visibility:hidden!important}'});
 await page.screenshot({path:`${out}/${id}.png`});
 const state=await page.evaluate(()=>window.__terrain.inspect());
 shots.push({id,state});console.log(JSON.stringify({shot:id,position:state.checkpoint.position,camels:state.terrain?.scene?.bactrianCaravans?.camels,rocks:state.terrain?.scene?.rockFinish,lighting:state.terrain?.scene?.lighting?.status}));
}
const look=(x,z,tx,tz)=>Math.atan2(-(tx-x),-(tz-z));
async function seed(x,z,tx,tz){
 const yaw=look(x,z,tx,tz);
 await page.evaluate(p=>sessionStorage.setItem('layout-next',JSON.stringify(p)),{version:1,position:{x,z},heading:yaw,cameraYaw:yaw,visitedEvents:[]});
 await page.reload();await ready();
}
try{
 await page.goto('http://localhost:4225/?view=start#/');await ready();
 if(!detailsOnly){await page.evaluate(()=>window.__terrain.overview(true));await page.waitForTimeout(750);await shot('overview');}
 const gate=TERRAIN_ANCHORS.musicGate,p=toTerrainPoint('music',{x:40.2,z:13});
 await seed(p.x,p.z,gate.x,gate.z);await shot('music-entry');
 const before=await page.evaluate(()=>window.__terrain.inspect());
 await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');
 const after=await page.evaluate(()=>window.__terrain.inspect());
 if(Math.hypot(after.checkpoint.position.x-before.checkpoint.position.x,after.checkpoint.position.z-before.checkpoint.position.z)<.2)errors.push('Music gate approach did not move');
 if(before.terrain.scene.lighting.staticPasses!==after.terrain.scene.lighting.staticPasses)errors.push('Static shadows rebaked while moving');
 await seed(220,-10,335,85);await page.getByRole('button',{name:'向上看',exact:true}).click();await page.getByRole('button',{name:'向上看',exact:true}).click();await page.waitForTimeout(350);await shot('tower-rocks');
 if(!detailsOnly){await seed(136.5,22,175,-197);await shot('north-caravans');}
 await seed(163,43,290,239);await page.getByRole('button',{name:'向上看',exact:true}).click();await page.getByRole('button',{name:'向上看',exact:true}).click();await page.waitForTimeout(350);await shot('south-caravans');
 const lighting=shots[0]?.state.terrain?.scene?.lighting;
 if(lighting?.sunAzimuthDegrees!==250||lighting?.sunElevationDegrees!==30)errors.push('Sun direction changed');
 if(shots[0]?.state.terrain?.scene?.bactrianCaravans?.camels!==19)errors.push('Bactrian count differs from configured 19');
}catch(error){errors.push(String(error));console.error(error);}finally{
 await writeFile(`${out}/${detailsOnly?'details-report':'report'}.json`,JSON.stringify({shots,errors,assets:[...assets]},null,2));
 await browser.close();
}
if(errors.length){console.error(JSON.stringify(errors));process.exitCode=1;}
