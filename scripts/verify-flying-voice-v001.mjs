import {chromium,webkit,expect} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const report={passed:false,checks:[],errors:[]};
const text='我没有翅膀，却能在天空中自由飞翔。你知道画师是怎样让我看起来像在飞吗？';
const prefix='work/world/flying-voice-v001-audio';
async function observeAudio(page) {
  await page.addInitScript(()=>{window.Audio=new Proxy(window.Audio,{construct(target,args,newTarget){const media=Reflect.construct(target,args,newTarget);if(String(args[0]).includes('flying-question-native'))window.__voiceMedia=media;return media;}});});
}
let browser;
try{
  const audio=await readFile('public/assets/world/flying-voice/v001/flying-question-native.mp3');
  const url='http://localhost:4197/assets/world/flying-voice/v001/flying-question-native.mp3';
  const full=await fetch(url);expect(Number(full.headers.get('content-length'))).toBe(audio.length);
  expect(createHash('sha256').update(Buffer.from(await full.arrayBuffer())).digest('hex')).toBe(createHash('sha256').update(audio).digest('hex'));
  for(const [range,status,length] of [['bytes=0-31',206,32],['bytes=-20',206,20],[`bytes=${audio.length}-`,416,0]]){
    const response=await fetch(url,{headers:{range}});expect(response.status).toBe(status);expect((await response.arrayBuffer()).byteLength).toBe(length);
  }
  report.checks.push('served audio SHA, Content-Length, byte ranges and invalid-range response');
  for(const engine of (process.env.VOICE_ENGINE?[process.env.VOICE_ENGINE]:['chrome','webkit'])){
    browser=engine==='chrome'?await chromium.launch({channel:'chrome'}):await webkit.launch();
    for(const [name,viewport] of [['desktop',{width:1279,height:925}],['mobile',{width:844,height:390}]]){
      report.phase=`${engine} ${name}`;
      const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
      await observeAudio(page);
      await page.goto('http://localhost:4197/?view=mural');
      await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
      await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.status==='ready');
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().flyingVoice)).toMatchObject({status:'ready',playing:false,currentTime:0});
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().flyingVoice.duration)).toBeGreaterThan(7);
      await page.getByTestId('world-interact').click();
      await expect(page.getByTestId('flying-subtitle')).toHaveText(text);
      await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing&&window.__voiceMedia.currentTime>1);
      expect(await page.evaluate(()=>window.__voiceMedia.volume)).toBe(.4);
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().musicAudio.gain)).toBeCloseTo(.088,3);
      await page.getByTestId('flying-pause').click();
      const pausedVoice=await page.evaluate(()=>window.__voiceMedia.currentTime);
      await page.waitForTimeout(350);expect(await page.evaluate(()=>window.__voiceMedia.currentTime)).toBeCloseTo(pausedVoice,2);
      expect(await page.evaluate(()=>window.__voiceMedia.paused)).toBe(true);
      await page.getByTestId('flying-pause').click();
      await page.waitForFunction(t=>window.__voiceMedia.currentTime>t+.25,pausedVoice);
      await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);
      await expect(page.getByText('本机女声试听 · 正式配音待替换',{exact:true})).toBeVisible();
      await page.screenshot({path:`${prefix}-${engine}-${name}.png`});
      for(const id of ['flying-subtitle','flying-pause','flying-replay','flying-exit']){
        const box=await page.getByTestId(id).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
      }
      await page.getByTestId('flying-pause').click();
      const time=await page.evaluate(()=>window.__musicPavilion.inspect().flying.time);
      await page.waitForTimeout(500);expect(await page.evaluate(()=>window.__musicPavilion.inspect().flying.time)).toBe(time);
      await page.getByTestId('flying-replay').click();
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().flying.time)).toBeLessThan(1);
      expect(await page.evaluate(()=>window.__voiceMedia.currentTime)).toBeLessThan(.5);
      await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.ended);
      await page.waitForFunction(()=>window.__musicPavilion.inspect().musicAudio.gain>.39);
      expect(await page.evaluate(()=>window.__voiceMedia.paused)).toBe(true);
      await page.getByTestId('flying-replay').click();
      await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing);
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      await expect(page.getByTestId('world-resume')).toBeVisible();
      const blurred=await page.evaluate(()=>window.__voiceMedia.currentTime);
      await page.waitForTimeout(250);expect(await page.evaluate(()=>window.__voiceMedia.currentTime)).toBeCloseTo(blurred,2);
      await page.getByTestId('world-resume').click();
      await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing);
      await page.getByTestId('flying-exit').click();await expect(page.getByTestId('flying-subtitle')).toHaveCount(0);
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().flying.color)).toBe(0);
      expect(await page.evaluate(()=>window.__voiceMedia.paused)).toBe(true);
      expect(await page.evaluate(()=>window.__voiceMedia.currentTime)).toBe(0);
      await page.getByTestId('world-interact').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing);
      await page.getByRole('link',{name:'直接选主题',exact:true}).click();
      await page.waitForFunction(()=>!window.__musicPavilion);
      expect(await page.evaluate(()=>window.__voiceMedia.paused)).toBe(true);
      await page.close();report.checks.push(`${engine} ${name}: real MP3 playback, subtitle, ducking/restore, pause/resume/replay, blur, exit/reenter/navigation cleanup`);
    }
    for(const preferences of [{version:1,enabled:false,volume:.4},{version:1,enabled:true,volume:0},{version:1,enabled:true,volume:.7}]){
      const page=await browser.newPage({viewport:{width:1279,height:925}});await observeAudio(page);
      await page.addInitScript(p=>localStorage.setItem('dunhuang:sound-settings:v1',JSON.stringify(p)),preferences);
      await page.goto('http://localhost:4197/?view=mural');await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
      await page.getByTestId('world-interact').click();await page.waitForFunction(()=>window.__voiceMedia.currentTime>.5);
      expect(await page.evaluate(()=>window.__voiceMedia.muted)).toBe(!preferences.enabled);
      expect(await page.evaluate(()=>window.__voiceMedia.volume)).toBe(preferences.volume);
      const audible=preferences.enabled&&preferences.volume>0;
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().flyingVoice.playing)).toBe(audible);
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().musicAudio.gain)).toBeCloseTo(audible?preferences.volume*.22:0,3);
      await expect(page.getByTestId('flying-subtitle')).toHaveText(text);await page.close();
    }
    report.checks.push(`${engine}: actual media mute, zero volume and 70% volume`);
    const failed=await browser.newPage({viewport:{width:1279,height:925}});
    let unavailable=true;
    await failed.route('**/flying-question-native.mp3',r=>unavailable?r.fulfill({status:503,body:'intentional test failure'}):r.continue());
    await failed.goto('http://localhost:4197/?view=mural');await failed.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
    await failed.getByTestId('world-interact').click();await expect(failed.getByRole('button',{name:'重试语音'})).toBeVisible();
    await expect(failed.getByTestId('flying-subtitle')).toHaveText(text);
    unavailable=false;await failed.getByRole('button',{name:'重试语音'}).click();await failed.waitForFunction(()=>window.__musicPavilion.inspect().flyingVoice.playing);
    await failed.close();report.checks.push(`${engine}: actual audio HTTP failure retains subtitle and retry recovers`);
    await browser.close();browser=null;
  }
  const original=JSON.parse(await readFile('art-source/world/music-pavilion/v002/protected-assets.json','utf8'));
  for(const [path,hash] of Object.entries(original))expect(createHash('sha256').update(await readFile(path)).digest('hex'),path).toBe(hash);
  report.checks.push('37 protected assets unchanged');
  expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{if(browser)await browser.close();await writeFile(`${prefix}${process.env.VOICE_ENGINE?`-${process.env.VOICE_ENGINE}`:''}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
