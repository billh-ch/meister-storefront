import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const origin=process.env.TEST_BASE_URL || 'http://localhost:3042';const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']})
try {
const page=await browser.newPage();await page.goto(origin+'/el/shop');await page.getByRole('button',{name:/Προσθήκη του .* στο καλάθι/}).first().click();await page.getByRole('region',{name:'Επιβεβαίωση καλαθιού'}).waitFor()
for(const width of [320,390,768]) {
await page.setViewportSize({width,height:900});await page.goto(origin+'/el/cart');await page.waitForLoadState('networkidle');
const line=page.locator('[data-cart-line]').first();const lineBox=await line.boundingBox();
for(const control of await line.locator('fieldset button, fieldset input').all()) {
const box=await control.boundingBox();assert.ok(box.x>=lineBox.x&&box.x+box.width<=lineBox.x+lineBox.width,`cart control fits line at ${width}`)
}
const minus=await line.getByRole('button',{name:'Μείωση ποσότητας'}).boundingBox();const plus=await line.getByRole('button',{name:'Αύξηση ποσότητας'}).boundingBox();assert.equal(minus.width,plus.width);assert.equal(minus.height,plus.height);assert.ok(minus.width>=44&&minus.height>=44)
if(width===320)await page.screenshot({path:'/tmp/meister-locale/task-2-cart-320.png',fullPage:true})
}
console.log('PASS Greek cart controls fit each line at320/390/768px, equal +/- >=44px touch targets; refreshed320px screenshot.')
}finally{await browser.close()}
