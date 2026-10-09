import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const baseURL = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const touch = await page.context().newCDPSession(page)
  async function swipe(gallery) {
    const box = await gallery.boundingBox()
    const y = box.y + box.height * 0.55
    const start = box.x + box.width * 0.85
    const end = box.x + box.width * 0.15
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] })
    for (let step = 1; step <= 8; step++) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start + (end - start) * step / 8, y }] })
      await page.waitForTimeout(25)
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await page.goto(`${baseURL}/shop`)
  const gallery = page.locator('[data-product-image-gallery="multiple"]').first()
  await gallery.waitFor({ timeout: 5000 })
  assert.ok(await gallery.locator('[data-image-dot]').count() > 1, 'Visible dots show multiple photos')
  assert.equal(await gallery.getByText(/swipe/i).count(), 0, 'No swipe instruction text')
  await gallery.scrollIntoViewIfNeeded()
  await swipe(gallery)
  await page.waitForFunction(() => Number(document.querySelector('[data-product-image-gallery="multiple"]').dataset.imageIndex) > 0)
  assert.ok(page.url().endsWith('/shop'), 'A swipe does not open the PDP')
  console.log('PASS: mobile image swipe changes photos, dots show position, and swiping does not navigate')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${baseURL}/shop`)
  await gallery.getByRole('button', { name: 'Next photo', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[data-product-image-gallery="multiple"]').dataset.imageIndex === '1')
  await gallery.focus()
  await page.keyboard.press('ArrowLeft')
  await page.waitForFunction(() => document.querySelector('[data-product-image-gallery="multiple"]').dataset.imageIndex === '0')
  await gallery.getByRole('link').first().click()
  await page.waitForURL('**/products/**')
  console.log('PASS: desktop photo controls, keyboard arrows, and photo links work')
  await page.goto(baseURL)
  await page.setViewportSize({ width: 390, height: 844 })
  const rail = page.getByRole('region', { name: 'Most wanted products' })
  const nested = rail.locator('[data-product-image-gallery="multiple"]').first()
  await nested.scrollIntoViewIfNeeded()
  const firstCard = rail.locator('article').first()
  const before = await firstCard.boundingBox()
  await swipe(nested)
  await page.waitForFunction(() => Number(document.querySelector('[aria-label="Most wanted products"] [data-product-image-gallery="multiple"]').dataset.imageIndex) > 0)
  const after = await firstCard.boundingBox()
  assert.ok(Math.abs(before.x - after.x) < 2, 'The surrounding product carousel stays in place')
  assert.equal(await page.locator('[data-product-image-gallery="single"]').getByRole('button', { name: 'Next photo' }).count(), 0)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  console.log('PASS: nested photo swipe does not move the product rail, single-photo cards have no controls')
} finally { await browser.close() }
