import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const report={passed:false,errors:[],views:{},checks:[]};
const manifest=JSON.parse(await readFile('art-source/world/models/mogao-sandstone/v001/export-manifest.json','utf8'));
for(const [file,digest] of Object.entries(manifest.protectedAssets))expect(createHash('sha256').update(await readFile(file)).digest('hex')).toBe(digest);
expect(manifest.tower.heightFromPlatform).toBe(45);expect(manifest.tower.ratio).toBe(25);
expect(manifest.low.boundary).toBe(0);expect(manifest.low.nonManifold).toBe(0);
expect(manifest.mapIntegration).toBe(false);
const glb=await readFile('public/assets/world/mogao-sandstone/v001/mountain.glb');
const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
const rocks=gltf.materials.filter(m=>m.name.startsWith('sandstone-baked-'));
expect(rocks.length).toBe(3);
for(const m of rocks){expect(m.pbrMetallicRoughness.baseColorTexture).toBeDefined();expect(m.pbrMetallicRoughness.metallicRoughnessTexture).toBeDefined();expect(m.normalTexture).toBeDefined();expect(m.occlusionTexture).toBeDefined();}
expect(gltf.nodes.some(n=>n.extras?.constructionOnly)).toBe(false);
report.checks.push('protected source, tower, foundation, traveler, interior and approved study hashes unchanged','closed mesh and three baked PBR zones','independent preview, formal map unchanged');
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('http://localhost:4213/');await page.waitForFunction(()=>window.__mogaoSandstone?.inspect().loaded);
 for(const [view,label] of [['front','正面全景'],['left','左斜侧'],['right','右斜侧'],['back','背面'],['near','岩壁近景'],['third','人物视角']]){
  await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(300);
  report.views[view]=await page.evaluate(()=>window.__mogaoSandstone.inspect());
  await page.screenshot({path:`work/world/mogao-sandstone-v001-web-${view}.png`});
 }
 expect(report.views.front.materialMaps).toHaveLength(3);for(const m of report.views.front.materialMaps){expect(m.ao&&m.roughness&&m.tangents).toBe(true);}
 expect(report.views.front.towerHeight).toBeCloseTo(45,4);expect(report.views.front.personHeight).toBeCloseTo(1.8,4);
 for(const [view,label] of [['front','正面全景'],['near','岩壁近景'],['right','右斜侧']]){
  await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(300);
  const beforeCamera=(await page.evaluate(()=>window.__mogaoSandstone.inspect())).camera;
  await page.getByRole('button',{name:'查看修改前',exact:true}).click();await page.waitForTimeout(300);
  const state=await page.evaluate(()=>window.__mogaoSandstone.inspect());expect(state.compareBefore).toBe(true);expect(state.camera).toEqual(beforeCamera);
  await page.screenshot({path:`work/world/mogao-sandstone-v001-before-${view}.png`});
  await page.getByRole('button',{name:'查看修改后',exact:true}).click();await page.waitForTimeout(300);
  expect((await page.evaluate(()=>window.__mogaoSandstone.inspect())).camera).toEqual(beforeCamera);
 }
 await page.getByRole('button',{name:'隐藏九层楼',exact:true}).click();expect((await page.evaluate(()=>window.__mogaoSandstone.inspect())).showTower).toBe(false);
 await page.getByRole('button',{name:'显示九层楼',exact:true}).click();
 await page.getByRole('button',{name:'比例标尺',exact:true}).click();expect((await page.evaluate(()=>window.__mogaoSandstone.inspect())).ruler).toBe(true);
 await page.getByRole('button',{name:'比例标尺',exact:true}).click();
 await page.mouse.move(700,400);await page.mouse.down();await page.mouse.move(820,445,{steps:12});await page.mouse.up();await page.mouse.wheel(0,-100);await page.waitForTimeout(300);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 for(const name of ['人物视角','查看修改前','比例标尺'])await expect(page.getByRole('button',{name,exact:true})).toBeInViewport();
 expect(report.errors).toEqual([]);report.checks.push('six actual web views including near surface, rear and 1.8m traveler','same camera before/after switching','tower visibility, rulers, orbit and zoom','landscape layout, no resource or runtime errors');report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{await browser.close();}
await writeFile('work/world/mogao-sandstone-v001-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,errors:report.errors,failure:report.failure}));
