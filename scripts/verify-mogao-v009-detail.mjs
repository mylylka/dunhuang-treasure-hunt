import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'}),report={errors:[],views:{}};
const scenes={'left-junction':[115,-78,1.1,.22],'right-junction':[129,-78,-1.1,.22],'left-aisle':[109,-83,0,0],'right-aisle':[135,-83,0,0],'base':[122,-77.5,0,0],'door-corner':[119,-78,2.8,0]};
try{for(const version of ['v008','v009'])for(const [name,[x,z,yaw,pitch]]of Object.entries(scenes)){
 const p=await browser.newPage({viewport:{width:1279,height:925}});p.on('pageerror',e=>report.errors.push(e.message));
 await p.addInitScript(({key,x,z,yaw})=>{sessionStorage.setItem(key,JSON.stringify({version:1,position:{x,z},heading:0,cameraYaw:yaw,visitedEvents:[]}));sessionStorage.setItem('dunhuang:character-cinematics:v1',JSON.stringify({opening:true,hall:true}));},{key:`dunhuang:mogao-preview:v${version==='v008'?8:9}`,x,z,yaw});
 await p.goto(`http://localhost:${version==='v008'?4215:4216}/#/`);await p.waitForFunction(()=>window.__mogao?.inspect().loaded,{},{timeout:30000});await p.waitForTimeout(2500);
 if(version==='v009')await p.keyboard.press('c');if(pitch)await p.getByRole('button',{name:'向上看',exact:true}).click();await p.waitForTimeout(1000);
 await p.screenshot({path:`work/world/mogao-${version}-detail-${name}.png`});report.views[`${version}-${name}`]=await p.evaluate(()=>window.__mogao.inspect());await p.close();console.log(version,name);
}}catch(e){report.error=e.stack;process.exitCode=1;}finally{await browser.close();await writeFile('work/world/mogao-v009-detail.json',JSON.stringify(report,null,2));}
