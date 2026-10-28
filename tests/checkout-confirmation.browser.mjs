import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { CART_UPDATED_EVENT } from '../lib/cart/client-events.ts'

// Reuses a previously paid TEST session. Creates no payment or WooCommerce order.
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3001'
const sessionId = process.env.PAID_TEST_SESSION_ID
assert.match(sessionId ?? '', /^cs_test_[A-Za-z0-9]+$/)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })
const contexts = []
const cleanup = []
async function newPage() {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
  contexts.push(context)
  const page = await context.newPage()
  await context.addCookies([{ name: 'mm_cart', value: Buffer.from(JSON.stringify([{ productId: '4869', quantity: 1, selectedOptions: { 'Νούμερο': '39-40' } }])).toString('base64url'), url: base, httpOnly: true }])
  await page.addInitScript(() => sessionStorage.setItem('mm_cart_count', '1'))
  return page
}
const confirmation = `${base}/checkout/confirmation?session_id=${encodeURIComponent(sessionId)}`
try {
  // An old count response must not overwrite a newer cart-updated response.
  const racePage = await newPage()
  let releaseOldCount, capturedInitialCount, heldRequest
  const oldCountGate = new Promise(resolve => { releaseOldCount = resolve })
  const initialCountCaptured = new Promise(resolve => { capturedInitialCount = resolve })
  cleanup.push(releaseOldCount)
  let firstCount = true
  await racePage.route('**/api/cart/count', async route => {
    if (!firstCount) return route.continue()
    firstCount = false
    heldRequest = route.request()
    const response = await route.fetch()
    assert.equal((await response.json()).count, 1)
    capturedInitialCount()
    await oldCountGate
    await route.fulfill({ response })
  })
  await racePage.route('**/api/orders/by-payment-intent?*', async route => { await initialCountCaptured; await route.continue() })
  await racePage.goto(confirmation, { waitUntil: 'domcontentloaded' })
  await racePage.getByRole('heading', { name: 'THANK YOU', exact: true }).waitFor()
  await racePage.evaluate(type => window.dispatchEvent(new CustomEvent(type)), CART_UPDATED_EVENT)
  await racePage.getByRole('link', { name: 'Shopping cart', exact: true }).waitFor()
  const lateResponse = racePage.waitForResponse(response => response.request() === heldRequest)
  releaseOldCount()
  await (await lateResponse).finished()
  await racePage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await racePage.evaluate(() => sessionStorage.getItem('mm_cart_count')), '0', 'The delayed pre-payment count must not overwrite the confirmed empty cart')
  await racePage.getByRole('link', { name: 'Shopping cart', exact: true }).waitFor({ timeout: 8000 })
  console.log('PASS late cart-count responses cannot restore the old badge or remembered count')

  // Confirmation itself must notify the header without a manual cart event.
  const page = await newPage()
  let releaseReceipt
  const receiptGate = new Promise(resolve => { releaseReceipt = resolve })
  cleanup.push(releaseReceipt)
  await page.route('**/api/orders/by-payment-intent?*', async route => { await receiptGate; await route.continue() })
  await page.goto(confirmation, { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: 'Shopping cart, 1 items', exact: true }).waitFor()
  releaseReceipt()
  await page.getByRole('heading', { name: 'THANK YOU', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Shopping cart', exact: true }).waitFor({ timeout: 8000 })
  const cart = await page.request.get(`${base}/api/cart`).then(response => response.json())
  assert.equal(cart.lines.length, 0)
  assert.equal(await page.evaluate(() => sessionStorage.getItem('mm_cart_count')), '0')
  console.log('PASS paid confirmation clears the server cart, header badge and remembered count without reloading')
} finally {
  cleanup.forEach(release => release())
  await Promise.all(contexts.map(context => context.close()))
  await browser.close()
}
