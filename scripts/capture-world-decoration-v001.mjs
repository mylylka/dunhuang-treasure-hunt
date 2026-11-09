import { chromium } from '@playwright/test';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { TERRAIN_SESSION_KEY, TERRAIN_REGIONS, toTerrainPoint, TERRAIN_SPAWN } from '../src/content/world/terrain-layout-v001.ts';

const folder='outputs/world-decoration-reference/v001/original';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});
const shots=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript((key)=>{const p=sessionStorage.getItem('decoration-next');if(p){sessionStorage.setItem(key,p);sessionStorage.removeItem('decoration-next')}},TERRAIN_SESSION_KEY);
async function ready(){await page.getByTestId('world-host').waitFor({state:'visible',timeout:90000});await page.waitForFunction(()=>window.__terrain?.inspect().loaded,null,{timeout:90000});if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();await page.waitForTimeout(700)}
async function picture(id,title,hide=true){
 const path=`${folder}/${id}.png`;let exists=false;try{await access(path);exists=true}catch{}
 if(hide)await page.addStyleTag({content:'.world-hud{visibility:hidden!important}'});
 if(!exists)await page.screenshot({path});const s=await page.evaluate(()=>window.__terrain.inspect());
 shots.push({id,title,path,position:s.checkpoint.position,cameraYaw:s.checkpoint.cameraYaw,view:s.view,overview:s.overview});console.log(`${id}: ${title}`);
}
async function seed(x,z,yaw){await page.evaluate(({key,x,z,yaw})=>sessionStorage.setItem('decoration-next',JSON.stringify({version:1,position:{x,z},heading:yaw,cameraYaw:yaw,visitedEvents:[]})),{key:TERRAIN_SESSION_KEY,x,z,yaw});await page.reload();await ready()}
const local=(region,x,z,yaw)=>{const p=toTerrainPoint(region,{x,z});return {x:p.x,z:p.z,yaw:yaw+TERRAIN_REGIONS[region].yaw}};
const look=(x,z,tx,tz)=>Math.atan2(-(tx-x),-(tz-z));
const views=[];
const outdoor=[['门外小路',TERRAIN_SPAWN],['上坡中段',{x:128,z:19}],['坡顶',{x:136.5,z:22}],['下坡中段',{x:153,z:36}],['湖边谷地',{x:237,z:69}],['崖前道路',{x:309,z:62}]];
const directions=[['北',0],['东',-Math.PI/2],['南',Math.PI],['西',Math.PI/2]];
for(let i=0;i<outdoor.length;i++)for(let j=0;j<4;j++){const [name,p]=outdoor[i],[direction,yaw]=directions[j];views.push({id:`o${String(i*4+j+1).padStart(2,'0')}`,title:`户外·${name}·向${direction}`,x:p.x,z:p.z,yaw})}
const cExterior=[[-12,15,-12,-10],[-31,-3,-12,-11],[7,-3,-12,-11],[-12,-35,-12,-13],[-28,10,-12,-12],[4,10,-12,-12]];
cExterior.forEach(([x,z,tx,tz],i)=>views.push({id:`c${String(i+1).padStart(2,'0')}`,title:`绘彩馆外围 ${i+1}`,...local('courtyard',x,z,look(x,z,tx,tz))}));
[0,Math.PI/2,Math.PI,-Math.PI/2].forEach((yaw,i)=>views.push({id:`c${String(i+7).padStart(2,'0')}`,title:`绘彩馆庭院方向 ${i+1}`,...local('courtyard',-12,-2.8,yaw)}));
[0,Math.PI/2,-Math.PI/2,Math.PI].forEach((yaw,i)=>views.push({id:`c${String(i+11).padStart(2,'0')}`,title:`大厅内部方向 ${i+1}`,...local('courtyard',-12,-15,yaw)}));
views.push({id:'c20',title:'绘彩馆工作坊',...local('courtyard',-16,-2.8,Math.PI/2)});
const musicExterior=[[40,20,46,-9],[12,-9,46,-9],[78,-9,46,-9],[46,-38,46,-9]];
musicExterior.forEach(([x,z,tx,tz],i)=>views.push({id:`m${String(i+1).padStart(2,'0')}`,title:`乐舞坊外观 ${i+1}`,...local('music',x,z,look(x,z,tx,tz))}));
[0,Math.PI/2,Math.PI,-Math.PI/2].forEach((yaw,i)=>views.push({id:`m${String(i+5).padStart(2,'0')}`,title:`乐舞坊庭院方向 ${i+1}`,...local('music',43,-3,yaw)}));
views.push({id:'m09',title:'乐舞坊平台与壁画',...local('music',52,-4,0)},{id:'m10',title:'乐舞坊平台回看入口',...local('music',52,-14,Math.PI)},{id:'m13',title:'乐舞坊左侧陈设',...local('music',31,-5,Math.PI/2)},{id:'m14',title:'乐舞坊右侧陈设',...local('music',63,-5,-Math.PI/2)});
const tower=[[122,35,122,-65],[75,10,122,-65],[170,10,122,-65],[80,-30,122,-65],[160,-30,122,-65],[122,75,122,-65]];
tower.forEach(([x,z,tx,tz],i)=>views.push({id:`t${String(i+1).padStart(2,'0')}`,title:`九层楼外部 ${i+1}`,...local('cliff',x,z,look(x,z,tx,tz))}));
[0,Math.PI/2,-Math.PI/2,Math.PI].forEach((yaw,i)=>views.push({id:`t${String(i+8).padStart(2,'0')}`,title:`洞窟内方向 ${i+1}`,...local('cliff',122,-78,yaw)}));
views.push({id:'t15',title:'九层楼洞口与入口过渡',...local('cliff',122,-53,0)},{id:'t16',title:'洞窟大佛与人物比例',...local('cliff',122,-80,0)},{id:'t17',title:'洞内壁画与墙面',...local('cliff',109,-79,Math.PI/2)});
try{
 await page.goto('http://localhost:4222/?view=start#/');await ready();
 await page.getByTestId('terrain-overview').click();await page.waitForTimeout(800);await picture('g01','世界高空总览');await page.evaluate(()=>window.__terrain.overview(false));
 const selected=process.argv.includes('--pilot')?views.slice(0,4):views;
 for(const v of selected){try{await seed(v.x,v.z,v.yaw);await picture(v.id,v.title)}catch(e){errors.push(`${v.id}: ${String(e)}`);console.error(`${v.id}: ${String(e)}`)}}
 if(!process.argv.includes('--pilot')){
  await page.goto('http://localhost:4222/?view=caisson#/');await ready();await picture('c15','大厅藻井仰视');
  await seed(...Object.values(local('courtyard',-12,-14,0)));await page.keyboard.press('r');await page.keyboard.press('r');await page.waitForTimeout(400);await picture('c16','大厅上部梁柱');
  await page.goto('http://localhost:4222/?view=interior#/');await ready();await page.keyboard.press('r');await page.keyboard.press('r');await page.waitForTimeout(400);await picture('t12','洞窟穹顶仰视');
 }
}finally{await writeFile('work/world/decoration-ground-capture-report.json',JSON.stringify({shots,errors},null,2));await browser.close()}
