import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});const report={errors:[],views:{}};
try{
 for(const view of ['entrance','passage','interior','buddha','door-wall','deer','novice','deer-side','novice-side','overview']){
  const p=await browser.newPage({viewport:{width:1279,height:925}});p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await p.goto(`http://localhost:4216/?view=${view}#/`);await p.waitForFunction(()=>window.__mogao?.inspect().loaded,{},{timeout:30000});await p.waitForTimeout(2900);
  if(view!=='interior')await p.keyboard.press('c');
  if(view==='buddha'){for(let i=0;i<5;i++)await p.getByRole('button',{name:'向上看',exact:true}).click();await p.waitForTimeout(800);}
  await p.screenshot({path:`work/world/mogao-v009-web-${view}.png`});report.views[view]=await p.evaluate(()=>window.__mogao.inspect());await p.close();console.log('captured',view);
 }
}catch(e){report.error=e.stack;process.exitCode=1;}finally{await browser.close();await writeFile('work/world/mogao-v009-views.json',JSON.stringify(report,null,2));}
