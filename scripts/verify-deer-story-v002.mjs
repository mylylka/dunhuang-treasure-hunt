import {chromium,webkit,expect} from '@playwright/test';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
const prefix='work/world/deer-story-v002',url='http://localhost:4204/?view=interior#/',report={passed:false,checks:[],errors:[],audio:[],layouts:[]};
const config=JSON.parse(await readFile('src/content/world/nine-colored-deer-v002.json','utf8'));
const check=(name)=>{report.checks.push(name);console.log(name);};
async function open(p){await p.goto(url);await p.waitForFunction(()=>window.__mogao?.inspect().loaded);await p.getByTestId('world-interact').click();}
async function phase(p,index,name='narration'){await expect(p.getByTestId('world-story-step')).toHaveAttribute('data-index',String(index));await expect(p.getByTestId('world-story')).toHaveAttribute('data-phase',name);}
async function speaking(p,index){await phase(p,index,index===5?'invitation':'narration');await p.waitForFunction(()=>document.querySelector('[data-testid="story-audio"]').currentTime>.3);}
async function finishBySkipping(p){
 for(let i=0;i<7;i++){
  if(await p.getByTestId('world-culture-choice').count())return;
  await p.waitForFunction(()=>!['return','overview'].includes(document.querySelector('[data-testid="world-story"]').dataset.phase));
  await p.keyboard.press('Space');await p.waitForTimeout(320);
 }await expect(p.getByTestId('world-culture-choice')).toBeVisible();
}
async function layout(p){
 await p.waitForFunction(()=>[...document.querySelectorAll('[data-testid="story-detail"]')].every(i=>{const b=i.getBoundingClientRect();return b.x>=0&&b.y>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1;}),null,{timeout:5000});
 const result=await p.getByTestId('story-detail').evaluateAll(imgs=>imgs.map(i=>{const b=i.getBoundingClientRect();return {id:i.dataset.artwork,x:b.x,y:b.y,w:b.width,h:b.height,native:i.naturalWidth/i.naturalHeight,viewport:[innerWidth,innerHeight]};}));
 for(const r of result){expect(r.w/r.h).toBeCloseTo(r.native,2);expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.x+r.w).toBeLessThanOrEqual(r.viewport[0]+1);expect(r.y+r.h).toBeLessThanOrEqual(r.viewport[1]+1);}
 expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);report.layouts.push(result);
}
await mkdir('work/world/deer-story-v002-video',{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:1279,height:925},recordVideo:{dir:'work/world/deer-story-v002-video',size:{width:1279,height:925}}}),p=await context.newPage();
p.on('pageerror',e=>report.errors.push(e.message));
try{
 await open(p);const frozen=await p.evaluate(()=>window.__mogao.inspect().checkpoint.position);
 await p.evaluate(()=>{window.__ended=[];document.addEventListener('ended',e=>{if(e.target instanceof HTMLAudioElement)window.__ended.push({url:e.target.currentSrc,time:e.target.currentTime,duration:e.target.duration});},true);});
 await expect(p.getByTestId('story-highlight')).toHaveCount(1);await p.screenshot({path:`${prefix}-highlight.png`});
 for(let i=0;i<5;i++){
  // This pass uses native audio duration, not injected ended events, seeking or accelerated playback.
  await speaking(p,i);await expect(p.getByTestId('story-detail')).toHaveCount(i===2?2:1);await layout(p);
  await expect(p.getByTestId('story-subtitle')).toContainText(config.segments[i].cues[0]);await expect(p.getByTestId('story-subtitle')).toContainText('（空格跳过）');
  await p.screenshot({path:`${prefix}-episode-${i+1}.png`});
  await p.waitForFunction(()=>{const a=document.querySelector('[data-testid="story-audio"]');return a.currentTime>a.duration*.52;});
  await expect(p.getByTestId('story-subtitle')).not.toContainText(config.segments[i].cues[0]);
  await p.waitForFunction(i=>document.querySelector('[data-testid="world-story-step"]').dataset.index!==String(i),i);
 }
 await speaking(p,5);await expect(p.getByTestId('story-detail')).toHaveCount(0);await expect(p.getByTestId('story-subtitle')).toContainText('敦煌的壁画里');
 await expect(p.getByTestId('world-culture-choice')).toBeVisible({timeout:10000});await expect(p.getByTestId('story-subtitle')).toHaveCount(0);
 await expect(p.getByTestId('world-culture-choice').getByRole('button')).toHaveText(['探索更多','再看一次','继续漫游']);
 report.audio=await p.evaluate(()=>window.__ended);expect(report.audio).toHaveLength(6);for(const a of report.audio)expect(a.time).toBeGreaterThanOrEqual(a.duration-.1);
 await p.screenshot({path:`${prefix}-ending.png`});check('five real audio files end naturally, followed by invitation; all captions and images advance in order');
 expect(await p.evaluate(()=>window.__mogao.inspect().checkpoint.position)).toEqual(frozen);
 await p.getByTestId('world-choice-replay').click();await speaking(p,0);check('replay from ending resets the same player to episode one');
 await p.getByRole('button',{name:'暂停',exact:true}).last().click();const t=await p.getByTestId('story-audio').evaluate(a=>a.currentTime);await p.waitForTimeout(650);expect(await p.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeCloseTo(t,2);
 await p.getByRole('button',{name:'继续播放',exact:true}).click();await p.waitForFunction(t=>document.querySelector('[data-testid="story-audio"]').currentTime>t+.3,t);
 await p.getByTestId('world-story').getByRole('button',{name:'重播',exact:true}).click();await speaking(p,0);expect(await p.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeLessThan(1.5);
 await p.keyboard.down('Space');await phase(p,1);await p.waitForTimeout(700);await p.keyboard.down('Space');expect(await p.getByTestId('world-story-step').getAttribute('data-index')).toBe('1');await p.keyboard.up('Space');check('pause freezes media, replay restarts audio; held Space advances only one episode');
 await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(p.getByTestId('world-story')).toHaveAttribute('inert','');const bt=await p.getByTestId('story-audio').evaluate(a=>a.currentTime);await p.waitForTimeout(400);expect(await p.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeCloseTo(bt,2);await p.getByTestId('world-resume').click();check('loss of focus pauses narration and returns keyboard focus to the global cover');
 await finishBySkipping(p);await p.getByTestId('world-choice-roam').click();await expect(p.getByTestId('world-story')).toHaveCount(0);expect(await p.evaluate(()=>window.__mogao.inspect().checkpoint.position)).toEqual(frozen);
 await p.getByTestId('world-interact').click();await finishBySkipping(p);await p.getByTestId('world-enter-theme').click();await expect(p).toHaveURL(/#\/theme\/stories/);await expect(p.getByTestId('story-audio')).toHaveCount(0);check('continue roaming keeps the cave position; explore more enters the existing stories theme and releases audio');
 // Failure recovery uses real failed requests, then the same production assets.
 await p.route('**/story/v002/rescue-and-promise.mp3',r=>r.fulfill({status:503,body:'unavailable'}));await open(p);await phase(p,0);await expect(p.getByText('旁白暂不可用。')).toBeVisible();await expect(p.getByTestId('story-subtitle')).toBeVisible();await p.unroute('**/story/v002/rescue-and-promise.mp3');await p.getByRole('button',{name:'重试旁白'}).click();await speaking(p,0);check('failed narration retains captions and skip; retry restores real audio');
 await p.getByRole('button',{name:'退出故事'}).click();
 const asset='**/story/v002/rescue-and-promise.webp';await p.route(asset,r=>r.fulfill({status:503,body:'unavailable'}));await p.getByTestId('world-interact').click();await expect(p.getByText('局部图片暂未加载。')).toBeVisible();await p.unroute(asset);await p.getByRole('button',{name:'重试图片'}).click();await speaking(p,0);await expect(p.getByTestId('story-detail')).toBeVisible();check('failed local artwork is recoverable without losing the world');
 expect(report.errors).toEqual([]);
}catch(e){report.failure=e.stack;process.exitCode=1;await p.screenshot({path:`${prefix}-failure.png`});}
finally{report.video=await p.video().path();await context.close();await browser.close();}
if(!report.failure){
 const b=await webkit.launch(),c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),m=await c.newPage();m.on('pageerror',e=>report.errors.push(e.message));
 try{
  await open(m);await speaking(m,0);await layout(m);await m.screenshot({path:`${prefix}-mobile-landscape.png`});
  await m.setViewportSize({width:390,height:844});await expect(m.getByTestId('world-rotate')).toBeVisible();await expect(m.getByTestId('world-story')).toHaveAttribute('inert','');
  const stopped=await m.getByTestId('story-audio').evaluate(a=>a.currentTime);await m.waitForTimeout(500);expect(await m.getByTestId('story-audio').evaluate(a=>a.currentTime)).toBeCloseTo(stopped,2);
  await m.setViewportSize({width:844,height:390});await m.getByTestId('world-resume').click();await m.waitForFunction(t=>document.querySelector('[data-testid="story-audio"]').currentTime>t+.2,stopped);await layout(m);
  await m.keyboard.press('Space');await speaking(m,1);await m.keyboard.press('Space');await speaking(m,2);await expect(m.getByTestId('story-detail')).toHaveCount(2);await layout(m);await m.screenshot({path:`${prefix}-mobile-pair-landscape.png`});
  await finishBySkipping(m);await m.screenshot({path:`${prefix}-mobile-choice-landscape.png`});await m.getByTestId('world-choice-roam').click();await expect(m.getByTestId('world-story')).toHaveCount(0);check('WebKit audio and paired artwork fit landscape; portrait only shows rotate cover and freezes audio; rotating back resumes from the same position');
  expect(report.errors).toEqual([]);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await m.screenshot({path:`${prefix}-mobile-failure.png`});}finally{await b.close();}
}
await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
