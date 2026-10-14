import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const origin=process.env.TEST_BASE_URL || 'http://localhost:3042'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(origin+'/'); await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).pathname,'/')
 await page.getByRole('link',{name:'Αλλαγή γλώσσας σε Ελληνικά'}).first().click();await page.waitForURL('**/el');await page.waitForLoadState('networkidle')
 await page.goto(origin+'/');await page.waitForURL('**/el');assert.equal(await page.locator('html').getAttribute('lang'),'el')
 await page.goto(origin+'/shop');assert.equal(await page.locator('html').getAttribute('lang'),'en')
 await page.goto(origin+'/el/shop');await page.waitForLoadState('networkidle')
 const first=page.getByRole('article').first();await first.getByRole('button',{name:/Προσθήκη του .* στα αγαπημένα/}).click();await first.getByRole('button',{name:/Αφαίρεση του .* από τα αγαπημένα/}).waitFor()
 await first.getByRole('button',{name:/Προσθήκη του .* στη σύγκριση/}).click();await page.locator('[data-compare-tray]').waitFor()
 const add=page.getByRole('button',{name:/Προσθήκη του .* στο καλάθι/}).first();await add.click();await page.getByRole('region',{name:'Επιβεβαίωση καλαθιού'}).waitFor()
 await page.getByRole('button',{name:'Κλείσιμο επιβεβαίωσης καλαθιού'}).click()
 const cartBefore=(await page.context().cookies()).find(c=>c.name==='mm_cart')?.value;assert.ok(cartBefore)
 const stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>/^mm_(wishlist|compare)/.test(key))))
 await page.getByRole('link',{name:'Switch language to English'}).first().click();await page.waitForURL('**/shop');await page.waitForLoadState('networkidle')
 assert.equal((await page.context().cookies()).find(c=>c.name==='mm_cart')?.value,cartBefore)
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>/^mm_(wishlist|compare)/.test(key)))),stored)
 await page.goto(origin+'/');assert.equal(new URL(page.url()).pathname,'/');assert.equal(await page.evaluate(()=>localStorage.getItem('meister_locale')),'en')
 await page.goto(origin+'/el/wishlist');await page.getByRole('article').waitFor();assert.equal(await page.getByRole('button',{name:/Αφαίρεση του .* από τα αγαπημένα/}).count(),1)
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900})
  for(const path of ['/el','/el/shop','/el/products/carbon-blade-fins','/el/cart','/el/checkout','/el/compare','/el/contact','/el/privacy','/el/sign-in','/el/sign-up']) {
   await page.goto(origin+path);await page.waitForLoadState('networkidle')
   assert.equal(await page.locator('html').getAttribute('lang'),'el',path)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} horizontal overflow at ${width}`)
   if(path==='/el/products/carbon-blade-fins') {
    assert.equal(await page.getByRole('heading',{level:1}).innerText(),'Carbon Blade Freediving Fins')
    const cta=page.getByRole('button',{name:'Προσθήκη στο καλάθι',exact:true}).first();await cta.waitFor()
    const box=await cta.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width,`PDP CTA fits ${width}`)
   }
   if(path==='/el/contact') {assert.match(await page.locator('article').innerText(),/Λεωφ\. Αθηνών 387/);assert.doesNotMatch(await page.locator('article').innerText(),/For a product question/)}
   if(path==='/el/privacy') assert.doesNotMatch(await page.locator('article').innerText(),/The storefront|Guest wishlists|Checkout collects/)
   if(path==='/el/checkout') assert.equal(await page.locator('option[value="GR"]').innerText(),'Ελλάδα')
   if(width===320&&['/el','/el/products/carbon-blade-fins','/el/cart'].includes(path)) await page.screenshot({path:`/tmp/meister-locale/task-2-${path==='/el'?'homepage':path.includes('products')?'pdp':'cart'}-320.png`,fullPage:true})
   if(width===1440&&path==='/el')await page.screenshot({path:'/tmp/meister-locale/task-2-homepage-1440.png',fullPage:true})
  }
 }
 await page.goto(origin+'/el/missing-store-page');assert.match(await page.getByRole('heading',{level:1}).innerText(),/Η ΣΕΛΙΔΑ ΔΕΝ ΒΡΕΘΗΚΕ/);assert.equal(await page.getByRole('link',{name:'Επιστροφή στο κατάστημα',exact:true}).getAttribute('href'),'/el')
 assert.equal((await page.request.get(origin+'/el/missing-store-page')).status(),404)
 for(const path of ['/el/%61pi/cart','/el/%64ocs','/el/%5fnext/image','/el/logo%2esvg'])assert.equal((await page.request.get(origin+path)).status(),404)
 const account=await page.request.get(origin+'/el/%61ccount',{maxRedirects:0});assert.equal(account.status(),307)
 await page.setViewportSize({width:320,height:900})
 await page.goto(origin+'/el/products/hood-3mm')
 await page.getByRole('button',{name:'Επιλογή χαρακτηριστικών',exact:true}).first().click()
 await page.getByText('Παρακαλούμε επιλέξτε πρώτα Χαρακτηριστικά',{exact:true}).waitFor()
 await page.getByRole('button',{name:'S',exact:true}).click()
 assert.equal(await page.getByRole('button',{name:'S',exact:true}).getAttribute('aria-pressed'),'true')
 await page.getByRole('button',{name:'Προσθήκη στο καλάθι',exact:true}).click()
 await page.getByRole('region',{name:'Επιβεβαίωση καλαθιού'}).waitFor()
 const variantCookie=(await page.context().cookies()).find(c=>c.name==='mm_cart').value
 assert.match(Buffer.from(variantCookie,'base64url').toString('utf8'),/"Options":"S"/)
 await page.getByRole('button',{name:'Κλείσιμο επιβεβαίωσης καλαθιού'}).click()
 await page.getByRole('button',{name:'Άνοιγμα μενού'}).click()
 await page.locator('#mobile-menu').getByRole('link',{name:'Switch language to English'}).click()
 await page.waitForURL('**/products/hood-3mm')
 assert.equal((await page.context().cookies()).find(c=>c.name==='mm_cart').value,variantCookie)
 assert.deepEqual(errors,[])
 console.log('PASS Greek UI/state/navigation: first visit, remembered choice, direct English deep link, explicit English, cart/wishlist/compare continuity, useful 404/encoded boundaries, 10 screens at 320/390/768/1440, source catalog names and Greek country/contact/privacy, screenshots.')
} finally {await browser.close()}
