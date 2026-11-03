import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const report={passed:false,errors:[],views:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
await page.addInitScript(()=>localStorage.setItem('dunhuang:sound-settings:v1',JSON.stringify({version:1,enabled:false,volume:.4})));
async function capture(name){
  await page.screenshot({path:`outputs/terrain/v008/${name}.png`});
  const state=await page.evaluate(()=>window.__terrain.inspect());
  report.views.push({name,caisson:state.terrain.scene.caisson,camera:state.camera,checkpoint:state.checkpoint});
}
try{
  await page.goto('http://localhost:4222/?view=caisson#/');
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});
  if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();
  await page.waitForTimeout(650);
  const state=await page.evaluate(()=>window.__terrain.inspect());
  expect(state.terrain.scene.caisson.asset).toBe('caisson-three-hares/v001/three-hares-caisson.glb');
  expect(state.terrain.scene.caisson.centerPanel.imageWidth).toBe(767);
  expect(state.terrain.scene.caisson.centerPanel.imageHeight).toBe(766);
  expect(state.terrain.scene.caisson.centerPanel.width).toBeCloseTo(4.95,6);
  await capture('caisson-hall-center');
  await page.keyboard.down('a');await page.waitForTimeout(1100);await page.keyboard.up('a');
  await page.waitForFunction(()=>!window.__terrain.inspect().moving);await capture('caisson-hall-offset');
  expect(report.errors).toEqual([]);report.passed=true;
}catch(error){report.failure=String(error);await page.screenshot({path:'work/world/caisson-v001-browser-failure.png'});throw error}
finally{await writeFile('work/world/caisson-v001-browser-report.json',JSON.stringify(report,null,2));await browser.close()}
