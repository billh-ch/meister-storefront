import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const baseURL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3001'
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  await page.goto(`${baseURL}/products/hood-3mm`)
  await page.getByRole('button', { name: 'Select options', exact: true }).waitFor()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.waitForFunction(() => {
    const options = document.querySelector('fieldset legend')?.parentElement
    if (!options) return false
    const rect = options.getBoundingClientRect()
    return rect.top >= 80 && rect.top < innerHeight - 120
  }, null, { timeout: 5000 })
  assert.equal(await page.getByRole('button', { name: 'S', exact: true }).evaluate(el => el === document.activeElement), true)
  await page.getByRole('button', { name: 'S', exact: true }).click()
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Your cart' })
  await drawer.waitFor()
  const cart = await page.evaluate(async () => (await fetch('/api/cart')).json())
  assert.equal(cart.lines[0].attributes.Options, 'S')
  assert.ok(cart.lines[0].variationId)
  console.log('PASS: mobile Options scrolls and focuses the selector, then adds the chosen variant')
} finally {
  await browser.close()
}
