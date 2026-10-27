import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:3077'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
 const page = await browser.newPage()
 const errors = []; page.on('pageerror', e => errors.push(e.message))
 for (const locale of ['en','el']) for (const width of [390,1440]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(origin + (locale === 'el' ? '/el' : '/'), { waitUntil:'domcontentloaded' })
  await page.evaluate(()=>document.fonts.ready)
  const about = page.locator('section[aria-labelledby="homepage-about-heading"] a')
  assert.equal(await about.getAttribute('href'),'https://www.meister.gr/about-us')
  for (let tab=0;tab<4;tab++) {
   await page.locator('.category-tab').nth(tab).click()
   const track=page.locator('section:has(.category-tab) .marquee-track')
   await track.locator('[class="marquee-unit"]').first().waitFor()
   await page.waitForFunction(()=>[...document.querySelectorAll('.marquee-track')].every(e=>e.dataset.ready==='true'))
   for (const ticker of [track,page.locator('footer .marquee-track')]) {
    const metrics=await ticker.evaluate(e=>{
     const groups=[...e.children].map(c=>c.getBoundingClientRect().width)
     const unit=e.querySelector('.marquee-unit').getBoundingClientRect().width
     return {groups,unit,viewport:e.parentElement.clientWidth,width:e.getBoundingClientRect().width,duration:parseFloat(getComputedStyle(e).animationDuration),distance:parseFloat(e.style.getPropertyValue('--marquee-distance'))}
    })
    assert.ok(Math.abs(metrics.groups[0]-metrics.groups[1])<1,'Identical loop groups')
    assert.ok(metrics.groups[0]>=metrics.viewport-1,'Group fills visible strip')
    assert.ok(metrics.groups[0]<metrics.viewport+metrics.unit+1,'No oversized repeated layer')
    assert.ok(Math.abs(metrics.distance-metrics.groups[0])<1,'Loop travels exactly one group')
    assert.ok(Math.abs(metrics.distance/metrics.duration-140)<1,'Stable pixels/second for every label')
    const moving=await ticker.evaluate(async e=>{
     const animation=e.getAnimations()[0];animation.pause()
     const duration=animation.effect.getTiming().duration
     animation.currentTime=duration-10
     const before=new DOMMatrixReadOnly(getComputedStyle(e).transform).m41
     animation.currentTime=duration+10
     const after=new DOMMatrixReadOnly(getComputedStyle(e).transform).m41
     animation.play()
     return {before,after,distance:parseFloat(e.style.getPropertyValue('--marquee-distance'))}
    })
    assert.ok(Math.abs((moving.after-moving.before-moving.distance)+2.8)<1,'Continuous visual loop across boundary')
   }
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow')
  await page.screenshot({path:`/tmp/meister-marquee-${locale}-${width}.png`,fullPage:true})
 }
 await page.emulateMedia({reducedMotion:'reduce'})
 assert.ok(await page.locator('.marquee-track').evaluateAll(nodes=>nodes.every(e=>getComputedStyle(e).animationName==='none')),'Reduced motion disables decorative movement')
 assert.deepEqual(errors,[])
 console.log('PASS: four category tabs + footer; en/el at 390/1440; bounded layers, seamless loop, constant speed, external about link and reduced motion.')
}finally{await browser.close()}
