import {chromium,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import {TERRAIN_SESSION_KEY,TERRAIN_REGIONS,toTerrainPoint} from '../src/content/world/terrain-layout-v001.ts';
import {MUSIC_COURTYARD_TREE} from '../src/content/world/music-courtyard-tree-v001.ts';
const url=process.env.TERRAIN_TEST_URL??'http://localhost:4222/';
const out='outputs/terrain/v003';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}});
const report={checks:[],errors:[],passed:false};page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const inspect=()=>page.evaluate(()=>window.__terrain.inspect());
await page.addInitScript(({key})=>{const p=sessionStorage.getItem('court-next');if(p){sessionStorage.setItem(key,p);sessionStorage.removeItem('court-next');}},{key:TERRAIN_SESSION_KEY});
async function ready(){await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();}
async function seed(region,x,z,yaw=0){const p=toTerrainPoint(region,{x,z}),angle=TERRAIN_REGIONS[region].yaw+yaw;await page.evaluate(({p,angle})=>{sessionStorage.setItem('court-next',JSON.stringify({version:1,position:{x:p.x,z:p.z},heading:angle,cameraYaw:angle,visitedEvents:[]}));localStorage.setItem('dunhuang:sound-settings:v1',JSON.stringify({version:1,enabled:false,volume:.4}));},{p,angle});await page.reload();await ready();await page.waitForTimeout(350);expect((await inspect()).checkpoint.position.x).toBeCloseTo(p.x,4);}
const check=(name,data={})=>{report.checks.push({name,...data});console.log(name);};
try{
 await page.goto(url+'?view=start#/');await ready();const scene=(await inspect()).terrain.scene;
 expect(scene.courtyardExpansion.addedWidth).toBe(4);expect(scene.musicTree.height).toBeCloseTo(MUSIC_COURTYARD_TREE.placement.height,2);
 for(const count of Object.values(scene.musicFurniture.movedVertices))expect(count).toBeGreaterThan(0);
 check('院落扩建和新树、完整装置移动均已加载',{courtyard:scene.courtyardExpansion,tree:scene.musicTree,furniture:scene.musicFurniture});
 await seed('courtyard',-19.5,-4,Math.PI/2);await page.screenshot({path:out+'/courtyard-expanded.png'});
 await page.keyboard.down('w');await page.waitForTimeout(900);await page.keyboard.up('w');await page.waitForFunction(()=>!window.__terrain.inspect().moving);const courtyard=await inspect();expect(courtyard.moving).toBe(false);await page.screenshot({path:out+'/courtyard-side-walk.png'});check('扩宽后的左侧真实行走与院墙画面',{position:courtyard.checkpoint.position});
 await seed('music',41.5,.5,0);await page.keyboard.press('r');await page.keyboard.press('r');await page.waitForTimeout(500);await page.screenshot({path:out+'/music-tree.png'});
 await seed('music',40.2,24,0);await page.keyboard.press('r');await page.keyboard.press('r');await page.waitForTimeout(500);await page.screenshot({path:out+'/music-tree-full.png'});
 await seed('music',40.2,8,0);const before=(await inspect()).checkpoint.position;await page.keyboard.down('w');await page.waitForTimeout(2100);await page.keyboard.up('w');const after=(await inspect()).checkpoint.position;expect(Math.hypot(after.x-before.x,after.z-before.z)).toBeGreaterThan(3);check('乐舞坊正门通路不被树根或挪动后的旗幡堵住');
 await seed('cliff',122,-36,0);await page.screenshot({path:out+'/stairs-cleared.png'});
 await page.getByTestId('terrain-overview').click();await page.waitForTimeout(350);await page.screenshot({path:out+'/overview.png'});check('院内树、移出的装置、干净台阶与高空实际截图');
 expect(report.errors).toEqual([]);report.passed=true;
}catch(error){report.failure=String(error);await page.screenshot({path:'work/world/terrain-v003-courts-failure.png'});throw error;}finally{await writeFile('work/world/terrain-v003-courts-report.json',JSON.stringify(report,null,2));await browser.close();}
