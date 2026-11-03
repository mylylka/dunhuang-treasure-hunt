import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'}),report={views:{},errors:[]};
try{
 for(const [version,port] of [['v009',4216],['v010',4217]]){
  const context=await browser.newContext({viewport:{width:1279,height:925},recordVideo:{dir:`work/world/mogao-v010-seam-video-${version}`,size:{width:1279,height:925}}});const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(`http://localhost:${port}/?view=door-wall#/`);await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.waitForTimeout(2600);await p.keyboard.press('c');await p.keyboard.press('r');await p.keyboard.press('r');await p.waitForTimeout(800);
  report.views[version]=await p.evaluate(()=>window.__mogao.inspect().camera);await p.screenshot({path:`work/world/mogao-v010-seam-${version==='v009'?'before':'after'}.png`});
  for(let i=0;i<3;i++){await p.keyboard.down('q');await p.waitForTimeout(280);await p.keyboard.up('q');await p.waitForTimeout(150);await p.screenshot({path:`work/world/mogao-v010-seam-${version}-left-${i}.png`});await p.keyboard.down('e');await p.waitForTimeout(280);await p.keyboard.up('e');await p.waitForTimeout(150);}
  const video=p.video();await context.close();await video.saveAs(`work/world/mogao-v010-seam-${version}.webm`);
 }
 for(const property of ['position','target'])report.views.v010[property].forEach((x,i)=>expect(x).toBeCloseTo(report.views.v009[property][i],2));
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e);}finally{await browser.close();await writeFile('work/world/mogao-v010-seam-verification.json',JSON.stringify(report,null,2));}
