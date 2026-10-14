import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const origin=process.env.TEST_BASE_URL || 'http://localhost:3042'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']})
const cases=process.env.LOCALE_REVIEW_CASE ? [process.env.LOCALE_REVIEW_CASE] : ['attributes','spacing','switch']
try {
 for(const testCase of cases) {
  const page=await browser.newPage({viewport:{width:1440,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message))
  if(testCase==='attributes') {
   await page.goto(origin+'/el/products/hood-3mm')
   await page.getByRole('button',{name:'S',exact:true}).click()
   await page.getByRole('button',{name:'Προσθήκη στο καλάθι',exact:true}).click()
   const banner=page.getByRole('region',{name:'Επιβεβαίωση καλαθιού'});await banner.waitFor()
   const cookie=(await page.context().cookies()).find(c=>c.name==='mm_cart').value
   const original=JSON.parse(Buffer.from(cookie,'base64url').toString('utf8'))
   assert.deepEqual(original[0].selectedOptions,{Options:'S'})
   await banner.getByRole('button',{name:'Προβολή καλαθιού',exact:true}).click()
   const drawer=page.getByRole('dialog',{name:'Το καλάθι σας'});await drawer.waitFor()
   await drawer.getByText('Χαρακτηριστικά: S',{exact:true}).waitFor({timeout:5000})
   assert.doesNotMatch(await drawer.innerText(),/Options: S/)
   await drawer.getByRole('button',{name:'Κλείσιμο καλαθιού'}).click()
   await page.goto(origin+'/el/cart');await page.locator('[data-cart-line]').getByText('Χαρακτηριστικά: S',{exact:true}).waitFor()
   await page.goto(origin+'/el/checkout');await page.getByText('Χαρακτηριστικά: S',{exact:true}).waitFor()
   assert.equal((await page.context().cookies()).find(c=>c.name==='mm_cart').value,cookie)
   assert.deepEqual(JSON.parse(Buffer.from(cookie,'base64url').toString('utf8')),original)
   console.log('PASS I1: Greek raw Options:S selection displays Χαρακτηριστικά: S in drawer/fullcart/checkout; identical cookie and variation identity.')
  }
  if(testCase==='spacing') {
   for(const [prefix,locale] of [['','en'],['/el','el']]) {
    await page.goto(origin+prefix+'/shop');await page.evaluate(()=>localStorage.clear());await page.reload()
    const card=page.getByRole('article').first();await card.getByRole('button',{name:locale==='el'?/Προσθήκη του .* στα αγαπημένα/:/Add .* to wishlist/}).click()
    const photo=await card.locator('[aria-live="polite"]').first().textContent()
    assert.equal(photo.trim(),locale==='el'?'Φωτογραφία 1 από 5':'Photo 1 of 5')
    await page.goto(origin+prefix+'/products/carbon-blade-fins')
    assert.equal((await page.locator('p[aria-live="polite"]').first().textContent()).trim(),locale==='el'?'Εικόνα 1 από 5':'Image 1 of 5')
    await page.goto(origin+prefix+'/wishlist');await page.getByRole('article').waitFor()
    const paragraph=page.locator('p').filter({has:page.getByRole('link',{name:locale==='el'?'Σύνδεση':'Sign in',exact:true})})
    assert.equal(await paragraph.textContent(),locale==='el'?'Τα αγαπημένα σας σε αυτό το πρόγραμμα περιήγησης. Σύνδεση για να έχετε τα αγαπημένα σας σε όλες τις συσκευές σας.':'Your wishlist on this browser. Sign in to keep your wishlist across devices.')
    await page.goto(origin+prefix || origin+'/')
    const story=await page.locator('#homepage-about-heading > span').nth(1).textContent()
    assert.equal(story,locale==='el'?'ΑΠΟ ΤΟ 2013.':'SINCE 2013.')
   }
   console.log('PASS M1: exact gallery/card announcements, nonempty guest wishlist linked sentence and styled story heading have spaces in both locales.')
  }
  if(testCase==='switch') {
   const plain='/missing-store-page?ref=a%20b#detail'
   await page.goto(origin+'/el'+plain);await page.waitForLoadState('networkidle')
   const english=page.getByRole('link',{name:'Switch language to English'}).first()
   assert.equal(await english.getAttribute('href'),plain)
   await english.click();await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).pathname,'/missing-store-page');assert.equal(new URL(page.url()).search,'?ref=a%20b');assert.equal(new URL(page.url()).hash,'#detail');assert.equal(await page.locator('html').getAttribute('lang'),'en')
   const greek=page.getByRole('link',{name:'Αλλαγή γλώσσας σε Ελληνικά'}).first();assert.equal(await greek.getAttribute('href'),'/el'+plain)
   await greek.click();await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).pathname,'/el/missing-store-page');assert.equal(new URL(page.url()).search,'?ref=a%20b');assert.equal(new URL(page.url()).hash,'#detail');assert.equal(await page.locator('html').getAttribute('lang'),'el')
   for(const path of ['/el/api/cart','/el/docs','/el/%61pi/cart','/el/%64ocs','/el/logo%2esvg','/el/_next/image'])assert.equal((await page.request.get(origin+path)).status(),404)
   console.log('PASS M2: unknown404 switch both directions preserves exact query/hash and HTML locale; reserved/encoded boundaries stay404.')
  }
  assert.deepEqual(errors,[]);await page.close()
 }
}finally{await browser.close()}
