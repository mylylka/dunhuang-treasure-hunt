import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {TERRAIN_ROUTES,TERRAIN_SESSION_KEY,fromTerrainPoint,toTerrainPoint} from '../src/content/world/terrain-layout-v001.ts';
const url=process.env.TERRAIN_TEST_URL??'http://localhost:4222/';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}});
const report={checks:[],errors:[],passed:false};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const inspect=()=>page.evaluate(()=>window.__terrain.inspect());
const path=TERRAIN_ROUTES[0].points;
const atDistance=d=>{let sum=0;for(let i=1;i<path.length;i++){sum+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);if(sum>=d)return path[i];}return path.at(-1);};
async function ready(){await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();}
await page.addInitScript(({key})=>{const v=sessionStorage.getItem('feedback-next');if(v){sessionStorage.setItem(key,v);sessionStorage.removeItem('feedback-next');}},{key:TERRAIN_SESSION_KEY});
async function seed(p,yaw=0,enabled=true){await page.evaluate(({p,yaw,enabled})=>{sessionStorage.setItem('feedback-next',JSON.stringify({version:1,position:{x:p.x,z:p.z},heading:yaw,cameraYaw:yaw,visitedEvents:[]}));localStorage.setItem('dunhuang:sound-settings:v1',JSON.stringify({version:1,enabled,volume:.4}));},{p,yaw,enabled});await page.reload();await ready();}
const check=(name,data={})=>{console.log(name);report.checks.push({name,...data});};
try{
 await page.goto(url+'?view=start#/');await ready();
 const early=atDistance(10.5);await seed(early,-1.5);await page.keyboard.press('c');
 await page.waitForFunction(()=>window.__terrain.inspect().musicAudio?.audible,null,{timeout:8000});
 const audioStart=(await inspect()).musicAudio;expect(audioStart.gain).toBeLessThan(.025);
 await page.waitForTimeout(650);expect((await inspect()).encounter).toBeNull();
 await page.getByTestId('world-pause').click();const paused=(await inspect()).musicAudio;await page.waitForTimeout(650);
 expect((await inspect()).musicAudio.audibleTime-paused.audibleTime).toBeLessThan(.08);
 await page.getByTestId('world-resume').click();
 await page.waitForFunction(()=>window.__terrain.inspect().encounter?.id==='music',null,{timeout:7000});
 const spoken=await inspect();expect(spoken.encounter.text).toBe('哪里来的音乐声？');expect(spoken.musicAudio.audibleTime).toBeGreaterThanOrEqual(2.5);expect(spoken.musicAudio.audibleTime).toBeLessThan(3.25);
 await page.screenshot({path:'work/world/terrain-v003-early-music-question.png'});
 check('上坡初段轻音乐先响；实际听满约2.5秒才说原台词；暂停不累计',{early,audioStart,spoken:spoken.musicAudio});
 await page.getByTestId('world-encounter').getByRole('button').click();await page.waitForTimeout(550);expect((await inspect()).encounter).toBeNull();
 const gains=[];
 for(const d of [10.5,30,60,85]){await seed(atDistance(d),-1.5);await page.keyboard.press('c');await page.waitForFunction(()=>window.__terrain.inspect().musicAudio?.playing);await page.waitForTimeout(200);gains.push({distance:d,gain:(await inspect()).musicAudio.gain});}
 expect(gains[3].gain/gains[0].gain).toBeGreaterThan(20);check('从远到近的四段实际音乐增益明显递增',{gains});
 await seed(early,-1.5,false);await page.keyboard.press('c');await page.waitForTimeout(3300);const muted=await inspect();expect(muted.encounter).toBeNull();expect(muted.musicAudio.audibleTime).toBe(0);check('静音时不伪触发听见音乐的疑问');
 await seed(atDistance(42),-1.45,false);await page.keyboard.press('c');await page.waitForTimeout(300);await page.screenshot({path:'work/world/terrain-v003-facade-distant.png'});
 await page.keyboard.down('d');await page.waitForTimeout(750);await page.keyboard.up('d');await page.screenshot({path:'work/world/terrain-v003-facade-distant-moved.png'});expect((await inspect()).terrain.logarithmicDepth).toBe(true);check('坡上远望楼门并实际横移，记录高精度深度渲染截图');
 expect(report.errors).toEqual([]);report.passed=true;
} catch(error){report.failure=String(error);await page.screenshot({path:'work/world/terrain-v003-feedback-failure.png'});throw error;}finally{await writeFile('work/world/terrain-v003-feedback-report.json',JSON.stringify(report,null,2));await browser.close();}
