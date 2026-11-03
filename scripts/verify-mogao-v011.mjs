import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {PerspectiveCamera,Vector3} from 'three';
import {mogaoCameraSpace} from '../src/world/mogao-camera-v011.ts';
import {mogaoSurfaceHeight} from '../src/world/mogao-rules-v008.ts';
import {clearCameraPosition} from '../src/world/camera.ts';
const report={checks:[],errors:[],walks:[]},prefix='work/world/mogao-v011';
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:1279,height:925},recordVideo:{dir:prefix+'-walk-video',size:{width:1279,height:925}}}),p=await context.newPage();
p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
const inspect=()=>p.evaluate(()=>window.__mogao.inspect()),check=t=>{report.checks.push(t);console.log(t);},space=mogaoCameraSpace();
async function open(view){await p.goto(`http://localhost:4218/?view=${view}#/`);await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.waitForTimeout(2600);}
function validate(s){
 const {x,z}=s.checkpoint.position,y=mogaoSurfaceHeight({x,z}),body=new Vector3(x,y+.65,z),eye=new Vector3(...s.camera.position);
 expect(s.traveler.visible,`hidden traveler at ${z}`).toBe(true);
 expect(space.boxes.some(b=>b.containsPoint(eye)),`camera inside at ${z}`).toBe(false);
 expect(clearCameraPosition(body,eye,space).distanceTo(eye),`occluded body at ${z}`).toBeLessThan(.001);
 const camera=new PerspectiveCamera(49,1279/925,.1,450);camera.position.copy(eye);camera.lookAt(new Vector3(...s.camera.target));camera.updateMatrixWorld();
 for(const h of [.3,1.8]){const q=new Vector3(x,y+h,z).project(camera);expect(Math.abs(q.x)).toBeLessThan(.95);expect(Math.abs(q.y)).toBeLessThan(.95);}
}
async function walk(view,key,finish,run=false){
 await open(view);await p.keyboard.press('c');await p.evaluate(()=>{window.__walkSamples=[];window.__walkTimer=setInterval(()=>window.__walkSamples.push(window.__mogao.inspect()),80);});
 if(run)await p.keyboard.down('Shift');await p.keyboard.down(key);
 await p.waitForFunction(finish,null,{timeout:25000});await p.keyboard.up(key);if(run)await p.keyboard.up('Shift');
 const samples=await p.evaluate(()=>{clearInterval(window.__walkTimer);return window.__walkSamples;});samples.forEach(validate);
 report.walks.push({view,key,run,frames:samples.length,from:samples[0].checkpoint.position,to:samples.at(-1).checkpoint.position});
 await p.screenshot({path:`${prefix}-${view}-${run?'run':'walk'}-end.png`});
}
try{
 await open('road-look');await expect(p.getByTestId('world-location')).toHaveCount(0);await expect(p.locator('.world-direction')).toHaveCount(0);expect(await p.locator('.world-hud').innerText()).not.toContain('莫高窟');
 await p.getByRole('button',{name:'路线',exact:true}).click();await expect(p.getByRole('complementary',{name:'探索路线图'})).toContainText('石窟');expect(await p.locator('.world-hud').innerText()).not.toContain('莫高窟');await p.getByRole('button',{name:'路线',exact:true}).click();
 for(const view of ['start','departure','road-look','approach','steps','entrance']){
  await open(view);await expect(p.getByRole('button',{name:'向上看',exact:true})).toBeVisible();const before=await inspect();
  await p.keyboard.press('r');await p.waitForTimeout(700);const up=await inspect();expect(up.caveLook).toBeCloseTo(.22);expect(up.camera.target[1]).toBeGreaterThan(before.camera.target[1]);expect(up.checkpoint.position).toEqual(before.checkpoint.position);expect(up.camera.position).toEqual(before.camera.position);
  await p.keyboard.press('c');await p.getByRole('button',{name:'向下看',exact:true}).click();await p.waitForTimeout(700);const down=await inspect();expect(down.caveLook).toBeCloseTo(-.22);expect(down.camera.target[1]).toBeLessThan(before.camera.target[1]);
  await p.keyboard.press('c');expect((await inspect()).caveLook).toBe(0);
 }
 check('Global up/down/reset available from first courtyard, music pavilion road, ancient path, stairs and entrance; no fictional-location real-name badges or left card');
 await walk('stairs-down','w',()=>window.__mogao.inspect().checkpoint.position.z> -36);
 await walk('steps','w',()=>window.__mogao.inspect().checkpoint.position.z< -62);
 await walk('stairs-down','w',()=>window.__mogao.inspect().checkpoint.position.z> -36,true);
 check('Continuous ascent, descent and running descent: body visible, no solid penetration or crop in sampled rendered cameras');
 await open('stairs-middle');await p.keyboard.down('q');await p.waitForTimeout(700);await p.keyboard.up('q');await p.waitForTimeout(700);validate(await inspect());await p.screenshot({path:`${prefix}-stairs-side.png`});await p.keyboard.down('e');await p.waitForTimeout(1400);await p.keyboard.up('e');await p.waitForTimeout(700);validate(await inspect());check('Mid-stair left/right orbit retains character visibility');
 await open('porch-left');await p.screenshot({path:`${prefix}-porch-clean.png`});for(let i=0;i<4;i++){await p.keyboard.down(i%2?'e':'q');await p.waitForTimeout(400);await p.keyboard.up(i%2?'e':'q');await p.waitForTimeout(180);await p.screenshot({path:`${prefix}-porch-pan-${i}.png`});}check('Porch inspected while turning; repaired rock/plinth and single stair profile loaded');
 await open('buddha');await p.getByRole('button',{name:'抬头欣赏'}).click();await p.waitForFunction(()=>window.__mogao.inspect().buddhaVoice.playing);await expect(p.getByTestId('buddha-subtitle')).toContainText('当前雕像为游戏中的仿制品');await p.keyboard.press('Space');await expect(p.getByTestId('buddha-subtitle')).toHaveCount(0);await p.keyboard.press('c');
 await open('deer');await p.getByTestId('world-interact').click();await expect(p.getByTestId('world-story')).toBeVisible();await expect(p.getByTestId('story-subtitle')).toContainText('此画名为');await p.keyboard.press('Space');await expect(p.getByTestId('story-subtitle')).toContainText('有一人掉入恒河');check('Indoor look-up narration and Deer introduction/Space remain operational');
 await p.setViewportSize({width:844,height:390});await open('road-look');await expect(p.getByRole('button',{name:'向上看',exact:true})).toBeVisible();await p.getByRole('button',{name:'向上看',exact:true}).click();await p.waitForTimeout(500);
 report.landscape=await p.evaluate(()=>{const c=document.querySelector('.world-camera-controls').getBoundingClientRect(),h=document.querySelector('.world-keyboard-hint').getBoundingClientRect();return {buttons:[c.x,c.y,c.right,c.bottom],hint:[h.x,h.y,h.right,h.bottom],overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};});expect(report.landscape.overflow).toBe(false);expect(report.landscape.buttons[3]).toBeLessThanOrEqual(390);expect(report.landscape.buttons[2]).toBeLessThanOrEqual(844);await p.screenshot({path:`${prefix}-global-look-landscape.png`});
 await p.getByTestId('world-pause').click();const pitch=(await inspect()).caveLook;await p.keyboard.press('r');expect((await inspect()).caveLook).toBe(pitch);await p.getByTestId('world-resume').click();await p.setViewportSize({width:390,height:844});await expect(p.getByTestId('world-rotate')).toBeVisible();check('Landscape controls fit; pause and unsupported portrait lock exploration');
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;await p.screenshot({path:`${prefix}-failure.png`});console.error(e);}finally{const video=p.video();await context.close();await video.saveAs(`${prefix}-walkthrough.webm`);await browser.close();await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));}
