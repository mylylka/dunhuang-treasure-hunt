import { chromium, expect } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const report={passed:false,errors:[],checks:[]},browser=await chromium.launch({channel:'chrome'});
try {
  const page=await browser.newPage({viewport:{width:1279,height:925}});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://localhost:4195/review.html');
  await expect(page.getByRole('heading',{level:1})).toHaveText('沿曲径，先闻乐声再见馆舍');
  await page.locator('img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
  await page.screenshot({path:'work/world/music-pavilion-v002-review.png'});
  for (const video of await page.locator('video').all()) {
    await video.evaluate(async video=>{video.muted=true;await video.play();});
    await expect.poll(()=>video.evaluate(video=>video.currentTime)).toBeGreaterThan(.2);
    const hasAudio=await video.evaluate(video=>video.captureStream().getAudioTracks().length>0);
    expect(hasAudio).toBe(true);await video.evaluate(video=>video.pause());
  }
  report.checks.push('all review images load; both actual videos play and include audio');
  await page.getByRole('link',{name:'观看飞天演出',exact:true}).click();
  await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
  await page.keyboard.press('f');await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);
  expect(await page.evaluate(()=>window.__musicPavilion.inspect().musicAudio.playing)).toBe(true);
  await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__musicPavilion.inspect().flying.color)).toBe(0);
  report.checks.push('review entry opens the final built model, audio and reset-to-gray interaction');
  await page.close();

  // A rejected initial browser audio resume must reuse its context on retry.
  const retry=await browser.newPage();
  await retry.addInitScript(()=>{
    const Original=window.AudioContext;window.__audioContexts=0;window.__resumeRejected=false;
    window.AudioContext=class extends Original {
      constructor(...args){super(...args);window.__audioContexts++;}
      resume(){if(!window.__resumeRejected){window.__resumeRejected=true;return Promise.reject(new Error('simulated first gesture denial'));}return super.resume();}
    };
  });
  await retry.goto('http://localhost:4195/?view=mural');await retry.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
  await retry.locator('canvas[data-world-canvas]').click();
  await retry.waitForFunction(()=>window.__resumeRejected&&!window.__musicPavilion.inspect().musicAudio.unlocked);
  // The app also owns its existing short-UI-sound context; measure growth,
  // not the total number of contexts belonging to both independent channels.
  const initialContexts=await retry.evaluate(()=>window.__audioContexts);
  await retry.locator('canvas[data-world-canvas]').click();
  await retry.waitForFunction(()=>window.__musicPavilion.inspect().musicAudio.playing);
  expect(await retry.evaluate(()=>window.__audioContexts)).toBe(initialContexts);
  report.checks.push('rejected initial audio resume retries without leaking a second AudioContext');
  await retry.close();
  const manifest=JSON.parse(await readFile('art-source/world/models/music-pavilion/v002/export-manifest.json','utf8'));
  const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
  expect(await hash('src/content/world/music-pavilion-layout-v002.json')).toBe(manifest.layoutSha256);
  expect(await hash('public/assets/world/music-pavilion/v002/music-pavilion.glb')).toBe(manifest.sha256);
  expect(await hash('outputs/music-pavilion/v002/assets/world/music-pavilion/v002/music-pavilion.glb')).toBe(manifest.sha256);
  report.checks.push('final Blender manifest, shared layout and served GLB match');
  expect(report.errors).toEqual([]);report.passed=true;
} catch(error) { report.failure=error.message;process.exitCode=1; }
finally { await writeFile('work/world/music-pavilion-v002-review-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close(); }
