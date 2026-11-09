import { chromium } from '@playwright/test';
import { TERRAIN_SESSION_KEY } from '../src/content/world/terrain-layout-v001.ts';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});
await page.addInitScript(key=>{const pending=sessionStorage.getItem('decoration-run');if(pending){sessionStorage.setItem(key,pending);sessionStorage.removeItem('decoration-run')}},TERRAIN_SESSION_KEY);
async function ready(){await page.waitForFunction(()=>window.__terrain?.inspect().loaded,null,{timeout:90000});if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();await page.waitForTimeout(600)}
try{
 await page.goto('http://localhost:4222/?view=start#/');await ready();
 for(const [id,x,z,tx,tz] of [['o25',128,19,136.5,22],['o26',151,34,163,43]]){
  const yaw=Math.atan2(-(tx-x),-(tz-z));
  await page.evaluate(({x,z,yaw})=>sessionStorage.setItem('decoration-run',JSON.stringify({version:1,position:{x,z},heading:yaw,cameraYaw:yaw,visitedEvents:[]})),{x,z,yaw});
  await page.reload();await ready();await page.addStyleTag({content:'.world-hud{visibility:hidden!important}'});
  await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForTimeout(450);
  const snapshot=await page.evaluate(()=>window.__terrain.inspect());
  await page.screenshot({path:`outputs/world-decoration-reference/v001/original/${id}.png`});
  await page.keyboard.up('w');await page.keyboard.up('Shift');console.log(id,JSON.stringify({moving:snapshot.moving,position:snapshot.checkpoint.position}));
 }
}finally{await browser.close()}
