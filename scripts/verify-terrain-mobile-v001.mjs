import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage(),report={passed:false,checks:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
const inspect=()=>page.evaluate(()=>window.__terrain.inspect()),position=async()=>(await inspect()).checkpoint.position;
const check=name=>{report.checks.push(name);console.log(name)};
const cdp=await context.newCDPSession(page);
const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,radiusX:3,radiusY:3,force:1,id:1}]});
async function resume(){if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').tap();}
async function fits(){expect(await page.evaluate(()=>[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight])).toEqual([0,0]);}
try{
 await page.goto('http://localhost:4222/?view=start#/');await page.waitForFunction(()=>window.__terrain?.inspect().loaded,null,{timeout:45000});await resume();
 expect(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)).toBe(true);
 const stick=page.getByRole('group',{name:'拖动摇杆行走'});await expect(stick).toBeVisible();
 const box=await stick.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2,before=await position();
 await touch('touchStart',x,y);await touch('touchMove',x,y+box.height*.3);await page.waitForTimeout(1400);await touch('touchEnd');
 const after=await position();expect(Math.hypot(after.x-before.x,after.z-before.z)).toBeGreaterThan(1);await page.waitForTimeout(400);expect(await position()).toEqual(after);
 check('真实触屏摇杆行走，松手停止');
 for(const [width,height] of [[844,390],[667,375]]){
  await page.setViewportSize({width,height});await resume();await page.waitForTimeout(250);await fits();
  for(const locator of [stick,...await page.locator('.world-topbar button,.world-topbar a,.world-look-controls button').all()]){const r=await locator.boundingBox();if(!r)continue;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width+1);expect(r.y+r.height).toBeLessThanOrEqual(height+1);}
  await page.screenshot({path:`outputs/terrain/v001/mobile-${width}.png`});check(`${width}×${height}触屏布局完整且无滚动`);
 }
 await page.getByTestId('terrain-overview').tap();await expect(stick).toHaveCount(0);const overview=await position();await page.getByTestId('terrain-overview').tap();expect(await position()).toEqual(overview);await expect(stick).toBeVisible();check('手机高空切换保持位置且隐藏行走控件');
 const b=await stick.boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await touch('touchMove',b.x+b.width/2,b.y+b.height*.8);await page.waitForTimeout(250);
 await page.setViewportSize({width:390,height:844});await expect(page.getByTestId('world-rotate')).toBeVisible();const stopped=await position();await page.waitForTimeout(400);expect(await position()).toEqual(stopped);await touch('touchEnd');
 await page.setViewportSize({width:844,height:390});await resume();await page.waitForTimeout(400);expect(await position()).toEqual(stopped);check('触屏横竖切换清除正在推动的摇杆输入');
 expect(report.errors).toEqual([]);report.passed=true;
} catch(e){report.failure=String(e);await page.screenshot({path:'work/world/terrain-mobile-v001-failure.png'});throw e;}
finally{await writeFile('work/world/terrain-mobile-v001-report.json',JSON.stringify(report,null,2));await browser.close();}
