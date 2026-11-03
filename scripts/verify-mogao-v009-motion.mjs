import {chromium,expect} from '@playwright/test';
import {writeFile,copyFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'}),report={errors:[],views:{}};
try{for(const [name,x,z,yaw]of [['left',109,-83,0],['right',135,-83,0],['door',122,-78,Math.PI]]){
 const c=await browser.newContext({viewport:{width:1279,height:925},recordVideo:{dir:'work/world/mogao-v009-motion',size:{width:1279,height:925}}});const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await p.addInitScript(({x,z,yaw})=>sessionStorage.setItem('dunhuang:mogao-preview:v9',JSON.stringify({version:1,position:{x,z},heading:yaw,cameraYaw:yaw,visitedEvents:[]})),{x,z,yaw});
 await p.goto('http://localhost:4216/#/');await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.waitForTimeout(2500);await p.keyboard.press('c');await p.waitForTimeout(500);
 await p.screenshot({path:`work/world/mogao-v009-motion-${name}-start.png`});
 await p.keyboard.down('w');await p.waitForTimeout(name==='door'?700:1600);await p.keyboard.up('w');await p.waitForTimeout(300);
 for(const key of ['q','e']){await p.keyboard.down(key);await p.waitForTimeout(650);await p.keyboard.up(key);await p.waitForTimeout(300);await p.screenshot({path:`work/world/mogao-v009-motion-${name}-${key}.png`});}
 report.views[name]=await p.evaluate(()=>window.__mogao.inspect());await c.close();await copyFile(await p.video().path(),`work/world/mogao-v009-motion-${name}.webm`);console.log('motion',name);
}
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();await writeFile('work/world/mogao-v009-motion.json',JSON.stringify(report,null,2));}
