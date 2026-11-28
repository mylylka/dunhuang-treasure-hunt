import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium, devices } from 'playwright';
import { LAKE_ORIGIN, TERRAIN_ROUTES } from '../src/content/world/terrain-layout-v001.ts';
import { FIRST_GALLERY_WORLD_SESSION_KEY } from '../src/services/first-gallery-entry.ts';

const browser=await chromium.launch({channel:'chrome',args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({...devices['iPhone 13 landscape'],viewport:{width:844,height:390},serviceWorkers:'block'});
  page.on('console',msg=>{if(msg.text().startsWith('ridge-profile '))console.log(msg.text());});
  const crest=TERRAIN_ROUTES[0].points.reduce((a,b)=>a.y>b.y?a:b), yaw=Math.atan2(crest.x-LAKE_ORIGIN.x,crest.z-LAKE_ORIGIN.z);
  await page.addInitScript(({crest,yaw,key})=>{
    localStorage.setItem('dunhuang:traveler-selection:v1','classic');
    sessionStorage.setItem(key,JSON.stringify({version:1,position:{x:crest.x,z:crest.z},heading:yaw,cameraYaw:yaw,visitedEvents:[]}));
    window.__THREE_DEVTOOLS__=new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe',({detail:r})=>{
      if (!r.isWebGLRenderer) return;
      const render=r.render.bind(r);
      r.render=(scene,camera)=>{
        if (camera.isPerspectiveCamera && scene.isScene && scene.getObjectByName('desert-oasis-v013')) {
          window.profileScene??={scene,camera,renderer:r,render};
          if(window.profileScene.frozen) return;
        }
        return render(scene,camera);
      };
    });
  },{crest,yaw,key:FIRST_GALLERY_WORLD_SESSION_KEY});
  await page.goto(process.env.DUNHUANG_DESERT_ORIGIN??'http://127.0.0.1:5174/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__terrain?.inspect().loaded && window.profileScene,undefined,{timeout:100000});
  const result=await page.evaluate(async()=>{
    const {scene,camera,renderer,render}=window.profileScene;
    const gl=renderer.getContext();
    const route=window.__terrain.inspect().desertOasis.route;
    const recorded=[];
    scene.getObjectByName('oasis-ridge-v014').traverse(o=>{
      if(o.isMesh)recorded.push({o,visible:o.visible,material:o.material,road:o.name.startsWith('oasis-ridge-original:')});
    });
    const cameraCopy=camera.clone();cameraCopy.updateMatrixWorld();
    const modUrl=performance.getEntriesByType('resource').find(e=>/\/three\.js\??/.test(e.name))?.name;
    const THREE=await import(modUrl??'/node_modules/three/build/three.module.js');
    const simple=new Map(),lambert=new Map();
    for(const {material:m} of recorded){
      if(!simple.has(m)){
        const opts={color:m.color,vertexColors:m.vertexColors,map:m.map,side:m.side,alphaTest:m.alphaTest};
        simple.set(m,new THREE.MeshBasicMaterial(opts)); lambert.set(m,new THREE.MeshLambertMaterial(opts));
      }
    }
    const wait=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    const shots={};
    function pixels(){
      const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight, all=new Uint8Array(w*h*4);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,all);
      return all;
    }
    window.profileScene.frozen=true;
    const modes=['all','hide-original','hide-volume','hide-both','basic','lambert','shore-lambert','road-lambert','all-again'];
    const runs=[];
    function quantile(values,frac){return values.toSorted((a,b)=>a-b)[Math.floor(values.length*frac)];}
    for(const mode of modes){
      for(const {o,visible,material,road} of recorded) {
        o.visible=visible && mode!=='hide-both' && !(road&&mode==='hide-original') && !(!road&&mode==='hide-volume');
        const useLambert=mode==='lambert'||(road&&mode==='road-lambert')||(!road&&mode==='shore-lambert');
        o.material=mode==='basic'?simple.get(material):useLambert?lambert.get(material):material;
      }
      // Run a complete main pass before warming up so shader compilation is outside the measured window.
      render(scene,cameraCopy); gl.finish();
      const warm=performance.now();
      do { await wait(); render(scene,cameraCopy); } while(performance.now()-warm<450);
      const frames=[], submits=[], begin=performance.now();
      let previous=await wait();
      do {
        const submit=performance.now(); render(scene,cameraCopy); submits.push(performance.now()-submit);
        const now=await wait(); frames.push(now-previous); previous=now;
      }while(performance.now()-begin<2800 || frames.length<12);
      const info={...renderer.info.render};
      if(['all','hide-both','basic','lambert'].includes(mode)){render(scene,cameraCopy);shots[mode]=pixels();}
      const row={mode,n:frames.length,p50:quantile(frames,.5),p95:quantile(frames,.95),p99:quantile(frames,.99),
        cpuSubmitP50:quantile(submits,.5),cpuSubmitP95:quantile(submits,.95),draws:info.calls,triangles:info.triangles};
      runs.push(row); console.log('ridge-profile '+JSON.stringify(row));
    }
    // The mask comes from the same camera with both tested layers disabled.
    const a=shots.all,base=shots['hide-both'],comparisons={};
    for(const mode of ['basic','lambert']){
      let n=0,error=0,brighter=0;
      for(let i=0;i<a.length;i+=4){
        const d=Math.abs(a[i]-base[i])+Math.abs(a[i+1]-base[i+1])+Math.abs(a[i+2]-base[i+2]);
        if(d<35)continue;
        const m=shots[mode];
        n++;error+=Math.abs(m[i]-a[i])+Math.abs(m[i+1]-a[i+1])+Math.abs(m[i+2]-a[i+2]);
        brighter+=Number((m[i]+m[i+1]+m[i+2])-(a[i]+a[i+1]+a[i+2])>30);
      }
      comparisons[mode]={pixels:n,meanAbsoluteChannelDiff:error/(3*n),fractionBrighterBy10:brighter/n};
    }
    window.profileScene.frozen=false;
    for(const {o,visible,material} of recorded){o.visible=visible;o.material=material;}
    for(const m of [...simple.values(),...lambert.values()])m.dispose();
    return {route, viewport:[gl.drawingBufferWidth,gl.drawingBufferHeight],runs,comparisons};
  });
  assert(result.runs.every(r=>r.n>=12));
  await writeFile('work/qa/desert-oasis-v013/ridge-fixed-camera-profile.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}finally{await browser.close();}
