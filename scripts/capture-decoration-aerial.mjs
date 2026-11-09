import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import {toTerrainPoint} from '../src/content/world/terrain-layout-v001.ts';

// Inject a photographer-only camera into Vite's in-memory transform. The
// committed game source, assets and the user's running 4222 preview stay intact.
const plugin={name:'decoration-photo-camera',enforce:'pre',transform(code,id){
 if(!id.includes('/src/world/runtime.ts'))return;
 const needle='    camera.lookAt(visualTarget);';
 if(!code.includes(needle))throw new Error('camera integration point not found');
 return {code:code.replace(needle,`    if ((window as any).__decorationPose) { const pose=(window as any).__decorationPose; camera.position.set(...pose.position); visualTarget.set(...pose.target); if(pose.fov && camera.fov!==pose.fov){camera.fov=pose.fov;camera.updateProjectionMatrix();} }\n${needle}`),map:null};
}};
const server=await createServer({configFile:'vite.config.ts',plugins:[plugin],server:{host:'127.0.0.1',port:0,strictPort:false}});
let browser;
try{
 await server.listen();const address=server.httpServer.address();
 browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});
 await page.goto(`http://127.0.0.1:${address.port}/terrain-v009.html?view=start#/`);
 await page.waitForFunction(()=>window.__terrain?.inspect().loaded,null,{timeout:90000});
 if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();
 await page.addStyleTag({content:'.world-hud{visibility:hidden!important}'});
 const center=toTerrainPoint('courtyard',{x:-12,z:-11});
 const poses=[
  {id:'g02',position:[244,210,-250],target:[244,17,30],fov:45},
  {id:'g03',position:[244,400,30.1],target:[244,12,30],fov:45},
  {id:'c17',position:[center.x,center.y+72,center.z+.1],target:[center.x,center.y,center.z],fov:30}
 ];
 for(const pose of poses){await page.evaluate(p=>window.__decorationPose=p,pose);await page.waitForTimeout(1000);await page.screenshot({path:`outputs/world-decoration-reference/v001/original/${pose.id}.png`});console.log(pose.id)}
}finally{if(browser)await browser.close();await server.close()}
