import { chromium, expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { TERRAIN_ROUTES, TERRAIN_SESSION_KEY, TERRAIN_ANCHORS, TERRAIN_REGIONS, terrainSurfaceHeight, fromTerrainPoint, toTerrainPoint, lakeSignedDistance } from '../src/world/terrain-rules-v001.ts';

const base='http://localhost:4222',out='outputs/terrain/v001',prefix='work/world/terrain-v001-verified';
await mkdir(out,{recursive:true});
const report={checks:[],errors:[],poses:[],passed:false};
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(({key})=>{const pending=sessionStorage.getItem('terrain-test-next-checkpoint');if(pending){sessionStorage.setItem(key,pending);sessionStorage.removeItem('terrain-test-next-checkpoint');}},{key:TERRAIN_SESSION_KEY});
const inspect=()=>page.evaluate(()=>window.__terrain.inspect());
const check=(name,data={})=>{report.checks.push({name,...data});console.log(name);};
async function ready(){await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});await page.waitForFunction(()=>window.__terrain?.inspect().loaded,null,{timeout:45000});}
async function resume(){if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();}
async function open(view){await page.goto(`${base}/?view=${view}#/`);await ready();await resume();await page.waitForTimeout(400);}
async function seed(point,yaw){await page.evaluate(({key,point,yaw})=>sessionStorage.setItem('terrain-test-next-checkpoint',JSON.stringify({version:1,position:{x:point.x,z:point.z},heading:yaw,cameraYaw:yaw,visitedEvents:[]})),{key:TERRAIN_SESSION_KEY,point,yaw});await page.reload();await ready();await resume();await page.waitForTimeout(250);const seeded=await inspect();expect(seeded.checkpoint.position.x).toBeCloseTo(point.x,5);expect(seeded.checkpoint.position.z).toBeCloseTo(point.z,5);expect(seeded.checkpoint.cameraYaw).toBeCloseTo(yaw,5);}
async function hold(key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
async function screenshot(name,deliver=false){await page.screenshot({path:`${prefix}-${name}.png`});if(deliver)await page.screenshot({path:`${out}/${name}.png`});}
async function fits(){expect(await page.evaluate(()=>[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight])).toEqual([0,0]);}
try{
  await open('start');
  const initial=await inspect();
  await page.getByTestId('terrain-overview').click();
  await page.waitForTimeout(400);await screenshot('overview',true);
  await hold('w',350);expect((await inspect()).checkpoint.position).toEqual(initial.checkpoint.position);
  await page.getByTestId('terrain-overview').click();
  expect((await inspect()).checkpoint.position).toEqual(initial.checkpoint.position);
  check('高空总览保持人物位置，返回地面正常');

  await hold('s',1000);const walked=await inspect();
  expect(Math.hypot(walked.checkpoint.position.x-initial.checkpoint.position.x,walked.checkpoint.position.z-initial.checkpoint.position.z)).toBeGreaterThan(.9);
  await page.getByTestId('world-pause').click();const paused=(await inspect()).checkpoint.position;
  await hold('w',350);expect((await inspect()).checkpoint.position).toEqual(paused);
  await page.getByTestId('world-resume').click();await page.waitForTimeout(250);
  expect((await inspect()).checkpoint.position).toEqual(paused);
  expect(new URL(page.url()).searchParams.has('view')).toBe(false);
  await page.reload();await ready();await resume();
  expect((await inspect()).checkpoint.position).toEqual(paused);
  check('实际走动、暂停清键、刷新恢复及一次性预览参数');

  for(const [name,x,sign] of [['uphill',39,1],['downhill',111,-1]]){
    const path=TERRAIN_ROUTES[0].points;const i=path.findIndex(p=>p.x>=x),p=path[i],next=path[i+1];
    const yaw=Math.atan2(-(next.x-p.x),-(next.z-p.z));await seed(p,yaw);
    const before=await inspect();await page.keyboard.down('Shift');await hold('w',1800);await page.keyboard.up('Shift');const after=await inspect();
    report.poses.push({name,seed:p,yaw,before,after});console.log(JSON.stringify({name,seed:p,yaw,before:before.checkpoint,after:after.checkpoint,height:[before.terrain.height,after.terrain.height]}));
    expect(Math.hypot(after.checkpoint.position.x-before.checkpoint.position.x,after.checkpoint.position.z-before.checkpoint.position.z)).toBeGreaterThan(3);
    expect((after.terrain.height-before.terrain.height)*sign).toBeGreaterThan(.4);
    expect(after.terrain.cameraClearance).toBeGreaterThan(.2);await screenshot(name,true);
    check(`${name}：真实按键移动、脚高随坡、镜头在地面上方`);
  }
  for(const name of ['courtyard','crest','lake']){await open(name);await screenshot(name,true);report.poses.push({name,state:await inspect()});}
  check('院门、坡顶、湖岸实际渲染截图');

  // Approach the outer eastern shore facing the water, using the actual avatar.
  let bankX=260;while(lakeSignedDistance(bankX,15)>2)bankX-=.2;
  await seed({x:bankX,z:15},Math.PI/2);await page.keyboard.down('Shift');await hold('w',1500);await page.keyboard.up('Shift');
  const bank=(await inspect()).checkpoint.position;expect(lakeSignedDistance(bank.x,bank.z)).toBeGreaterThanOrEqual(1);
  check('人物在可见湖岸前停止，未进入湖床');

  await open('cliff');const foot=await inspect();await page.keyboard.down('Shift');await hold('w',2100);await page.keyboard.up('Shift');const stairs=await inspect();
  expect(stairs.terrain.height).toBeGreaterThan(foot.terrain.height+1);expect(stairs.terrain.cameraClearance).toBeGreaterThan(.2);await screenshot('stairs',true);
  check('移转后的九层楼台阶可实际走上，镜头不穿阶');

  await open('caisson');await expect(page.getByTestId('world-interact')).toBeVisible();await page.getByTestId('world-interact').click();
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view','caisson');await page.waitForTimeout(700);await screenshot('caisson');
  await expect(page.getByTestId('world-culture-choice')).toBeVisible({timeout:10000});await page.getByTestId('world-enter-theme').click();
  await expect(page.getByTestId('world-host')).toHaveCount(0);await page.getByTestId('world-return').click();await ready();await resume();
  const returned=await inspect(),safe=TERRAIN_ANCHORS.courtyardSafe;expect(returned.checkpoint.position.x).toBeCloseTo(safe.x,2);expect(returned.checkpoint.position.z).toBeCloseTo(safe.z,2);
  expect(returned.checkpoint.cameraYaw).toBeCloseTo(TERRAIN_REGIONS.courtyard.yaw,4);
  check('藻井观察镜头、文化入口、释放世界和旋转后的安全返回点');

  await open('flying');await page.locator('[data-world-canvas]').click({position:{x:650,y:350}});
  await page.waitForTimeout(700);
  if(await page.getByTestId('world-encounter').isVisible())await page.getByTestId('world-encounter').getByRole('button').click();
  await expect(page.getByTestId('world-interact')).toBeVisible({timeout:15000});await page.getByTestId('world-interact').click();
  await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view','flying');await page.waitForTimeout(900);await screenshot('flying');
  await page.keyboard.press('Escape');await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view','follow');
  check('旋转后飞天触发、观察镜头与退出');

  for(const name of ['deer','novice']){
    await open(name);await page.waitForTimeout(2400);await expect(page.getByTestId('world-interact')).toBeVisible();await page.getByTestId('world-interact').click();
    await expect(page.getByTestId('world-story')).toBeVisible();const p=(await inspect()).checkpoint.position;await hold('w',250);expect((await inspect()).checkpoint.position).toEqual(p);
    await page.keyboard.press('Escape');await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view','follow');check(`${name}：移转后的壁画触发、冻结与退出`);
  }
  await open('interior');await page.waitForTimeout(2400);await page.getByRole('button',{name:/抬头欣赏/}).click();
  // The original gaze zone starts beyond eye z=-74; enter it by walking forward.
  await hold('w',700);await page.waitForTimeout(1100);const gaze=await inspect();
  expect(gaze.buddhaInView).toBe(true);await screenshot('buddha');check('九层楼转向后仰视大佛仍命中真实视线');

  await open('start');
  for(const [width,height] of [[844,390],[667,375]]){
    await page.setViewportSize({width,height});await resume();await page.waitForTimeout(250);await fits();
    for(const button of await page.locator('.world-topbar button,.world-topbar a').all()){
      const r=await button.boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width+1);expect(r.y+r.height).toBeLessThanOrEqual(height+1);
    }
    await screenshot(`landscape-${width}`,true);check(`${width}×${height}横屏导航完整且无页面滚动`);
  }
  await page.setViewportSize({width:390,height:844});await expect(page.getByTestId('world-rotate')).toBeVisible();const portrait=(await inspect()).checkpoint.position;await hold('w',300);expect((await inspect()).checkpoint.position).toEqual(portrait);
  await page.setViewportSize({width:844,height:390});await resume();await page.waitForTimeout(200);expect((await inspect()).checkpoint.position).toEqual(portrait);check('竖屏停动、横屏恢复不残留输入');
  expect(await page.evaluate(()=>['dunhuang:progress:v1','dunhuang:artworks:v1'].map(k=>localStorage.getItem(k)))).toEqual([null,null]);
  expect(report.errors).toEqual([]);check('无资源、脚本、着色器错误，旧游戏与作品记录未修改');report.passed=true;
}catch(error){report.failure={message:String(error),state:await inspect().catch(()=>null)};await screenshot('failure');throw error;}finally{await writeFile(`${prefix}-report.json`,JSON.stringify(report,null,2));await browser.close();}
