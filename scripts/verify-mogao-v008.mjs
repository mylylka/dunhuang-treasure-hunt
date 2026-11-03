import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const report={checks:[],errors:[],audio:[],layouts:[]},prefix='work/world/mogao-v008';
const novice=JSON.parse(await readFile('src/content/world/novice-story-v001.json','utf8'));
const browser=await chromium.launch({channel:'chrome'});
const p=await browser.newPage({viewport:{width:1279,height:925}});
p.on('pageerror',e=>report.errors.push(e.message));
p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
const check=s=>{report.checks.push(s);console.log(s);};
async function open(view){await p.goto(`http://localhost:4215/?view=${view}#/`);await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.waitForTimeout(400);}
async function phase(index,name='narration'){await expect(p.getByTestId('world-story-step')).toHaveAttribute('data-index',String(index));await expect(p.getByTestId('world-story')).toHaveAttribute('data-phase',name);}
async function speaking(index,name='narration'){await phase(index,name);await p.waitForFunction(()=>document.querySelector('[data-testid="story-audio"]').currentTime>.25);}
async function layout(){
 const data=await p.evaluate(()=>{const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom};};return {viewport:[innerWidth,innerHeight],caption:rect(document.querySelector('[data-testid="story-subtitle"]')),images:[...document.querySelectorAll('[data-testid="story-detail"]')].map(e=>({...rect(e),ratio:e.naturalWidth/e.naturalHeight})),controls:[...document.querySelectorAll('.deer-story-toolbar button')].map(rect),scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};});
 expect(data.scroll).toBe(false);expect(data.caption.bottom).toBeLessThanOrEqual(data.viewport[1]);
 for(const r of [...data.controls,...data.images]){expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.right).toBeLessThanOrEqual(data.viewport[0]+1);expect(r.bottom).toBeLessThan(data.caption.y+1);}
 for(const r of data.images)expect(r.w/r.h).toBeCloseTo(r.ratio,2);report.layouts.push(data);
}
async function skipEnd(){for(let i=0;i<8;i++){if(await p.getByTestId('world-culture-choice').count())return;await p.waitForFunction(()=>!['return','overview'].includes(document.querySelector('[data-testid="world-story"]').dataset.phase));await p.keyboard.press('Space');await p.waitForTimeout(300);}await expect(p.getByTestId('world-culture-choice')).toBeVisible();}
try{
 await open('steps');await p.locator('canvas').click();await p.keyboard.down('Shift');await p.keyboard.down('w');await p.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z< -79);await p.keyboard.up('w');await p.keyboard.up('Shift');await p.waitForTimeout(700);
 expect((await p.evaluate(()=>window.__mogao.inspect())).location).toContain('大佛殿');check('Walked real stairs and tunnel into compact hall');
 for(let i=0;i<5;i++)await p.getByRole('button',{name:'向上看',exact:true}).click();await p.waitForTimeout(700);await p.screenshot({path:`${prefix}-web-vault.png`});expect((await p.evaluate(()=>window.__mogao.inspect())).caveLook).toBeGreaterThan(1);
 await p.getByRole('button',{name:'恢复平视',exact:true}).click();await p.locator('canvas').click();await p.keyboard.down('Shift');await p.keyboard.down('s');await p.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z> -38);await p.keyboard.up('s');await p.keyboard.up('Shift');check('Look-up controls and reverse exit path work');
 for(const [view,key,id] of [['deer','d','story-demo'],['novice','a','novice-story']]){
  await open(view);await p.locator('canvas').click();await p.keyboard.down(key);await p.waitForFunction(()=>window.__mogao.inspect().checkpoint.position.z< -87);await p.keyboard.up(key);expect((await p.evaluate(()=>window.__mogao.inspect())).nearby).toBe(id);
 }check('Both narrow side viewing aisles remain reachable');
 await open('novice');await p.getByTestId('world-interact').click();await speaking(0,'introduction');await expect(p.getByTestId('story-subtitle')).toHaveText(novice.introduction.text+'（空格跳过）');
 const bg=await p.locator('.deer-story-atmosphere').evaluate(e=>e.style.backgroundImage);expect(bg.length).toBeGreaterThan(10000);await p.screenshot({path:`${prefix}-novice-introduction.png`});
 await p.evaluate(()=>{window.__ended=[];document.addEventListener('ended',e=>{if(e.target instanceof HTMLAudioElement)window.__ended.push({url:e.target.currentSrc,time:e.target.currentTime,duration:e.target.duration});},true);});
  // The unskipped introduction lasts 8.1 seconds before episode one's transitions.
  await p.waitForFunction(()=>document.querySelector('[data-testid="world-story"]').dataset.phase!=='introduction',null,{timeout:12000});
 for(let i=0;i<5;i++){
  await speaking(i);await expect(p.getByTestId('story-subtitle')).toHaveText(novice.segments[i].text+'（空格跳过）');await layout();await p.screenshot({path:`${prefix}-novice-episode-${i+1}.png`});
  console.log('natural narration',i+1);await p.waitForFunction(i=>document.querySelector('[data-testid="world-story-step"]').dataset.index!==String(i),i,{timeout:40000});
 }
 await speaking(5,'invitation');await expect(p.getByTestId('world-culture-choice')).toBeVisible({timeout:10000});await expect(p.getByTestId('story-subtitle')).toHaveCount(0);report.audio=await p.evaluate(()=>window.__ended);expect(report.audio).toHaveLength(7);for(const a of report.audio)expect(a.time).toBeGreaterThanOrEqual(a.duration-.1);check('Opening, five complete paragraphs and ending each finish on real audio ended events');
 await p.getByTestId('world-choice-replay').click();await speaking(0,'introduction');await p.keyboard.press('Space');await speaking(0);
 await p.getByTestId('world-story').getByRole('button',{name:'暂停',exact:true}).click();const time=await p.getByTestId('story-audio').evaluate(a=>a.currentTime);await p.waitForTimeout(450);expect(await p.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeCloseTo(time,2);await p.getByRole('button',{name:'继续播放',exact:true}).click();
 await p.getByRole('button',{name:'重播',exact:true}).click();await speaking(0);expect(await p.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeLessThan(1.5);await p.keyboard.press('Space');await speaking(1);check('Replay, pause/resume and Space skip retain paragraph/audio alignment');
 await skipEnd();await p.getByTestId('world-choice-roam').click();await expect(p.getByTestId('world-story')).toHaveCount(0);await p.getByTestId('world-interact').click();await skipEnd();await p.getByTestId('world-enter-theme').click();await expect(p).toHaveURL(/#\/theme\/stories/);await expect(p.getByTestId('story-audio')).toHaveCount(0);check('Ending choices return to room or existing stories guide and dispose narration');
 await open('deer');await p.getByTestId('world-interact').click();await speaking(0);await expect(p.getByTestId('story-subtitle')).toContainText('有一人掉入恒河');await p.keyboard.press('Space');await speaking(1);await p.keyboard.press('Space');await speaking(2);await expect(p.getByTestId('story-detail')).toHaveCount(2);await layout();await p.keyboard.press('Escape');check('Original Deer player still uses five segments and paired episode-three artwork');
 await p.setViewportSize({width:844,height:390});await open('novice');await p.getByTestId('world-interact').click();await speaking(0,'introduction');await p.keyboard.press('Space');await speaking(0);await layout();await p.screenshot({path:`${prefix}-novice-landscape.png`});check('Longest full paragraph, controls and art fit landscape without scroll');
 await p.setViewportSize({width:390,height:844});await expect(p.getByTestId('world-rotate')).toBeVisible();await expect(p.getByTestId('world-story')).toHaveAttribute('inert','');const t=await p.getByTestId('story-audio').evaluate(a=>a.currentTime);await p.waitForTimeout(300);expect(await p.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeCloseTo(t,2);check('Unsupported portrait blocks and pauses the same story');
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;await p.screenshot({path:`${prefix}-verification-failure.png`});console.error(e);}
finally{await browser.close();await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));}
