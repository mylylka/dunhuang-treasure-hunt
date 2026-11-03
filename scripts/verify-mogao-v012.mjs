import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const prefix='work/world/mogao-v012',report={checks:[],errors:[],passed:false};
const browser=await chromium.launch({channel:'chrome'}),p=await browser.newPage({viewport:{width:1279,height:925}});
p.on('pageerror',e=>report.errors.push(e.message));
p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
const inspect=()=>p.evaluate(()=>window.__mogao.inspect());
async function open(view){
  await p.goto(`http://localhost:4219/?view=${view}#/`);
  await p.waitForFunction(()=>window.__mogao?.inspect().loaded);
  await p.waitForTimeout(2400);
}
async function walk(key,finish){
  await p.evaluate(()=>{window.__entryFrames=[];window.__entryTimer=setInterval(()=>{
    const s=window.__mogao.inspect();window.__entryFrames.push({position:s.checkpoint.position,camera:s.camera,light:s.interiorLighting});
  },80);});
  await p.keyboard.down(key);
  try{await p.waitForFunction(finish,null,{timeout:25000});}finally{await p.keyboard.up(key);}
  return p.evaluate(()=>{clearInterval(window.__entryTimer);return window.__entryFrames;});
}
try{
  await open('entrance');expect((await inspect()).interiorLighting.gain).toBe(.004);
  await p.screenshot({path:`${prefix}-after-entrance.png`});
  report.enter=await walk('w',()=>window.__mogao.inspect().checkpoint.position.z< -70.9);
  const stopped=await inspect();expect(stopped.interiorLighting.gain).toBeGreaterThan(.12);
  expect(stopped.camera.position[2]).toBeGreaterThan(-70);
  for(let i=1;i<report.enter.length;i++){
    expect(report.enter[i].light.adaptation).toBeGreaterThanOrEqual(report.enter[i-1].light.adaptation);
    expect(report.enter[i].light.adaptation-report.enter[i-1].light.adaptation).toBeLessThan(.08);
  }
  await p.waitForTimeout(2400);
  const settled=await inspect();expect(settled.interiorLighting.gain).toBeGreaterThan(stopped.interiorLighting.gain);
  await p.screenshot({path:`${prefix}-walked-in.png`});
  report.checks.push('Continuous walking begins revealing before the trailing camera enters; adaptation continues while standing still');
  await p.waitForTimeout(2800);const beforeOrbit=await inspect();
  await p.keyboard.down('q');await p.waitForTimeout(900);await p.keyboard.up('q');await p.waitForTimeout(700);
  const afterOrbit=await inspect();expect(afterOrbit.checkpoint.position).toEqual(beforeOrbit.checkpoint.position);
  expect(afterOrbit.camera.position).not.toEqual(beforeOrbit.camera.position);
  expect(Math.abs(afterOrbit.interiorLighting.gain-beforeOrbit.interiorLighting.gain)).toBeLessThan(.002);
  await p.keyboard.press('r');await p.waitForTimeout(650);expect((await inspect()).caveLook).toBeCloseTo(.22);
  expect(Math.abs((await inspect()).interiorLighting.gain-afterOrbit.interiorLighting.gain)).toBeLessThan(.002);
  await p.keyboard.press('c');report.checks.push('Left/right and up/down viewing do not change player-based brightness');
  await open('interior');expect((await inspect()).interiorLighting.gain).toBe(.484);
  report.exit=await walk('s',()=>window.__mogao.inspect().checkpoint.position.z> -61.5);
  for(let i=1;i<report.exit.length;i++){
    expect(report.exit[i].light.adaptation).toBeLessThanOrEqual(report.exit[i-1].light.adaptation+.00001);
    expect(report.exit[i-1].light.adaptation-report.exit[i].light.adaptation).toBeLessThan(.08);
  }
  await p.waitForTimeout(2600);expect((await inspect()).interiorLighting.gain).toBeLessThan(.006);
  report.checks.push('Indoor brightness endpoint unchanged; continuous exit gradually returns to the dark exterior view');
  await open('passage');await p.screenshot({path:`${prefix}-after-passage.png`});
  await expect(p.getByTestId('world-location')).toHaveCount(0);await expect(p.locator('.world-direction')).toHaveCount(0);
  await p.setViewportSize({width:844,height:390});await p.getByRole('button',{name:'向上看',exact:true}).click();
  await p.waitForTimeout(600);await p.screenshot({path:`${prefix}-passage-landscape.png`});
  expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)).toBe(false);
  report.checks.push('Landscape controls fit and no location labels or direction cards reappear');
  await p.goto('http://localhost:4219/baseline.html#/');
  await expect(p.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});
  await p.getByRole('link',{name:'直接选主题',exact:true}).click();await expect(p.getByTestId('world-host')).toHaveCount(0);
  report.checks.push('Original game entry still loads and theme navigation works');
  expect(report.errors).toEqual([]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;await p.screenshot({path:`${prefix}-failure.png`});console.error(e);}
finally{await browser.close();await writeFile(`${prefix}-verification.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify({passed:report.passed,checks:report.checks,enterFrames:report.enter?.length,exitFrames:report.exit?.length,errors:report.errors}));
