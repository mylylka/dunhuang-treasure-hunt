import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const report={passed:false,errors:[],views:{},checks:[]};
const bytes=await readFile('public/assets/world/sandstone-study/v001/sandstone.glb');
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
expect(gltf.materials).toHaveLength(1);expect(gltf.images).toHaveLength(3);
const material=gltf.materials[0];expect(material.normalTexture).toBeTruthy();expect(material.occlusionTexture).toBeTruthy();expect(material.pbrMetallicRoughness.baseColorTexture).toBeTruthy();expect(material.pbrMetallicRoughness.metallicRoughnessTexture).toBeTruthy();
for(const primitive of gltf.meshes.flatMap(m=>m.primitives)){expect(primitive.attributes.TEXCOORD_0).toBeDefined();expect(primitive.attributes.TANGENT).toBeDefined();}
const protectedAssets=JSON.parse(await readFile('work/world/sandstone-study-v001-protected.json','utf8'));
for(const [file,digest] of Object.entries(protectedAssets))expect(createHash('sha256').update(await readFile(file)).digest('hex')).toBe(digest);
report.checks.push('embedded basecolor, normal and shared ORM maps','UVs and tangent data','old mountain, interior and character asset hashes unchanged');
const browser=await chromium.launch({channel:'chrome'});
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await p.goto('http://localhost:4209/');await p.waitForFunction(()=>window.__sandstoneStudy?.inspect().loaded);
 for(const [view,label] of [['oblique','斜侧面'],['front','正面'],['side','侧面'],['near','近看断面'],['third','第三人称']]){
  await p.getByRole('button',{name:label,exact:true}).click();await p.waitForTimeout(300);
  report.views[view]=await p.evaluate(()=>window.__sandstoneStudy.inspect());
  await p.screenshot({path:`work/world/sandstone-study-v001-web-${view}.png`});
 }
 expect(report.views.third.travelerMeasuredHeight).toBeCloseTo(1.8,4);
 await p.getByRole('button',{name:'斜侧面',exact:true}).click();await p.getByRole('button',{name:'查看素模',exact:true}).click();
 await expect(p.getByRole('button',{name:'恢复材质',exact:true})).toHaveAttribute('aria-pressed','true');await p.waitForTimeout(200);await p.screenshot({path:'work/world/sandstone-study-v001-web-clay.png'});
 await p.getByRole('button',{name:'恢复材质',exact:true}).click();await p.getByRole('button',{name:'表面细节：开',exact:true}).click();
 expect((await p.evaluate(()=>window.__sandstoneStudy.inspect())).detail).toBe(false);
 await p.getByRole('button',{name:'表面细节：关',exact:true}).click();
 await p.mouse.move(700,400);await p.mouse.down();await p.mouse.move(850,460,{steps:12});await p.mouse.up();await p.mouse.wheel(0,-150);await p.waitForTimeout(300);
 await p.setViewportSize({width:844,height:390});await p.waitForTimeout(300);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 await expect(p.getByRole('button',{name:'第三人称',exact:true})).toBeInViewport();
 expect(report.errors).toEqual([]);report.checks.push('five actual web viewpoints','1.8m evaluated standing character','clay/detail toggles and orbit controls','landscape small viewport');report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}finally{await browser.close();}
await writeFile('work/world/sandstone-study-v001-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,errors:report.errors,failure:report.failure}));
