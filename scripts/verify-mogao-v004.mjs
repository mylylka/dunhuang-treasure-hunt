import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const L=JSON.parse(await readFile('src/content/world/mogao-layout-v003.json','utf8'));
const views={overview:L.views.overview,approach:L.views.approach,'foot-left':[93,-32,-.15],'foot-right':[158,-36,.24]};
const report={passed:false,errors:[],views:{},checks:[]};
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const [name,position] of Object.entries(views)){
  report.views[name]={};
  for(const [version,port] of [['before',4205],['after',4206]]){
   const p=await browser.newPage({viewport:{width:1279,height:925}});p.on('pageerror',e=>report.errors.push(e.message));
   await p.addInitScript(([x,z,yaw])=>sessionStorage.setItem('dunhuang:mogao-preview:v3',JSON.stringify({version:1,position:{x,z},heading:yaw,cameraYaw:yaw,visitedEvents:[]})),position);
   await p.goto(`http://localhost:${port}/#/`);await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.waitForTimeout(600);
   await p.screenshot({path:`work/world/mogao-v004-${name}-${version}.png`});const s=await p.evaluate(()=>window.__mogao.inspect());report.views[name][version]={camera:s.camera,position:s.checkpoint.position,stats:s.stats};
   expect(s.checkpoint.position).toEqual({x:position[0],z:position[1]});await p.close();
  }
  expect(report.views[name].after.camera).toEqual(report.views[name].before.camera);console.log(name,'same camera');
 }
 const p=await browser.newPage({viewport:{width:1279,height:925}});p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://localhost:4206/?view=steps#/');await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.locator('canvas').click({position:{x:630,y:440}});
 await p.keyboard.down('Shift');await p.keyboard.down('w');await p.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z< -75);await p.keyboard.up('w');await p.keyboard.up('Shift');await expect(p.getByTestId('world-interact')).toBeVisible();
 await p.screenshot({path:'work/world/mogao-v004-arrival.png'});await p.getByTestId('world-interact').click();await expect(p.getByTestId('story-subtitle')).toContainText('有一人掉入恒河');await p.keyboard.press('Escape');await expect(p.getByTestId('world-story')).toHaveCount(0);await p.close();
 report.checks.push('identical before/after camera poses in four exterior views','central stairs and entry remain traversable; original interior and story still work');expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{await browser.close();}
await writeFile('work/world/mogao-v004-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
