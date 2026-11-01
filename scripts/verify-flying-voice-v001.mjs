import {chromium,webkit,expect} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const report={passed:false,checks:[],errors:[]};
const text='我没有翅膀，却能在天空中自由飞翔。你知道画师是怎样让我看起来像在飞吗？';
const prefix='work/world/flying-voice-v001';
let browser;
try{
  for(const engine of ['chrome','webkit']){
    browser=engine==='chrome'?await chromium.launch({channel:'chrome'}):await webkit.launch();
    for(const [name,viewport] of [['desktop',{width:1279,height:925}],['mobile',{width:844,height:390}]]){
      const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
      await page.goto('http://localhost:4197/?view=mural');
      await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded);
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().flyingVoice)).toMatchObject({status:'missing',playing:false});
      await page.getByTestId('world-interact').click();
      await expect(page.getByTestId('flying-subtitle')).toHaveText(text);
      await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);
      await expect(page.getByText('字幕预览 · 神女配音待接入',{exact:true})).toBeVisible();
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
      await page.getByTestId('flying-exit').click();await expect(page.getByTestId('flying-subtitle')).toHaveCount(0);
      expect(await page.evaluate(()=>window.__musicPavilion.inspect().flying.color)).toBe(0);
      await page.close();report.checks.push(`${engine} ${name}: subtitle, controls, pause/replay/exit, gray reset`);
    }
    await browser.close();browser=null;
  }
  const original=JSON.parse(await readFile('art-source/world/music-pavilion/v002/protected-assets.json','utf8'));
  for(const [path,hash] of Object.entries(original))expect(createHash('sha256').update(await readFile(path)).digest('hex'),path).toBe(hash);
  report.checks.push('37 protected assets unchanged');
  expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.message;process.exitCode=1;}
finally{if(browser)await browser.close();await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
