import {chromium,expect} from '@playwright/test';
import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';

const errors=[];
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:4398,strictPort:true},plugins:[{
  name:'environment-lighting-check',configureServer(vite){vite.middlewares.use((request,response,next)=>{
    if(request.url!=='/__environment-lighting-check')return next();
    response.setHeader('Content-Type','text/html');response.end('<!doctype html><html><head><link rel="icon" href="data:,"></head><body style="margin:0"><script type="module" src="/tests/world/environment-lighting.fixture.ts"></script></body></html>');
  });},
}]});
await server.listen();
const browser=await chromium.launch({channel:'chrome'});
try{
  const page=await browser.newPage({viewport:{width:640,height:480}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:4398/__environment-lighting-check');
  await page.waitForFunction(()=>!!window.environmentLightingCheck);
  const report=await page.evaluate(()=>window.environmentLightingCheck);
  await writeFile('work/world/environment-lighting-v001-check.json',JSON.stringify({...report,errors},null,2));
  await page.screenshot({path:'work/world/environment-lighting-v001-check.png'});
  expect(errors).toEqual([]);expect(report.glError).toBe(0);
  expect(report.bakeColorDraws).toBe(0);
  expect(report.before.status).toBe('ready');expect(report.before.staticPasses).toBe(4);
  expect(report.after.staticPasses).toBe(4);expect(report.staticDraws).toBe(report.preparedDraws);
  expect(report.after.tiles).toEqual(report.before.tiles);
  expect(report.staticShadow).toBeLessThan(report.sunlit*.8);
  expect(report.firstPersonShadow).toBeLessThan(report.withoutProxy*.85);
  expect(report.unoccludedShadowLoss).toBeLessThan(2);
  expect(report.cancelReason).toContain('environment-lighting-disposed');
  expect(report.textureCountAfterCancel).toBe(report.textureCountBeforeCancel);
  expect(report.hookChain).toContain('environment-static-sun-v001');
  console.log(JSON.stringify({passed:true,staticShadow:report.staticShadow,sunlit:report.sunlit,
    firstPersonShadow:report.firstPersonShadow,withoutProxy:report.withoutProxy,staticDraws:report.staticDraws,bytes:report.after.estimatedTargetBytes}));
}finally{await browser.close();await server.close();}
