import {chromium,expect} from '@playwright/test';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {TERRAIN_SESSION_KEY,TERRAIN_REGIONS,toTerrainPoint,fromTerrainPoint} from '../src/content/world/terrain-layout-v001.ts';
import {isTerrainWalkable} from '../src/world/terrain-rules-v001.ts';

const url=process.env.TERRAIN_TEST_URL??'http://localhost:4222/';
const out='outputs/terrain/v007';await mkdir(out,{recursive:true});
const layout=JSON.parse(await readFile('src/content/world/courtyard-hall-v006.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}});
const report={passed:false,checks:[],errors:[],views:[],modelSha256:createHash('sha256').update(await readFile('public/assets/world/courtyard/v006/courtyard.glb')).digest('hex')};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
const inspect=()=>page.evaluate(()=>window.__terrain.inspect());
const local=async()=>fromTerrainPoint('courtyard',(await inspect()).checkpoint.position);
const check=(name,data={})=>{report.checks.push({name,...data});console.log(name)};
const facing=(from,to)=>Math.atan2(-(to.x-from.x),-(to.z-from.z));
await page.addInitScript(({key})=>{
  const pending=sessionStorage.getItem('workshop-next');if(pending){sessionStorage.setItem(key,pending);sessionStorage.removeItem('workshop-next')}
  localStorage.setItem('dunhuang:sound-settings:v1',JSON.stringify({version:1,enabled:false,volume:.4}));
},{key:TERRAIN_SESSION_KEY});
async function ready(){
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});
  if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();
  await page.evaluate(()=>new Promise(resolve=>{let frames=0;function frame(){if(++frames===12)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)}));
}
async function seed(point,yaw=0){
  expect(isTerrainWalkable(toTerrainPoint('courtyard',point)),`invalid test position ${JSON.stringify(point)}`).toBe(true);
  const p=toTerrainPoint('courtyard',point),angle=Math.atan2(Math.sin(yaw+TERRAIN_REGIONS.courtyard.yaw),Math.cos(yaw+TERRAIN_REGIONS.courtyard.yaw));
  await page.evaluate(({p,angle})=>sessionStorage.setItem('workshop-next',JSON.stringify({version:1,position:{x:p.x,z:p.z},heading:angle,cameraYaw:angle,visitedEvents:[]})),{p,angle});
  await page.reload();await ready();const position=await local();expect(position.x).toBeCloseTo(point.x,4);expect(position.z).toBeCloseTo(point.z,4);
}
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});const s=await inspect();report.views.push({name,checkpoint:s.checkpoint,camera:s.camera});}
async function advance(from,to){
  await seed(from,facing(from,to));const destination=toTerrainPoint('courtyard',to),start=toTerrainPoint('courtyard',from),length=Math.hypot(to.x-from.x,to.z-from.z);
  // Release in the rendered frame that reaches the target. Waiting for a CDP
  // round-trip before keyup can add >.5m on a busy desktop, testing tool latency
  // instead of the actual passage. The normal keyboard listener still handles
  // this keyup, and Playwright's held-key state is released in finally below.
  await page.evaluate(({start,length})=>{
    const state={done:false,active:true};window.__workshopWalk=state;const deadline=performance.now()+10000;
    function frame(){
      if(!state.active)return;
      const p=window.__terrain.inspect().checkpoint.position;
      if(Math.hypot(p.x-start.x,p.z-start.z)>=length-.07){
        window.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW',bubbles:true}));state.done=true;state.active=false;
      }else if(performance.now()<deadline)requestAnimationFrame(frame);else state.active=false;
    }
    requestAnimationFrame(frame);
  },{start,length});
  await page.keyboard.down('w');
  try{await page.waitForFunction(()=>window.__workshopWalk.done,null,{timeout:10000})}
  finally{await page.keyboard.up('w');await page.evaluate(()=>{window.__workshopWalk.active=false})}
  await page.waitForFunction(()=>!window.__terrain.inspect().moving);
  const p=(await inspect()).checkpoint.position;expect(Math.hypot(p.x-destination.x,p.z-destination.z)).toBeLessThan(.3);
}
try{
  await page.goto(url+'?view=workshop#/');await ready();const initial=await inspect();
  expect((await local()).x).toBeCloseTo(layout.workshop.paintPoint.x,4);
  expect((await local()).z).toBeCloseTo(layout.workshop.paintPoint.z,4);
  expect(initial.terrain.scene.squareHall.asset).toBe('courtyard/v006/courtyard.glb');
  expect(initial.terrain.scene.courtyardExpansion.addedWidth).toBe(4);
  expect(initial.terrain.scene.courtyardShadows.closedMeshes).toBeGreaterThan(100);
  check('生产页载入工作坊新模型，院落扩建与场景照明保留',{asset:initial.terrain.scene.squareHall.asset});
  await seed({x:-15.8,z:-3.5},1.8);await shot('workshop-overview');
  const {paintPoint,takeColorPoint,referencePoint,accessPath,takeColorPath,referencePath}=layout.workshop;
  for(const [name,route] of [['进入作画站位',accessPath],['从作画处取颜料',takeColorPath],['转身看纹样板',referencePath]]){
    for(let i=1;i<route.length;i++)await advance(route[i-1],route[i]);
    check(`真实W键行走：${name}`,{position:await local()});
  }
  const table=layout.playerSolids.find(s=>s.id==='hall-v003-workbench');
  const tableCenter={x:(table.minX+table.maxX)/2,z:(table.minZ+table.maxZ)/2};
  await seed(paintPoint,facing(paintPoint,tableCenter));await shot('workshop-painting-position');
  await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');await page.waitForFunction(()=>!window.__terrain.inspect().moving);
  const stopped=await local();expect(Math.hypot(stopped.x-tableCenter.x,stopped.z-tableCenter.z)).toBeGreaterThan(1.3);
  expect(Math.hypot(stopped.x-paintPoint.x,stopped.z-paintPoint.z)).toBeGreaterThan(.3);
  expect(Math.hypot(stopped.x-paintPoint.x,stopped.z-paintPoint.z)).toBeLessThan(1);
  check('桌前可操作且角色不能穿过桌腿支撑范围',{stopped});
  await seed(takeColorPoint,Math.PI/2);await shot('workshop-pigment-rack');
  await seed(referencePoint,Math.PI/2);await shot('workshop-pattern-board');
  await seed({x:-16,z:-2.6},Math.PI/2);await shot('workshop-table-support');
  await seed({x:-18,z:.4},Math.PI/2);await shot('workshop-corner-shrubs');
  await seed({x:-4,z:-4},Math.PI*.75);await shot('courtyard-cleared-east');
  await advance({x:-2.75,z:-.8},{x:-2.75,z:-4.75});check('原东侧展示位置通道畅通，无旧陈设遗留碰撞');
  await seed({x:-12,z:-3.7});await page.keyboard.down('Shift');await page.keyboard.down('w');
  const hallTarget=toTerrainPoint('courtyard',{x:-12,z:-10.2}),hallStart=toTerrainPoint('courtyard',{x:-12,z:-3.7});
  try{await page.waitForFunction(({hallTarget,hallStart})=>{const p=window.__terrain.inspect().checkpoint.position;return Math.hypot(p.x-hallStart.x,p.z-hallStart.z)>=Math.hypot(hallTarget.x-hallStart.x,hallTarget.z-hallStart.z)},{hallTarget,hallStart},{timeout:10000})}
  finally{await page.keyboard.up('w');await page.keyboard.up('Shift')}
  expect((await local()).z).toBeLessThan(-10);await shot('hall-preserved');check('院门到大厅通道与已验收大厅保留');
  await page.getByTestId('world-pause').click();const paused=(await inspect()).checkpoint.position;await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');expect((await inspect()).checkpoint.position).toEqual(paused);await page.getByTestId('world-resume').click();check('暂停保持人物位置');
  expect(await page.evaluate(()=>[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight])).toEqual([0,0]);
  expect(report.errors).toEqual([]);check('电脑页面无滚动、脚本错误与资源加载错误');report.passed=true;
}catch(e){report.failure={message:String(e),state:await inspect().catch(()=>null)};await page.screenshot({path:'work/world/workshop-v007-failure.png'});throw e}
finally{await writeFile('work/world/workshop-v007-report.json',JSON.stringify(report,null,2));await browser.close()}
