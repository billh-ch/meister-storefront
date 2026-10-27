import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const base=process.env.TEST_BASE_URL??'http://localhost:3080'
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
try {
 for(const locale of ['en','el'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}})
  page.setDefaultTimeout(15000)
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  const prefix=locale==='el'?'/el':''
  const response=await page.goto(`${base}${prefix}/gear-finder#fins`)
  assert.equal(response.status(),200,'native guide route must exist')
  const next=page.getByRole('button',{name:locale==='el'?'Συνέχεια':'Continue',exact:true})
  await page.locator('[data-gear-mode="fins"]').waitFor()
  assert.equal(await next.isDisabled(),true)
  for(let i=0;i<7;i++){
   await (i===6?page.locator('input[value="400"]'):page.locator('input[type=radio]').first()).check()
   await (i===6?page.getByRole('button',{name:locale==='el'?'Βρες τα πέδιλά μου':'Find my fins',exact:true}):next).click()
  }
  await page.locator('[data-gear-results]').waitFor()
  assert.ok(await page.locator('[data-gear-best] a[href*="/products/"]').count())
  assert.match(await page.locator('[data-gear-best]').innerText(),/EVO/)
  assert.ok((await page.locator('[data-gear-best] a').getAttribute('href')).startsWith(prefix+'/products/'))
  await page.locator('[data-mode-link="wetsuits"]').click()
  await page.locator('[data-gear-mode="wetsuits"]').waitFor()
  for(let i=0;i<6;i++){
   await page.locator('input[type=radio]').first().check()
   await (i===5?page.getByRole('button',{name:locale==='el'?'Βρες τη στολή μου':'Find my wetsuit',exact:true}):next).click()
  }
  await page.locator('[data-gear-results]').waitFor()
  assert.match(await page.locator('[data-gear-best]').innerText(),/Double Lined/)
  await page.goBack()
  await page.locator('[data-gear-mode="fins"] [data-gear-results]').waitFor()
  await page.reload()
  await page.locator('[data-gear-mode="fins"] [data-gear-results]').waitFor()
  assert.ok(await page.getByRole('button',{name:locale==='el'?'Αποθήκευση / εκτύπωση':'Save / print results',exact:true}).count())
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow')
  const finPdp=await page.locator('[data-gear-best] a[href*="/products/"]').getAttribute('href')
  await page.goto(base+finPdp)
  await page.locator('a[href="'+prefix+'/gear-finder#fins"]').click()
  await page.locator('[data-gear-mode="fins"] [data-gear-results]').waitFor()
  await page.emulateMedia({media:'print'})
  assert.equal(await page.locator('header').first().evaluate(el=>getComputedStyle(el).display),'none')
  await page.emulateMedia({media:'screen'})
  if(width<1280) await page.getByRole('button',{name:locale==='el'?'Άνοιγμα μενού':'Open menu',exact:true}).click()
  const navLink=page.locator('header a[href="'+prefix+'/gear-finder"]').filter({visible:true})
  assert.equal(await navLink.count(),1,'visible navigation entry point')
  await navLink.click()
  assert.equal(new URL(page.url()).pathname,prefix+'/gear-finder')
  const pdp=await page.locator('[data-gear-best] a[href*="/products/"]').first().getAttribute('href')
  await page.goto(base+pdp)
  const quizLink=page.locator('a[href="'+prefix+'/gear-finder#wetsuits"]')
  await quizLink.waitFor()
  await quizLink.click()
  await page.locator('[data-gear-mode="wetsuits"]').waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  if(width===1440){
   await page.getByRole('button',{name:locale==='el'?'Επιλογή γλώσσας: Ελληνικά':'Choose language: English',exact:true}).click()
   await page.getByRole('link',{name:locale==='el'?'Switch language to English':'Αλλαγή γλώσσας σε Ελληνικά',exact:true}).click()
   await page.locator('html[lang="'+(locale==='el'?'en':'el')+'"]').waitFor()
   await page.locator('[data-gear-mode="wetsuits"] [data-gear-results]').waitFor()
  }
  assert.deepEqual(errors,[])
  console.log(`PASS ${locale} ${width}: both quizzes, local links, history, session retention, print, overflow`)
  await page.close()
 }
}finally{await browser.close()}
