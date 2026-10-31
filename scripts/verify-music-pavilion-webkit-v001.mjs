import { webkit, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const report={passed:false,errors:[],checks:[]};let browser;
try{
  browser=await webkit.launch();const context=await browser.newContext({viewport:{width:1279,height:925}});const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  await page.goto('http://localhost:4194/?view=mural');await page.waitForFunction(()=>window.__musicPavilion?.inspect()?.loaded,undefined,{timeout:45000});
  expect((await page.evaluate(()=>window.__musicPavilion.inspect())).flying.color).toBe(0);report.checks.push('region-and-original-textures-load');
  await page.getByTestId('world-interact').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.complete);await expect(page.getByRole('heading',{name:'让视线跟随飘带'})).toBeVisible();await page.screenshot({path:'work/world/music-pavilion-v001-webkit.png'});report.checks.push('shader-reveal-completes');
  await page.getByTestId('flying-pause').click();const before=await page.evaluate(()=>window.__musicPavilion.inspect());await page.waitForTimeout(200);expect((await page.evaluate(()=>window.__musicPavilion.inspect())).flying.time).toBe(before.flying.time);await page.getByTestId('flying-replay').click();await page.waitForFunction(()=>window.__musicPavilion.inspect().flying.time<1);report.checks.push('pause-and-replay');
  await page.getByTestId('flying-exit').click();await expect(page.getByTestId('world-screen')).toHaveAttribute('data-view','follow');await page.keyboard.down('s');await page.waitForTimeout(250);await page.keyboard.up('s');expect((await page.evaluate(()=>window.__musicPavilion.inspect())).checkpoint.position.z).toBeGreaterThan(before.checkpoint.position.z);report.checks.push('exit-restores-movement');
  expect(report.errors).toEqual([]);report.passed=true;
}catch(error){report.failure=error.message;throw error;}
finally{await writeFile('work/world/music-pavilion-v001-webkit.json',JSON.stringify(report,null,2)+'\n');await browser?.close();console.log(JSON.stringify(report));}
