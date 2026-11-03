import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const report={passed:false,errors:[],views:{},checks:[]};
const manifest=JSON.parse(await readFile('art-source/world/models/mogao-massing/v003/export-manifest.json','utf8'));
for(const [file,digest] of Object.entries(manifest.protectedAssets))expect(createHash('sha256').update(await readFile(file)).digest('hex')).toBe(digest);
expect(manifest.majorRockGroups).toBe(6);expect(manifest.tower.heightFromPlatform).toBe(45);expect(manifest.tower.ratio).toBe(25);
expect(manifest.boundsBlenderXYZ.max[2]).toBeGreaterThan(55);expect(manifest.boundsBlenderXYZ.max[2]).toBeLessThan(60);
const towerBytes=await readFile('public/assets/world/mogao-massing/v003/tower.glb');
const towerJson=JSON.parse(towerBytes.subarray(20,20+towerBytes.readUInt32LE(12)).toString());
expect(towerJson.nodes.some(n=>n.name?.startsWith('tower-recess-')||n.extras?.constructionOnly)).toBe(false);
async function positions(path){
 const bytes=await readFile(path),jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),bin=20+jsonLength+8;
 return gltf.meshes.flatMap(m=>m.primitives.map(p=>{const a=gltf.accessors[p.attributes.POSITION],v=gltf.bufferViews[a.bufferView],start=bin+(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??12;return Array.from({length:a.count},(_,i)=>[0,4,8].map(offset=>bytes.readFloatLE(start+i*stride+offset)));}));
}
expect(await positions('public/assets/world/mogao-massing/v003/foundation.glb')).toEqual(await positions('public/assets/world/mogao-massing/v002/foundation.glb'));
report.checks.push('previous mountain, source projects, interior, traveler and approved sample hashes unchanged','six authored groups','45m tower above plinth, 25:1 target','tower export excludes construction cutters; foundation vertex positions retained');
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('http://localhost:4212/');await page.waitForFunction(()=>window.__mogaoMassing?.inspect().loaded);
 for(const [view,label] of [['front','正面全景'],['left','左斜侧'],['right','右斜侧'],['back','背面'],['third','人物视角']]){
  await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(300);
  report.views[view]=await page.evaluate(()=>window.__mogaoMassing.inspect());
  await page.screenshot({path:`work/world/mogao-massing-v003-web-${view}.png`});
 }
 expect(report.views.front.towerHeight).toBeCloseTo(45,4);expect(report.views.front.personHeight).toBeCloseTo(1.8,4);
 for(const [view,label] of [['front','正面全景'],['right','右斜侧']]){
  await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(300);
  const beforeCamera=(await page.evaluate(()=>window.__mogaoMassing.inspect())).camera;
  await page.getByRole('button',{name:'查看修改前',exact:true}).click();await page.waitForTimeout(300);
  const state=await page.evaluate(()=>window.__mogaoMassing.inspect());expect(state.compareBefore).toBe(true);expect(state.camera).toEqual(beforeCamera);
  await page.screenshot({path:`work/world/mogao-massing-v003-before-${view}.png`});
  await page.getByRole('button',{name:'查看修改后',exact:true}).click();await page.waitForTimeout(300);
  expect((await page.evaluate(()=>window.__mogaoMassing.inspect())).camera).toEqual(beforeCamera);
 }
 await page.getByRole('button',{name:'隐藏九层楼',exact:true}).click();expect((await page.evaluate(()=>window.__mogaoMassing.inspect())).showTower).toBe(false);
 await page.getByRole('button',{name:'显示九层楼',exact:true}).click();
 await page.getByRole('button',{name:'比例标尺',exact:true}).click();expect((await page.evaluate(()=>window.__mogaoMassing.inspect())).ruler).toBe(true);
 await page.getByRole('button',{name:'比例标尺',exact:true}).click();
 await page.mouse.move(700,400);await page.mouse.down();await page.mouse.move(820,445,{steps:12});await page.mouse.up();await page.mouse.wheel(0,-100);await page.waitForTimeout(300);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 for(const name of ['人物视角','查看修改前','比例标尺'])await expect(page.getByRole('button',{name,exact:true})).toBeInViewport();
 expect(report.errors).toEqual([]);report.checks.push('five actual web views including rear and 1.8m traveler','same camera before/after switching','tower visibility, rulers, orbit and zoom','landscape layout, no resource or runtime errors');report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{await browser.close();}
await writeFile('work/world/mogao-massing-v003-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,errors:report.errors,failure:report.failure}));
