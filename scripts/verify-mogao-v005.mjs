import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const views={'front':[93,-8,0],'oblique':[113,-14,.55],'near':[93,-28,0]};
const report={passed:false,errors:[],views:{},checks:[]};const b=await chromium.launch({channel:'chrome'});
try{
 for(const [name,position] of Object.entries(views)){
  report.views[name]={};
  for(const [version,port] of [['before',4206],['after',4207]]){
   const p=await b.newPage({viewport:{width:1279,height:925}});p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
   await p.addInitScript(([x,z,yaw])=>sessionStorage.setItem('dunhuang:mogao-preview:v3',JSON.stringify({version:1,position:{x,z},heading:yaw,cameraYaw:yaw,visitedEvents:[]})),position);
   await p.goto(`http://localhost:${port}/#/`);await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.waitForTimeout(600);
   await p.screenshot({path:`work/world/mogao-v005-web-${name}-${version}.png`});const s=await p.evaluate(()=>window.__mogao.inspect());report.views[name][version]={camera:s.camera,position:s.checkpoint.position,stats:s.stats};await p.close();
  }
  expect(report.views[name].before.camera).toEqual(report.views[name].after.camera);console.log(name,'same camera');
 }
 const p=await b.newPage({viewport:{width:1279,height:925}});p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://localhost:4207/?view=steps#/');await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.locator('canvas').click({position:{x:630,y:440}});
 await p.keyboard.down('Shift');await p.keyboard.down('w');await p.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z< -75);await p.keyboard.up('w');await p.keyboard.up('Shift');await expect(p.getByTestId('world-interact')).toBeVisible();await p.getByTestId('world-interact').click();await expect(p.getByTestId('story-subtitle')).toContainText('有一人掉入恒河');await p.keyboard.press('Escape');await expect(p.getByTestId('world-story')).toHaveCount(0);await p.close();
 report.checks.push('identical camera poses in three local views','original central stairs, doorway and story interaction remain operational');expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await b.close();}
await writeFile('work/world/mogao-v005-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
