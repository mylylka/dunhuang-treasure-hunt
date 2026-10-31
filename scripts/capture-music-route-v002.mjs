import {chromium,expect} from '@playwright/test';
import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';

const server=await createServer({server:{middlewareMode:true}});
const {COURTYARD_ROAD}=await server.ssrLoadModule('/src/world/road.ts');
const {MUSIC_ROAD_V2}=await server.ssrLoadModule('/src/world/music-pavilion-rules-v002.ts');
await server.close();
const junction=COURTYARD_ROAD.findIndex(p=>Math.abs(p.center.x)<.001&&Math.abs(p.center.z-12)<.001);
const full=[...COURTYARD_ROAD.slice(junction).filter(p=>p.center.z>=0).reverse(),...MUSIC_ROAD_V2.slice(1)].map(p=>p.center);
const route=[];let accumulated=0;
for(let i=1;i<full.length;i++){accumulated+=Math.hypot(full[i].x-full[i-1].x,full[i].z-full[i-1].z);if(accumulated>=2.8){route.push(full[i]);accumulated=0;}}
route.push(full.at(-1));
const prefix='work/world/music-pavilion-v002',report={passed:false,errors:[],samples:[],screens:[]};
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1279,height:925}});
page.on('pageerror',e=>report.errors.push(e.message));
const state=()=>page.evaluate(()=>window.__musicPavilion.inspect());
async function photo(name,s){const path=`${prefix}-${name}.png`;await page.screenshot({path});report.screens.push({name,path,state:s??await state()});}
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
try{
  await page.goto('http://localhost:4195/?view=courtyard');await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
  await page.locator('canvas[data-world-canvas]').click();await page.waitForFunction(()=>window.__musicPavilion.recordingAudio());
  await page.evaluate(()=>{
    const stream=document.querySelector('canvas[data-world-canvas]').captureStream(24);
    for(const track of window.__musicPavilion.recordingAudio().getAudioTracks())stream.addTrack(track.clone());
    window.__chunks=[];window.__recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus'});
    window.__recorder.ondataavailable=e=>{if(e.data.size)window.__chunks.push(e.data);};window.__recorder.start();
  });
  await photo('route-departure');const started=Date.now();let gateTime=null,lastSample=0,nextPhoto=0;
  await page.keyboard.down('w');
  for(const target of route){
    const current=await state(),p=current.checkpoint.position;
    let delta=angle(Math.atan2(-(target.x-p.x),-(target.z-p.z))-current.checkpoint.cameraYaw);
    while(Math.abs(delta)>.0001){const step=Math.max(-1.8,Math.min(1.8,delta));await page.mouse.move(640,460);await page.mouse.down({button:'right'});await page.mouse.move(640-step/.004,460);await page.mouse.up({button:'right'});delta-=step;}
    const leg=Date.now(),legVector={x:target.x-p.x,z:target.z-p.z};
    while(true){
      const s=await state(),p=s.checkpoint.position,now=Date.now();
      if(gateTime===null&&p.z>=2&&p.x< -10)gateTime=now;
      if(now-lastSample>180){
        const elapsed=gateTime?(now-gateTime)/1000:0;
        report.samples.push({elapsed,position:p,yaw:s.checkpoint.cameraYaw,sound:s.musicAudio,visible:s.landmarkSight.filter(i=>i.inFrame&&!i.blocked).length});lastSample=now;
        if(gateTime&&elapsed>=nextPhoto){await photo(`route-${String(nextPhoto).padStart(2,'0')}s`,s);nextPhoto+=5;}
        if(gateTime&&!report.firstSound&&s.musicAudio.playing&&s.musicAudio.gain>=.02){report.firstSound={elapsed,position:p,gain:s.musicAudio.gain};await photo('route-first-sound',s);}
        if(gateTime&&!report.firstSight&&s.landmarkSight.filter(i=>i.inFrame&&!i.blocked).length>=1){report.firstSight={elapsed,position:p};await photo('route-first-sight',s);}
      }
      const remaining=Math.hypot(p.x-target.x,p.z-target.z);
      const passed=(p.x-target.x)*legVector.x+(p.z-target.z)*legVector.z>=0;
      if(remaining<.55||(passed&&remaining<1.1))break;
      if(now-leg>6000)throw new Error(`Cannot reach ${JSON.stringify(target)} from ${JSON.stringify(p)}`);
      await page.waitForTimeout(45);
    }
  }
  await page.keyboard.up('w');report.gateSeconds=(Date.now()-gateTime)/1000;report.totalSeconds=(Date.now()-started)/1000;
  await photo('route-arrival');
  const bytes=await page.evaluate(()=>new Promise(resolve=>{window.__recorder.onstop=async()=>{resolve(Array.from(new Uint8Array(await new Blob(window.__chunks).arrayBuffer())));window.__recorder.stream.getTracks().forEach(t=>t.stop());};window.__recorder.stop();}));
  await writeFile(`${prefix}-route-with-audio.webm`,Buffer.from(bytes));
  expect(report.errors).toEqual([]);expect(report.gateSeconds).toBeGreaterThanOrEqual(35);expect(report.gateSeconds).toBeLessThanOrEqual(45);
  expect(report.firstSound).toBeTruthy();expect(report.firstSight).toBeTruthy();expect(report.firstSight.elapsed-report.firstSound.elapsed).toBeGreaterThanOrEqual(5);
  report.passed=true;
}catch(error){report.failure=error.message;console.error(error.message);process.exitCode=1;}
finally{await writeFile(`${prefix}-route-check.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,gateSeconds:report.gateSeconds,firstSound:report.firstSound,firstSight:report.firstSight,errors:report.errors}));await browser.close();}
