import {chromium,expect} from '@playwright/test';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {TERRAIN_SESSION_KEY,TERRAIN_REGIONS,toTerrainPoint,fromTerrainPoint} from '../src/content/world/terrain-layout-v001.ts';
const url=process.env.TERRAIN_TEST_URL??'http://localhost:4222/';
const out='outputs/terrain/v005';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}});
const report={passed:false,checks:[],errors:[],views:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
const inspect=()=>page.evaluate(()=>window.__terrain.inspect());
const local=async()=>fromTerrainPoint('courtyard',(await inspect()).checkpoint.position);
const check=(name,data={})=>{report.checks.push({name,...data});console.log(name)};
await page.addInitScript(({key})=>{
  const pending=sessionStorage.getItem('hall-next');if(pending){sessionStorage.setItem(key,pending);sessionStorage.removeItem('hall-next')}
  localStorage.setItem('dunhuang:sound-settings:v1',JSON.stringify({version:1,enabled:false,volume:.4}));
},{key:TERRAIN_SESSION_KEY});
async function ready(){await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();}
async function seed(x,z,yaw=0){
 const p=toTerrainPoint('courtyard',{x,z}),angle=Math.atan2(Math.sin(yaw+TERRAIN_REGIONS.courtyard.yaw),Math.cos(yaw+TERRAIN_REGIONS.courtyard.yaw));
 await page.evaluate(({p,angle})=>sessionStorage.setItem('hall-next',JSON.stringify({version:1,position:{x:p.x,z:p.z},heading:angle,cameraYaw:angle,visitedEvents:[]})),{p,angle});
 await page.reload();await ready();await page.waitForTimeout(350);const position=await local();expect(position.x).toBeCloseTo(x,4);expect(position.z).toBeCloseTo(z,4);
}
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});const state=await inspect();report.views.push({name,checkpoint:state.checkpoint,camera:state.camera,stats:state.stats});}
async function walk(ms,run=false,key='w'){
 if(run)await page.keyboard.down('Shift');await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);if(run)await page.keyboard.up('Shift');
 await page.waitForFunction(()=>!window.__terrain.inspect().moving);await page.waitForTimeout(150);
}
try{
 await page.goto(url+'?view=hall#/');await ready();await page.waitForTimeout(500);
 const initial=await inspect();expect(initial.terrain.scene.squareHall.asset).toBe('courtyard/v004/courtyard.glb');expect(initial.terrain.scene.squareHall.parts.length).toBeGreaterThan(20);
 expect(initial.terrain.scene.courtyardExpansion.addedWidth).toBe(4);
 expect(initial.terrain.scene.courtyardShadows.closedMeshes).toBeGreaterThan(100);
 expect(initial.terrain.scene.courtyardShadows.wallDecals).toBeGreaterThan(10);
 expect(initial.terrain.scene.squareHall.parts.some(id=>id.startsWith('hall-v003-right-front-screen')||id.startsWith('hall-v003-right-middle-infill'))).toBe(false);
 check('载入实际方厅新GLB，已验收院落扩宽保留',{asset:initial.terrain.scene.squareHall.asset,parts:initial.terrain.scene.squareHall.parts.length});
 await shot('hall-entrance');
 await seed(-12,-3.7);await walk(1500,true);const inside=await local();expect(inside.z).toBeLessThan(-12);expect((await inspect()).terrain.height).toBeCloseTo(12.28,2);
 check('从庭院经完整敞口与新台阶跑入大厅，脚底升至台基',{local:inside});await shot('hall-front-wall');
 await seed(-12,-15,Math.PI/2);await shot('hall-left');
 await seed(-18,-14.5,Math.PI/2);await walk(850,true);const side=await local();expect(side.x).toBeLessThan(-21.4);expect(side.x).toBeGreaterThan(-23.2);expect((await inspect()).terrain.height).toBeCloseTo(12,2);
 await shot('hall-left-passage');check('从大厅穿开放柱间走到左侧庭院，连续下台基',{local:side});
 await seed(-22,-14.5,-Math.PI/2);await walk(650,true);expect((await local()).x).toBeGreaterThan(-19);expect((await inspect()).terrain.height).toBeCloseTo(12.28,2);check('左侧庭院可反向走入大厅');
 await seed(-12,-15,-Math.PI/2);await shot('hall-right');
 const layout=JSON.parse(await readFile('src/content/world/courtyard-hall-v004.json','utf8'));
 const wall=layout.playerSolids.find(s=>s.id.includes('right')&&/low-wall|infill/.test(s.id));
 if(!wall)throw new Error('Missing actual right-side hall solid');
 const z=(wall.minZ+wall.maxZ)/2;await seed(-7,z,-Math.PI/2);await walk(1000,true);const stopped=await local();expect(stopped.x).toBeLessThan(wall.minX-.55);expect(stopped.x).toBeGreaterThan(-7);check('右侧真实实体墙阻挡人物，不能穿墙',{wall:wall.id,local:stopped});
 await seed(-7,-10.5,-Math.PI/2);await walk(700,true);expect((await local()).x).toBeGreaterThan(-2.7);check('已移除的右前窄格栅与底座位置可以穿行');
 await seed(-7,-15.8,-Math.PI/2);await walk(700,true);expect((await local()).x).toBeGreaterThan(-2.7);check('已移除的右中孤立矮墙位置可以穿行');
 await seed(-4.8,-1.8,-Math.PI/2);await shot('pattern-display');
 await seed(-2.8,-3.75,-Math.PI/2);await shot('pattern-display-close');
 await seed(-4.5,-2.5,-Math.PI/2);await walk(700,true);const displayStop=await local();expect(displayStop.x).toBeLessThan(-1.8);check('腰高展示架真实碰撞，保留行走空间',{local:displayStop});
 await seed(-12,-15,Math.PI);await shot('hall-open-exit');await walk(1900,true);const exit=await local();expect(exit.z).toBeGreaterThan(-3.2);expect((await inspect()).terrain.height).toBeCloseTo(12,2);check('回看入口整面敞开，可直接跑回庭院',{local:exit});
 await seed(-12,-14);await page.keyboard.press('r');await page.keyboard.press('r');await page.waitForTimeout(500);await shot('hall-look-up');
 await seed(-12,-13);const motionStart=await inspect(),motion=[];
 await page.keyboard.down('q');await page.keyboard.down('w');
 for(let i=0;i<12;i++){
  await page.waitForTimeout(80);const state=await inspect();
  expect([...state.camera.position,...state.camera.target].every(Number.isFinite)).toBe(true);
  motion.push({position:state.checkpoint.position,camera:state.camera});
  if(i===3||i===8)await shot(`hall-motion-${i}`);
 }
 await page.keyboard.up('w');await page.keyboard.up('q');await page.waitForTimeout(150);
 const motionEnd=await inspect();expect(Math.hypot(motionEnd.checkpoint.position.x-motionStart.checkpoint.position.x,motionEnd.checkpoint.position.z-motionStart.checkpoint.position.z)).toBeGreaterThan(1);
 check('厅内连续走动并转镜头，12帧相机与人物状态有效',{motion});
 await seed(-16,-2.8,Math.PI/2);await shot('hall-workbench');
 await seed(-4.8,-8.5,Math.PI/2);await walk(1000);expect((await local()).x).toBeLessThan(-6.1);check('旧故事展架位置已无幽灵碰撞');
 await page.getByTestId('terrain-overview').click();await page.waitForTimeout(500);await shot('overview');await page.getByTestId('terrain-overview').click();
 await seed(-12,-12);await page.getByTestId('world-pause').click();const paused=(await inspect()).checkpoint.position;await walk(250);expect((await inspect()).checkpoint.position).toEqual(paused);await page.getByTestId('world-resume').click();await page.waitForTimeout(150);expect((await inspect()).checkpoint.position).toEqual(paused);check('新厅内暂停清键，不残留走动');
 expect(await page.evaluate(()=>[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight])).toEqual([0,0]);expect(report.errors).toEqual([]);check('网页无滚动、脚本与资源错误');report.passed=true;
}catch(e){report.failure={message:String(e),state:await inspect().catch(()=>null)};await page.screenshot({path:'work/world/hall-v005-failure.png'});throw e}
finally{await writeFile('work/world/hall-v005-report.json',JSON.stringify(report,null,2));await browser.close()}
