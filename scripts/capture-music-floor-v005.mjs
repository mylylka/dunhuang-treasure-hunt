import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1279,height:925}}),states={};
try{
 for(const [name,port] of [['before',4198],['after',4199]]){
  await page.goto(`http://localhost:${port}/?view=courtyard-wide`);await page.waitForFunction(()=>window.__musicPavilion?.inspect().loaded);await page.waitForTimeout(250);
  states[name]=await page.evaluate(()=>window.__musicPavilion.inspect());await page.screenshot({path:`work/world/music-pavilion-v005-floor-${name}.png`});
 }
 expect(states.after.camera).toEqual(states.before.camera);
 await writeFile('work/world/music-pavilion-v005-floor-comparison.json',JSON.stringify({passed:true,sameCamera:true,states},null,2));
}finally{await browser.close();}
