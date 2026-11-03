import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({channel:'chrome'}),report={views:{},errors:[]};
try{
 for(const [version,port] of [['v010',4217],['v011',4218]]){
  const p=await b.newPage({viewport:{width:1279,height:925}});p.on('pageerror',e=>report.errors.push(e.message));
  await p.addInitScript(({version})=>{
   const key='dunhuang:mogao-preview:v'+parseInt(version.substring(1));
   const v=new URLSearchParams(location.search).get('testview');
   const loc=v==='porch'?[122,-61,.3]:v==='stairs'?[122,-48,Math.PI]:[122,-16,0];
   sessionStorage.setItem(key,JSON.stringify({version:1,position:{x:loc[0],z:loc[1]},heading:loc[2],cameraYaw:loc[2],visitedEvents:[]}));
   sessionStorage.setItem('dunhuang:character-cinematics:v1',JSON.stringify({opening:true,hall:true}));
  },{version});
  for(const view of ['porch','stairs','tower']){
   await p.goto(`http://localhost:${port}/?testview=${view}#/`);await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.waitForTimeout(2500);
   report.views[`${version}-${view}`]=await p.evaluate(()=>window.__mogao.inspect());await p.screenshot({path:`work/world/mogao-v011-${version}-${view}.png`});
   if(version==='v011'&&view==='tower'){
    for(let i=0;i<3;i++)await p.keyboard.press('r');await p.waitForTimeout(900);await p.screenshot({path:'work/world/mogao-v011-tower-up.png'});report.views.towerUp=await p.evaluate(()=>window.__mogao.inspect());
   }
  }
  await p.close();
 }
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e);}finally{await b.close();await writeFile('work/world/mogao-v011-views.json',JSON.stringify(report,null,2));}
