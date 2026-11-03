import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}});
try{
 await page.goto('http://localhost:4222/?view=hall#/');
 await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready','true',{timeout:45000});
 if(await page.getByTestId('world-resume').isVisible())await page.getByTestId('world-resume').click();
 await page.keyboard.down('w');await page.waitForTimeout(2200);await page.keyboard.up('w');
 await page.keyboard.press('r');await page.waitForTimeout(500);
 await page.screenshot({path:'outputs/terrain/v005/hall-height.png'});
 console.log(JSON.stringify(await page.evaluate(()=>window.__terrain.inspect().camera)));
}finally{await browser.close()}
