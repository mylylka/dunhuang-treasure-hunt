import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

// One hall, one browser, a short up-look/yaw/strafe sweep. No gameplay suite.
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:1279,height:925}});
const page=await context.newPage(),report={passed:false,errors:[],views:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`)});
await page.addInitScript(()=>localStorage.setItem('dunhuang:sound-settings:v1',JSON.stringify({version:1,enabled:false,volume:.4})));
async function capture(name){
  await page.screenshot({path:`work/world/caisson-v002-${name}.png`});
  const state=await page.evaluate(()=>window.__terrain.inspect());
  report.views.push({name,camera:state.camera,checkpoint:state.checkpoint});
}
async function hold(key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key)}
try{
  await page.goto('http://localhost:4222/?view=caisson#/');
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});
  if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();
  await page.waitForTimeout(650);
  report.caisson=(await page.evaluate(()=>window.__terrain.inspect())).terrain.scene.caisson;
  expect(report.caisson.asset).toBe('caisson-three-hares/v002/three-hares-caisson.glb');
  await page.evaluate(()=>{
    const stream=document.querySelector('canvas').captureStream(20),chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
    recorder.ondataavailable=e=>chunks.push(e.data);
    window.__caissonMotion={recorder,chunks,stream};recorder.start();
  });
  await capture('center');
  await hold('r',550);await capture('up');
  await page.keyboard.down('q');
  for(let i=0;i<3;i++){await page.waitForTimeout(350);await capture(`turn-${i}`)}
  await page.keyboard.up('q');
  await page.keyboard.down('a');
  for(let i=0;i<3;i++){await page.waitForTimeout(300);await capture(`side-${i}`)}
  await page.keyboard.up('a');
  await page.waitForTimeout(500);await capture('settled');
  expect(report.errors).toEqual([]);
  expect(report.views.at(-1).camera.position).not.toEqual(report.views[0].camera.position);
  const video=await page.evaluate(()=>new Promise(resolve=>{
    const {recorder,chunks,stream}=window.__caissonMotion;
    recorder.onstop=async()=>{stream.getTracks().forEach(track=>track.stop());resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())))};
    recorder.stop();
  }));
  report.video='work/world/caisson-v002-motion.webm';await writeFile(report.video,Buffer.from(video));
  report.passed=true;
}catch(error){report.failure=String(error);throw error}
finally{
  await context.close();
  await writeFile('work/world/caisson-v002-motion-report.json',JSON.stringify(report,null,2));
  await browser.close();
}
