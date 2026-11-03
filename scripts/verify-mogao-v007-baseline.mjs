import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'}),report={passed:false,errors:[],worldAssets:[]};
try{
 const p=await browser.newPage({viewport:{width:1279,height:925}});
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);if(r.url().includes('/assets/world/')&&r.url().endsWith('.glb'))report.worldAssets.push(r.url());});
 await p.goto('http://localhost:4214/baseline.html#/');
 await expect(p.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});
 expect(report.worldAssets.some(s=>/mogao-sandstone|mogao-massing|mogao\/v007/.test(s))).toBe(false);
 await expect(p.getByRole('link',{name:'直接选主题',exact:true})).toBeVisible();
 await p.getByRole('link',{name:'直接选主题',exact:true}).click();
 await expect(p.getByTestId('world-host')).toHaveCount(0);
 await expect(p.getByRole('heading',{name:'敦煌寻宝记',exact:true})).toBeVisible();
 await p.screenshot({path:'work/world/mogao-v007-baseline-themes.png'});
 expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await browser.close();}
await writeFile('work/world/mogao-v007-baseline-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
