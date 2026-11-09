import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});
try{
 for(const [id,view,presses] of [['t07-game','forecourt',2],['m09-up','music',1],['t16-up','interior',3]]){
  await page.goto(`http://localhost:4222/?view=${view}#/`);
  await page.waitForFunction(()=>window.__terrain?.inspect().loaded,null,{timeout:90000});
  if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();
  await page.waitForTimeout(500);
  for(let i=0;i<presses;i++)await page.keyboard.press('r');
  await page.waitForTimeout(800);
  await page.addStyleTag({content:'.world-hud{visibility:hidden!important}'});
  await page.screenshot({path:`outputs/world-decoration-reference/v001/original/${id}.png`});
  console.log(id);
 }
}finally{await browser.close()}
